"""HubspotSyncService — mirror HubSpot CRM into our DB.

**Scope:** Turn HubSpot CRM v3 responses (from webhooks **or** a polling
backfill) into rows in ``hubspot_deals``, ``hubspot_line_items``,
``hubspot_quotes``, ``hubspot_products``, ``hubspot_companies``,
``hubspot_associations``, and ``hubspot_files``. Then hand the updated
deal to :class:`app.services.hubspot_contract_bridge.HubspotContractBridgeService`
so the canonical ``Contract`` + ``PerformanceObligation``s stay in sync.

**Contract:**
    * Accepts tenant + HubSpot client from the caller — never
      imports ``settings``.
    * Returns ``True`` when a row was upserted, ``False`` otherwise
      (event ignored or not routable).
    * Never commits — the caller owns the transaction boundary.
    * Idempotent by ``(organization_id, hubspot_id)`` per resource.

**Flow (webhook):**
    1. Verify signature (done upstream, in the webhook route).
    2. Parse batch → iterate events.
    3. Look up the ``HubspotConnection`` by ``portalId`` → resolve org.
    4. For each event, fetch the current object via the HubSpot SDK
       (webhook payloads only carry the object id + a change flag).
    5. Upsert the mirror row.
    6. If the object is a ``deal`` (or a ``line_item`` whose associated
       deal we mirror), hand it to the contract bridge to keep the
       canonical ``Contract`` current.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.hubspot.api.client import HubspotClient, HubspotError
from packages.hubspot.models.common import (
    HubspotCompany as HubspotCompanyDTO,
    HubspotDeal as HubspotDealDTO,
    HubspotLineItem as HubspotLineItemDTO,
    HubspotProduct as HubspotProductDTO,
    HubspotQuote as HubspotQuoteDTO,
    HubspotWebhookEvent,
)

from app.db.models.hubspot import (
    HubspotAssociation,
    HubspotCompany,
    HubspotConnection,
    HubspotDeal,
    HubspotLineItem,
    HubspotProduct,
    HubspotQuote,
)
from app.db.models._utils import utcnow

logger = logging.getLogger(__name__)


class HubspotSyncService:
    """Mirror HubSpot CRM rows scoped to one ``HubspotConnection``."""

    def __init__(
        self,
        db: AsyncSession,
        *,
        connection: HubspotConnection,
        client: HubspotClient,
    ) -> None:
        self._db = db
        self._conn = connection
        self._client = client

    # ------------------------------------------------------------------
    # Connection resolution helpers (called by the webhook route)
    # ------------------------------------------------------------------

    @staticmethod
    async def resolve_connection_by_portal(
        db: AsyncSession, *, portal_id: int
    ) -> HubspotConnection | None:
        """Find the active HubSpot connection for a given portal id."""
        return await db.scalar(
            select(HubspotConnection).where(
                HubspotConnection.hub_id == portal_id,
                HubspotConnection.disconnected_at.is_(None),
            )
        )

    # ------------------------------------------------------------------
    # Webhook dispatch
    # ------------------------------------------------------------------

    async def handle_event(self, event: HubspotWebhookEvent) -> bool:
        """Dispatch a single webhook event → mirror + bridge call.

        Returns ``True`` when the event produced a row change (upsert
        or tombstone). ``False`` is used for "ignored" — unroutable
        subscription types, missing tokens, or HubSpot already-deleted.
        """
        if event.object_id is None:
            return False

        object_type = event.object_type
        action = event.action
        object_id = str(event.object_id)

        if action == "deletion":
            await self._soft_delete(object_type, object_id)
            return True

        try:
            updated = await self._fetch_and_upsert(object_type, object_id)
        except HubspotError as exc:
            if exc.status == 404:
                await self._soft_delete(object_type, object_id)
                return True
            logger.warning(
                "HubSpot fetch failed org=%s type=%s id=%s: %s",
                self._conn.organization_id,
                object_type,
                object_id,
                exc,
            )
            return False

        self._conn.last_webhook_at = utcnow()
        # Opportunistically refresh the canonical Contract whenever a
        # deal or line item changes. Errors are logged and swallowed —
        # failing to bridge must not reject the webhook.
        try:
            await self._maybe_bridge_contract(object_type, object_id)
        except Exception as exc:  # pragma: no cover — defensive
            logger.warning(
                "HubspotContractBridge failed org=%s type=%s id=%s: %s",
                self._conn.organization_id,
                object_type,
                object_id,
                exc,
            )
        return updated

    async def _maybe_bridge_contract(
        self, object_type: str, object_id: str
    ) -> None:
        """Route a deal/line_item change to the contract bridge.

        For ``deal`` events we use the object id directly. For
        ``line_item`` events we resolve the parent deal via the
        denormalised FK we just wrote.
        """
        from app.services.hubspot_contract_bridge import (
            HubspotContractBridgeService,
        )

        if object_type == "deal":
            deal_id = object_id
        elif object_type == "line_item":
            line = await self._db.scalar(
                select(HubspotLineItem).where(
                    HubspotLineItem.organization_id == self._conn.organization_id,
                    HubspotLineItem.hubspot_id == object_id,
                )
            )
            if line is None or not line.deal_hubspot_id:
                return
            deal_id = line.deal_hubspot_id
        else:
            return

        bridge = HubspotContractBridgeService(self._db)
        await bridge.upsert_from_deal_id(
            organization_id=self._conn.organization_id,
            hubspot_deal_id=deal_id,
        )

    # ------------------------------------------------------------------
    # Polling backfill (admin-triggered)
    # ------------------------------------------------------------------

    async def backfill_deals(
        self, *, limit_per_page: int = 100, max_pages: int = 50
    ) -> int:
        """Bulk pull deals + their line items / companies / quotes.

        Returns the number of deals upserted. Intended for the initial
        sync or a manual recovery after a dropped webhook delivery.
        """
        upserted = 0
        after: str | None = None
        for _ in range(max_pages):
            page = await self._client.list_deals(
                access_token=await self._access_token(),
                limit=limit_per_page,
                after=after,
                associations=["line_items", "companies", "quotes"],
            )
            for deal in page.results:
                await self._upsert_deal(deal)
                upserted += 1
                for line_id in self._assoc_ids(deal, "line_items"):
                    try:
                        item = await self._client.get_line_item(
                            line_id, access_token=await self._access_token()
                        )
                        await self._upsert_line_item(item)
                    except HubspotError as exc:
                        logger.debug("Line item fetch failed %s: %s", line_id, exc)
                for comp_id in self._assoc_ids(deal, "companies"):
                    try:
                        comp = await self._client.get_company(
                            comp_id, access_token=await self._access_token()
                        )
                        await self._upsert_company(comp)
                    except HubspotError as exc:
                        logger.debug("Company fetch failed %s: %s", comp_id, exc)
                for quote_id in self._assoc_ids(deal, "quotes"):
                    try:
                        quote = await self._client.get_quote(
                            quote_id, access_token=await self._access_token()
                        )
                        await self._upsert_quote(quote)
                    except HubspotError as exc:
                        logger.debug("Quote fetch failed %s: %s", quote_id, exc)
            next_page = (page.paging or {}).get("next", {}).get("after")
            if not next_page:
                break
            after = next_page
        self._conn.last_sync_at = utcnow()
        return upserted

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    async def _access_token(self) -> str:
        """Decrypt the stored access token.

        Token refresh (when ``access_token_expires_at`` is past) is
        handled by :class:`HubspotTokenRefresher` in a separate commit
        — this service assumes a valid token is present.
        """
        from app.core.security.field_encryption import decrypt_secret

        return decrypt_secret(self._conn.access_token_encrypted)

    async def _fetch_and_upsert(self, object_type: str, object_id: str) -> bool:
        token = await self._access_token()
        if object_type == "deal":
            deal = await self._client.get_deal(
                object_id,
                access_token=token,
                associations=["line_items", "companies", "quotes"],
            )
            await self._upsert_deal(deal)
            return True
        if object_type == "line_item":
            item = await self._client.get_line_item(object_id, access_token=token)
            await self._upsert_line_item(item)
            return True
        if object_type == "quote":
            quote = await self._client.get_quote(object_id, access_token=token)
            await self._upsert_quote(quote)
            return True
        if object_type == "product":
            product = await self._client.get_product(object_id, access_token=token)
            await self._upsert_product(product)
            return True
        if object_type == "company":
            company = await self._client.get_company(object_id, access_token=token)
            await self._upsert_company(company)
            return True
        logger.debug("HubSpot event ignored — unsupported type %s", object_type)
        return False

    async def _soft_delete(self, object_type: str, hubspot_id: str) -> None:
        model_map = {
            "deal": HubspotDeal,
            "line_item": HubspotLineItem,
            "quote": HubspotQuote,
            "product": HubspotProduct,
            "company": HubspotCompany,
        }
        model = model_map.get(object_type)
        if model is None:
            return
        row = await self._db.scalar(
            select(model).where(
                model.organization_id == self._conn.organization_id,
                model.hubspot_id == hubspot_id,
            )
        )
        if row is not None:
            row.deleted_at = utcnow()
            row.archived = True

    # --- Upserts ---------------------------------------------------------

    async def _upsert_deal(self, dto: HubspotDealDTO) -> HubspotDeal:
        row = await self._get_row(HubspotDeal, dto.id)
        props = dto.properties or {}
        primary_company = self._first_assoc(dto, "companies")
        payload = {
            "properties": props,
            "raw_object": dto.model_dump(mode="json"),
            "hubspot_created_at": dto.created_at,
            "hubspot_updated_at": dto.updated_at,
            "archived": bool(dto.archived),
            "deleted_at": None,
            "name": _s(props.get("dealname"), 512),
            "amount": _dec(props.get("amount")),
            "currency": _currency(props.get("hs_currency_code")),
            "pipeline": _s(props.get("pipeline"), 64),
            "stage": _s(props.get("dealstage"), 64),
            "is_closed": _bool(props.get("hs_is_closed")),
            "is_closed_won": _bool(props.get("hs_is_closed_won")),
            "close_date": _dt(props.get("closedate")),
            "mrr": _dec(props.get("hs_mrr")),
            "arr": _dec(props.get("hs_arr")),
            "tcv": _dec(props.get("hs_tcv")),
            "acv": _dec(props.get("hs_acv")),
            "owner_id": _s(props.get("hubspot_owner_id"), 64),
            "primary_company_hubspot_id": primary_company,
        }
        row = await self._upsert(HubspotDeal, dto.id, row, payload)

        # Materialise associations (deal → companies / line_items / quotes).
        for atype in ("companies", "line_items", "quotes"):
            self._replace_associations_for(dto, "deal", atype)
        return row

    async def _upsert_line_item(self, dto: HubspotLineItemDTO) -> HubspotLineItem:
        row = await self._get_row(HubspotLineItem, dto.id)
        props = dto.properties or {}

        deal_id = self._first_assoc(dto, "deals")
        quote_id = self._first_assoc(dto, "quotes")
        # When the event payload comes without associations we fall back
        # to the v4 endpoint so line items always carry a deal handle.
        if deal_id is None:
            try:
                deal_id = await self._lookup_parent(
                    from_type="line_items",
                    from_id=dto.id,
                    to_type="deals",
                )
            except HubspotError:  # pragma: no cover — best-effort
                deal_id = None

        payload = {
            "properties": props,
            "raw_object": dto.model_dump(mode="json"),
            "hubspot_created_at": dto.created_at,
            "hubspot_updated_at": dto.updated_at,
            "archived": bool(dto.archived),
            "deleted_at": None,
            "name": _s(props.get("name"), 512),
            "description": props.get("description"),
            "sku": _s(props.get("hs_sku"), 128),
            "product_hubspot_id": _s(props.get("hs_product_id"), 64),
            "quantity": _dec(props.get("quantity")),
            "price": _dec(props.get("price")),
            "amount": _dec(props.get("amount")),
            "total_discount": _dec(props.get("hs_total_discount")),
            "currency": _currency(props.get("hs_line_item_currency_code")),
            "term_months": _int(props.get("hs_term_in_months")),
            "recurring_billing_period": _s(
                props.get("hs_recurring_billing_period"), 32
            ),
            "recurring_billing_frequency": _s(
                props.get("recurringbillingfrequency"), 32
            ),
            "recurring_billing_start_date": _dt(
                props.get("hs_recurring_billing_start_date")
            ),
            "recurring_billing_end_date": _dt(
                props.get("hs_recurring_billing_end_date")
            ),
            "billing_period": _s(props.get("hs_billing_period"), 32),
            "deal_hubspot_id": deal_id,
            "quote_hubspot_id": quote_id,
        }
        return await self._upsert(HubspotLineItem, dto.id, row, payload)

    async def _upsert_quote(self, dto: HubspotQuoteDTO) -> HubspotQuote:
        row = await self._get_row(HubspotQuote, dto.id)
        props = dto.properties or {}
        payload = {
            "properties": props,
            "raw_object": dto.model_dump(mode="json"),
            "hubspot_created_at": dto.created_at,
            "hubspot_updated_at": dto.updated_at,
            "archived": bool(dto.archived),
            "deleted_at": None,
            "title": _s(props.get("hs_title"), 512),
            "status": _s(props.get("hs_status"), 64),
            "expiration_date": _dt(props.get("hs_expiration_date")),
            "currency": _currency(props.get("hs_currency")),
            "amount": _dec(props.get("hs_quote_amount")),
            "esign_status": _s(props.get("hs_esign_status"), 64),
            "public_url_key": _s(props.get("hs_public_url_key"), 128),
            "pdf_download_link": props.get("hs_pdf_download_link"),
            "deal_hubspot_id": self._first_assoc(dto, "deals"),
        }
        return await self._upsert(HubspotQuote, dto.id, row, payload)

    async def _upsert_product(self, dto: HubspotProductDTO) -> HubspotProduct:
        row = await self._get_row(HubspotProduct, dto.id)
        props = dto.properties or {}
        payload = {
            "properties": props,
            "raw_object": dto.model_dump(mode="json"),
            "hubspot_created_at": dto.created_at,
            "hubspot_updated_at": dto.updated_at,
            "archived": bool(dto.archived),
            "deleted_at": None,
            "name": _s(props.get("name"), 512),
            "sku": _s(props.get("hs_sku"), 128),
            "description": props.get("description"),
            "price": _dec(props.get("price")),
            "recurring_billing_period": _s(
                props.get("hs_recurring_billing_period"), 32
            ),
            "recurring_billing_frequency": _s(
                props.get("recurringbillingfrequency"), 32
            ),
        }
        return await self._upsert(HubspotProduct, dto.id, row, payload)

    async def _upsert_company(self, dto: HubspotCompanyDTO) -> HubspotCompany:
        row = await self._get_row(HubspotCompany, dto.id)
        props = dto.properties or {}
        payload = {
            "properties": props,
            "raw_object": dto.model_dump(mode="json"),
            "hubspot_created_at": dto.created_at,
            "hubspot_updated_at": dto.updated_at,
            "archived": bool(dto.archived),
            "deleted_at": None,
            "name": _s(props.get("name"), 512),
            "domain": _s(props.get("domain"), 255),
            "country": _s(props.get("country"), 128),
            "industry": _s(props.get("industry"), 128),
            "vat_id": _s(props.get("vat_id"), 64),
            "annual_revenue": _dec(props.get("annualrevenue")),
            "number_of_employees": _int(props.get("numberofemployees")),
            "owner_id": _s(props.get("hubspot_owner_id"), 64),
            "lifecycle_stage": _s(props.get("lifecyclestage"), 64),
        }
        company = await self._upsert(HubspotCompany, dto.id, row, payload)
        # Resolve/bootstrap the unified Counterparty so downstream
        # readers (contract bridge, dashboards, agents) can treat the
        # company as a first-class business entity immediately.
        try:
            from app.services.customer_bootstrapper_service import (
                CustomerBootstrapperService,
            )

            await CustomerBootstrapperService(self._db).from_hubspot_company(
                company
            )
        except Exception as exc:  # pragma: no cover — defensive
            logger.warning(
                "CustomerBootstrapperService failed org=%s hs_company=%s: %s",
                self._conn.organization_id,
                dto.id,
                exc,
            )
        return company

    # --- Shared writer path ---------------------------------------------

    async def _get_row(self, model: type, hubspot_id: str) -> Any:
        return await self._db.scalar(
            select(model).where(
                model.organization_id == self._conn.organization_id,
                model.hubspot_id == hubspot_id,
            )
        )

    async def _upsert(
        self, model: type, hubspot_id: str, existing: Any, payload: dict[str, Any]
    ) -> Any:
        if existing is None:
            row = model(
                organization_id=self._conn.organization_id,
                hub_id=self._conn.hub_id,
                hubspot_id=hubspot_id,
                **payload,
            )
            self._db.add(row)
            return row
        for key, value in payload.items():
            setattr(existing, key, value)
        return existing

    # --- Associations ---------------------------------------------------

    def _first_assoc(self, dto: Any, to_type: str) -> str | None:
        group = (dto.associations or {}).get(to_type)
        if group is None:
            return None
        if not group.results:
            return None
        return str(group.results[0].id)

    def _assoc_ids(self, dto: Any, to_type: str) -> list[str]:
        group = (dto.associations or {}).get(to_type)
        if group is None:
            return []
        return [str(r.id) for r in group.results]

    def _replace_associations_for(
        self, dto: Any, from_type: str, to_type: str
    ) -> None:
        """Rewrite the ``HubspotAssociation`` rows for one (from, to) pair.

        Fire-and-forget inside the same SQLAlchemy session — the caller
        commits. We don't expose a DB-side DELETE here; instead we
        upsert each materialised association by its composite key
        (the ``uq_hubspot_assoc`` constraint makes duplicates no-ops).
        """
        for target_id in self._assoc_ids(dto, to_type):
            assoc = HubspotAssociation(
                organization_id=self._conn.organization_id,
                from_object_type=from_type,
                from_hubspot_id=dto.id,
                to_object_type=_singular(to_type),
                to_hubspot_id=target_id,
            )
            self._db.add(assoc)

    async def _lookup_parent(
        self, *, from_type: str, from_id: str, to_type: str
    ) -> str | None:
        token = await self._access_token()
        rows = await self._client.list_associations(
            from_object_type=from_type,
            from_object_id=from_id,
            to_object_type=to_type,
            access_token=token,
            limit=1,
        )
        if not rows:
            return None
        return str(rows[0].get("toObjectId"))


# ---------------------------------------------------------------------------
# Helpers (pure)
# ---------------------------------------------------------------------------


def _singular(t: str) -> str:
    return {
        "deals": "deal",
        "line_items": "line_item",
        "quotes": "quote",
        "products": "product",
        "companies": "company",
    }.get(t, t)


def _s(value: Any, max_len: int) -> str | None:
    if value is None:
        return None
    s = str(value)
    return s[:max_len] if s else None


def _dec(value: Any) -> Decimal | None:
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def _bool(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    s = str(value).lower()
    if s in ("true", "1", "yes"):
        return True
    if s in ("false", "0", "no"):
        return False
    return None


def _currency(value: Any) -> str | None:
    if value is None:
        return None
    s = str(value).strip().upper()
    return s[:3] if s else None


def _dt(value: Any) -> datetime | None:
    """Parse HubSpot's property timestamps (epoch ms string or ISO-8601)."""
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    s = str(value)
    # Epoch ms — HubSpot's common property serialization.
    try:
        ms = int(s)
        return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc)
    except ValueError:
        pass
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None
