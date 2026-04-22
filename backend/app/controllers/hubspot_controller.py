"""HubspotController — orchestration for HubSpot connect + sync + read endpoints.

**Scope:** Maps :class:`HubspotConnectService`, :class:`HubspotSyncService`,
and read queries on the HubSpot mirror tables into API responses.
Webhook verification runs inside the controller so the route stays a
thin declaration, matching the pattern in
:mod:`app.controllers.stripe_webhook_controller`.

**Contract:** Accepts primitive inputs. Returns dict/list payloads
(FastAPI serializes them). Raises :class:`fastapi.HTTPException` only
for errors that do not subclass :class:`app.core.exceptions.AppError`
(the global handler converts ``AppError`` automatically).
"""

from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlencode

from fastapi import HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.hubspot.api.webhooks import (
    HubspotSignatureError,
    parse_webhook_event,
    verify_webhook_signature,
)

from app.config import settings
from app.db.models.hubspot import (
    HubspotCompany,
    HubspotConnection,
    HubspotDeal,
    HubspotLineItem,
    HubspotProduct,
    HubspotQuote,
)
from app.services.hubspot_connect_service import HubspotConnectService
from app.services.hubspot_sync_service import HubspotSyncService

logger = logging.getLogger(__name__)


def _safe_frontend_base() -> str:
    base = (settings.FRONTEND_BASE_URL or "").rstrip("/")
    return base or ""


class HubspotController:
    """Controller covering HubSpot OAuth, webhooks, and read endpoints."""

    def __init__(
        self, db: AsyncSession, connect_service: HubspotConnectService
    ) -> None:
        self._db = db
        self._connect = connect_service

    # ------------------------------------------------------------------
    # OAuth
    # ------------------------------------------------------------------

    async def start_oauth(
        self, *, user_id: str, organization_id: str
    ) -> dict[str, str]:
        return {
            "authorization_url": self._connect.build_authorization_url(
                user_id=user_id, organization_id=organization_id
            )
        }

    async def oauth_callback(self, *, code: str, state: str) -> RedirectResponse:
        base = _safe_frontend_base()
        try:
            conn = await self._connect.complete_oauth(code=code, state=state)
        except Exception as exc:
            logger.exception("HubSpot OAuth callback failed")
            target = (
                f"{base}/settings/integrations/hubspot?"
                + urlencode({"status": "error", "reason": str(exc)[:256]})
                if base
                else "/"
            )
            return RedirectResponse(url=target, status_code=302)
        target = (
            f"{base}/settings/integrations/hubspot?"
            + urlencode(
                {
                    "status": "connected",
                    "hub_id": str(conn.hub_id),
                    "hub_domain": conn.hub_domain or "",
                }
            )
            if base
            else "/"
        )
        return RedirectResponse(url=target, status_code=302)

    async def list_connections(
        self, *, organization_id: str
    ) -> list[dict[str, Any]]:
        rows = await self._connect.list_for_org(organization_id=organization_id)
        return [
            {
                "id": r.id,
                "hub_id": r.hub_id,
                "hub_domain": r.hub_domain,
                "scopes": r.scopes,
                "connected_at": r.connected_at.isoformat() if r.connected_at else None,
                "disconnected_at": (
                    r.disconnected_at.isoformat() if r.disconnected_at else None
                ),
                "last_sync_at": (
                    r.last_sync_at.isoformat() if r.last_sync_at else None
                ),
                "last_webhook_at": (
                    r.last_webhook_at.isoformat() if r.last_webhook_at else None
                ),
            }
            for r in rows
        ]

    async def disconnect(
        self, *, organization_id: str, hub_id: int
    ) -> dict[str, Any]:
        row = await self._connect.disconnect(
            organization_id=organization_id, hub_id=hub_id
        )
        return {
            "hub_id": row.hub_id,
            "disconnected_at": (
                row.disconnected_at.isoformat() if row.disconnected_at else ""
            ),
        }

    # ------------------------------------------------------------------
    # Webhook
    # ------------------------------------------------------------------

    async def handle_webhook(
        self,
        *,
        raw_body: bytes,
        method: str,
        request_url: str,
        signature_header: str | None,
        timestamp_header: str | None,
    ) -> dict[str, Any]:
        try:
            verify_webhook_signature(
                app_secret=settings.HUBSPOT_CLIENT_SECRET,
                method=method,
                request_url=request_url,
                raw_body=raw_body,
                signature_header=signature_header,
                timestamp_header=timestamp_header,
            )
        except HubspotSignatureError as exc:
            logger.warning("HubSpot signature verification failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid HubSpot signature.",
            )

        events = list(parse_webhook_event(raw_body))
        if not events:
            return {"processed": 0}

        # Group by portal — one HubSpot delivery is always single-portal,
        # but defensive grouping lets us route correctly if HubSpot ever
        # batches across portals.
        processed = 0
        by_portal: dict[int, list] = {}
        for event in events:
            by_portal.setdefault(event.portal_id, []).append(event)

        for portal_id, portal_events in by_portal.items():
            conn = await HubspotSyncService.resolve_connection_by_portal(
                self._db, portal_id=portal_id
            )
            if conn is None:
                logger.info(
                    "Ignoring HubSpot events for unlinked portal %s (%d events)",
                    portal_id,
                    len(portal_events),
                )
                continue
            try:
                client = self._connect.build_tenant_client(conn)
            except Exception as exc:
                logger.warning("Failed to build HubSpot tenant client: %s", exc)
                continue
            sync = HubspotSyncService(self._db, connection=conn, client=client)
            for event in portal_events:
                try:
                    if await sync.handle_event(event):
                        processed += 1
                except Exception as exc:
                    logger.exception(
                        "HubSpot webhook event processing failed: %s", exc
                    )

        await self._db.commit()
        return {"processed": processed, "received": len(events)}

    # ------------------------------------------------------------------
    # Read endpoints (agents + frontend)
    # ------------------------------------------------------------------

    async def list_deals(
        self, *, organization_id: str, limit: int = 50, offset: int = 0
    ) -> list[dict[str, Any]]:
        rows = (
            await self._db.scalars(
                select(HubspotDeal)
                .where(
                    HubspotDeal.organization_id == organization_id,
                    HubspotDeal.deleted_at.is_(None),
                )
                .order_by(HubspotDeal.hubspot_updated_at.desc().nullslast())
                .limit(min(limit, 200))
                .offset(max(offset, 0))
            )
        ).all()
        return [_serialise_deal(r) for r in rows]

    async def get_deal(
        self, *, organization_id: str, hubspot_id: str
    ) -> dict[str, Any]:
        row = await self._db.scalar(
            select(HubspotDeal).where(
                HubspotDeal.organization_id == organization_id,
                HubspotDeal.hubspot_id == hubspot_id,
            )
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HubSpot deal not found.",
            )
        return _serialise_deal(row, include_raw=True)

    async def list_line_items_for_deal(
        self, *, organization_id: str, hubspot_deal_id: str
    ) -> list[dict[str, Any]]:
        rows = (
            await self._db.scalars(
                select(HubspotLineItem).where(
                    HubspotLineItem.organization_id == organization_id,
                    HubspotLineItem.deal_hubspot_id == hubspot_deal_id,
                    HubspotLineItem.deleted_at.is_(None),
                )
            )
        ).all()
        return [_serialise_line_item(r) for r in rows]

    async def list_quotes(
        self, *, organization_id: str, limit: int = 50, offset: int = 0
    ) -> list[dict[str, Any]]:
        rows = (
            await self._db.scalars(
                select(HubspotQuote)
                .where(
                    HubspotQuote.organization_id == organization_id,
                    HubspotQuote.deleted_at.is_(None),
                )
                .order_by(HubspotQuote.hubspot_updated_at.desc().nullslast())
                .limit(min(limit, 200))
                .offset(max(offset, 0))
            )
        ).all()
        return [_serialise_quote(r) for r in rows]

    async def list_products(
        self, *, organization_id: str, limit: int = 100, offset: int = 0
    ) -> list[dict[str, Any]]:
        rows = (
            await self._db.scalars(
                select(HubspotProduct)
                .where(
                    HubspotProduct.organization_id == organization_id,
                    HubspotProduct.deleted_at.is_(None),
                )
                .order_by(HubspotProduct.name)
                .limit(min(limit, 500))
                .offset(max(offset, 0))
            )
        ).all()
        return [_serialise_product(r) for r in rows]

    async def list_companies(
        self, *, organization_id: str, limit: int = 50, offset: int = 0
    ) -> list[dict[str, Any]]:
        rows = (
            await self._db.scalars(
                select(HubspotCompany)
                .where(
                    HubspotCompany.organization_id == organization_id,
                    HubspotCompany.deleted_at.is_(None),
                )
                .order_by(HubspotCompany.hubspot_updated_at.desc().nullslast())
                .limit(min(limit, 200))
                .offset(max(offset, 0))
            )
        ).all()
        return [_serialise_company(r) for r in rows]

    async def trigger_backfill(
        self, *, organization_id: str, hub_id: int
    ) -> dict[str, Any]:
        conn = await self._db.scalar(
            select(HubspotConnection).where(
                HubspotConnection.organization_id == organization_id,
                HubspotConnection.hub_id == hub_id,
                HubspotConnection.disconnected_at.is_(None),
            )
        )
        if conn is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="HubSpot connection not found.",
            )
        try:
            client = self._connect.build_tenant_client(conn)
        except Exception as exc:
            logger.warning("Building HubSpot tenant client failed: %s", exc)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to decrypt HubSpot token.",
            )
        sync = HubspotSyncService(self._db, connection=conn, client=client)
        upserted = await sync.backfill_deals()
        await self._db.commit()
        return {"upserted_deals": upserted}


# ---------------------------------------------------------------------------
# Serializers (response DTOs)
# ---------------------------------------------------------------------------


def _iso(dt: Any) -> str | None:
    return dt.isoformat() if dt else None


def _dec_str(value: Any) -> str | None:
    return str(value) if value is not None else None


def _serialise_deal(row: HubspotDeal, *, include_raw: bool = False) -> dict[str, Any]:
    out: dict[str, Any] = {
        "hubspot_id": row.hubspot_id,
        "name": row.name,
        "amount": _dec_str(row.amount),
        "currency": row.currency,
        "pipeline": row.pipeline,
        "stage": row.stage,
        "is_closed": row.is_closed,
        "is_closed_won": row.is_closed_won,
        "close_date": _iso(row.close_date),
        "mrr": _dec_str(row.mrr),
        "arr": _dec_str(row.arr),
        "tcv": _dec_str(row.tcv),
        "acv": _dec_str(row.acv),
        "owner_id": row.owner_id,
        "primary_company_hubspot_id": row.primary_company_hubspot_id,
        "updated_at": _iso(row.hubspot_updated_at),
    }
    if include_raw:
        out["properties"] = row.properties
    return out


def _serialise_line_item(row: HubspotLineItem) -> dict[str, Any]:
    return {
        "hubspot_id": row.hubspot_id,
        "name": row.name,
        "sku": row.sku,
        "product_hubspot_id": row.product_hubspot_id,
        "quantity": _dec_str(row.quantity),
        "price": _dec_str(row.price),
        "amount": _dec_str(row.amount),
        "total_discount": _dec_str(row.total_discount),
        "currency": row.currency,
        "term_months": row.term_months,
        "recurring_billing_period": row.recurring_billing_period,
        "recurring_billing_frequency": row.recurring_billing_frequency,
        "recurring_billing_start_date": _iso(row.recurring_billing_start_date),
        "recurring_billing_end_date": _iso(row.recurring_billing_end_date),
        "deal_hubspot_id": row.deal_hubspot_id,
        "quote_hubspot_id": row.quote_hubspot_id,
    }


def _serialise_quote(row: HubspotQuote) -> dict[str, Any]:
    return {
        "hubspot_id": row.hubspot_id,
        "title": row.title,
        "status": row.status,
        "expiration_date": _iso(row.expiration_date),
        "currency": row.currency,
        "amount": _dec_str(row.amount),
        "esign_status": row.esign_status,
        "public_url_key": row.public_url_key,
        "pdf_download_link": row.pdf_download_link,
        "deal_hubspot_id": row.deal_hubspot_id,
    }


def _serialise_product(row: HubspotProduct) -> dict[str, Any]:
    return {
        "hubspot_id": row.hubspot_id,
        "name": row.name,
        "sku": row.sku,
        "description": row.description,
        "price": _dec_str(row.price),
        "recurring_billing_period": row.recurring_billing_period,
        "recurring_billing_frequency": row.recurring_billing_frequency,
    }


def _serialise_company(row: HubspotCompany) -> dict[str, Any]:
    return {
        "hubspot_id": row.hubspot_id,
        "name": row.name,
        "domain": row.domain,
        "country": row.country,
        "industry": row.industry,
        "vat_id": row.vat_id,
        "annual_revenue": _dec_str(row.annual_revenue),
        "number_of_employees": row.number_of_employees,
        "owner_id": row.owner_id,
        "lifecycle_stage": row.lifecycle_stage,
        "counterparty_id": row.counterparty_id,
    }
