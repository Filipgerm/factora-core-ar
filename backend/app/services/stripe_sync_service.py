"""StripeSyncService — mirror Stripe API objects into org-scoped SQL rows.

**Scope:** Upsert from webhook or pull-sync; resolve tenant via ``metadata.organization_id``.

**Contract:** Raises ``ValidationError`` when pull sync is invoked without a JWT organization;
raises ``StripeError`` when API keys are missing. Commits on pull/sync endpoints after work.

**Flow:**
1. Resolve ``organization_id`` (JWT for pull; metadata for webhooks; charge/PI for balance txs).
2. Upsert by ``(organization_id, stripe_id)`` or insert balance snapshot rows.
3. ``await commit()`` for transactional persistence.

**Architectural notes:** Stripe SDK calls use ``asyncio.to_thread`` to avoid blocking the loop.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.stripe_client import stripe_object_to_dict
from app.config import Settings, settings
from app.core.exceptions import StripeError, ValidationError
from app.db.models._utils import utcnow
from app.db.models.stripe_billing import (
    StripeBalanceSnapshot,
    StripeBalanceTransaction,
    StripeCreditNote,
    StripeCustomer,
    StripeDispute,
    StripeInvoice,
    StripeInvoiceLineItem,
    StripePaymentIntent,
    StripePayout,
    StripePrice,
    StripeProduct,
    StripeRefund,
    StripeSubscription,
    StripeTaxRate,
)
from app.models.stripe_billing import (
    StripeBalanceSnapshotResponse,
    StripeBalanceTransactionResponse,
    StripeCustomerResponse,
    StripeInvoiceResponse,
    StripeSyncStatsResponse,
)

logger = logging.getLogger(__name__)

ORG_META = "organization_id"


def _ts(sec: int | float | None) -> datetime | None:
    if sec is None:
        return None
    return datetime.fromtimestamp(int(sec), tz=timezone.utc)


def metadata_org(obj: dict[str, Any]) -> str | None:
    md = obj.get("metadata")
    if not isinstance(md, dict):
        return None
    v = md.get(ORG_META)
    if isinstance(v, str) and v.strip():
        return v.strip()
    return None


def _as_dict(obj: Any) -> dict[str, Any]:
    return obj if isinstance(obj, dict) else stripe_object_to_dict(obj)


def _source_id(src: Any) -> str | None:
    if isinstance(src, dict):
        return src.get("id") if isinstance(src.get("id"), str) else None
    if isinstance(src, str):
        return src
    return None


class StripeSyncService:
    def __init__(
        self,
        db: AsyncSession,
        organization_id: str | None,
        app_settings: Settings | None = None,
    ) -> None:
        self._db = db
        self._organization_id = organization_id
        self._settings = app_settings or settings

    def _require_org_for_pull(self) -> str:
        if not self._organization_id:
            raise ValidationError(
                "Organization required for pull sync",
                code="stripe.org_required",
            )
        return self._organization_id

    def _require_stripe(self) -> None:
        if not self._settings.STRIPE_SECRET_KEY:
            raise StripeError("Stripe is not configured", code="external.stripe.unconfigured")

    def _resolve_org(self, obj: dict[str, Any]) -> str | None:
        mo = metadata_org(obj)
        if self._organization_id:
            if mo == self._organization_id:
                return self._organization_id
            return None
        return mo

    async def _resolve_org_balance_tx(self, obj: dict[str, Any]) -> str | None:
        mo = metadata_org(obj)
        if self._organization_id:
            if mo == self._organization_id:
                return self._organization_id
            src = _source_id(obj.get("source"))
            if src and src.startswith("ch_"):
                org = await self._org_from_charge_id(src)
                if org == self._organization_id:
                    return self._organization_id
            return None
        if mo:
            return mo
        src = _source_id(obj.get("source"))
        if src and src.startswith("ch_"):
            return await self._org_from_charge_id(src)
        return None

    async def _org_from_charge_id(self, charge_id: str) -> str | None:
        try:
            ch = await asyncio.to_thread(
                lambda: stripe.Charge.retrieve(charge_id, expand=["payment_intent"]),
            )
        except Exception as exc:
            logger.debug("stripe charge retrieve failed: %s", exc)
            return None
        d = stripe_object_to_dict(ch)
        o = metadata_org(d)
        if o:
            return o
        pi = d.get("payment_intent")
        if isinstance(pi, dict):
            return metadata_org(pi)
        return None

    async def _load_row(self, model: type, org: str, sid: str) -> Any:
        r = await self._db.execute(
            select(model).where(model.organization_id == org, model.stripe_id == sid)
        )
        return r.scalar_one_or_none()

    # --- Upsert helpers -------------------------------------------------

    async def apply_balance_transaction(self, obj: Any) -> bool:
        d = _as_dict(obj)
        org = await self._resolve_org_balance_tx(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeBalanceTransaction, org, sid)
        vals = {
            "amount": int(d.get("amount", 0)),
            "currency": str(d.get("currency") or "eur").lower()[:3],
            "description": d.get("description"),
            "fee": int(d.get("fee") or 0),
            "net": int(d.get("net", 0)),
            "status": d.get("status"),
            "type": d.get("type"),
            "reporting_category": d.get("reporting_category"),
            "source": _source_id(d.get("source")),
            "stripe_created": _ts(d.get("created")),
            "available_on": _ts(d.get("available_on")),
            "exchange_rate": d.get("exchange_rate"),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeBalanceTransaction(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_payout(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripePayout, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        vals = {
            "amount": int(d.get("amount", 0)),
            "currency": str(d.get("currency") or "eur").lower()[:3],
            "status": d.get("status"),
            "arrival_date": _ts(d.get("arrival_date")),
            "automatic": d.get("automatic"),
            "balance_transaction_id": _source_id(d.get("balance_transaction")),
            "destination": d.get("destination") if isinstance(d.get("destination"), str) else None,
            "failure_code": d.get("failure_code"),
            "failure_message": d.get("failure_message"),
            "method": d.get("method"),
            "stripe_type": d.get("type"),
            "statement_descriptor": d.get("statement_descriptor"),
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripePayout(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_customer(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeCustomer, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        addr = d.get("address")
        vals = {
            "email": d.get("email"),
            "name": d.get("name"),
            "phone": d.get("phone"),
            "description": d.get("description"),
            "balance": d.get("balance"),
            "currency": d.get("currency"),
            "delinquent": d.get("delinquent"),
            "invoice_prefix": d.get("invoice_prefix"),
            "tax_exempt": d.get("tax_exempt"),
            "default_source": _source_id(d.get("default_source")),
            "address": addr if isinstance(addr, dict) else None,
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeCustomer(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_subscription(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeSubscription, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        items = d.get("items")
        items_data = items if isinstance(items, (dict, list)) else None
        vals = {
            "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
            "status": d.get("status"),
            "current_period_start": _ts(d.get("current_period_start")),
            "current_period_end": _ts(d.get("current_period_end")),
            "cancel_at_period_end": d.get("cancel_at_period_end"),
            "canceled_at": _ts(d.get("canceled_at")),
            "collection_method": d.get("collection_method"),
            "default_payment_method": _source_id(d.get("default_payment_method")),
            "items_data": items_data,
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeSubscription(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def _upsert_invoice_lines(self, org: str, invoice_stripe_id: str, d: dict[str, Any]) -> None:
        lines_wrap = d.get("lines") or {}
        raw_lines = lines_wrap.get("data") if isinstance(lines_wrap, dict) else []
        for line in raw_lines:
            ld = _as_dict(line)
            lid = ld.get("id")
            if not isinstance(lid, str):
                continue
            row = await self._load_row(StripeInvoiceLineItem, org, lid)
            period = ld.get("period")
            pr_obj = ld.get("price")
            price_stripe_id = _source_id(pr_obj)
            product_stripe_id = None
            if isinstance(pr_obj, dict):
                p = pr_obj.get("product")
                product_stripe_id = p if isinstance(p, str) else _source_id(p)
            vals = {
                "invoice_stripe_id": invoice_stripe_id,
                "amount": ld.get("amount"),
                "currency": ld.get("currency"),
                "description": ld.get("description"),
                "quantity": ld.get("quantity"),
                "price_stripe_id": price_stripe_id,
                "product_stripe_id": product_stripe_id,
                "unit_amount": ld.get("unit_amount"),
                "discountable": ld.get("discountable"),
                "stripe_type": ld.get("type"),
                "period": period if isinstance(period, dict) else None,
                "stripe_metadata": ld.get("metadata") if isinstance(ld.get("metadata"), dict) else None,
                "raw_stripe_object": ld,
            }
            if row:
                for k, v in vals.items():
                    setattr(row, k, v)
                row.updated_at = utcnow()
            else:
                self._db.add(
                    StripeInvoiceLineItem(
                        id=str(uuid.uuid4()),
                        organization_id=org,
                        stripe_id=lid,
                        **vals,
                    )
                )

    async def apply_invoice(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeInvoice, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        vals = {
            "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
            "subscription_stripe_id": _source_id(d.get("subscription")),
            "status": d.get("status"),
            "currency": d.get("currency"),
            "amount_due": d.get("amount_due"),
            "amount_paid": d.get("amount_paid"),
            "amount_remaining": d.get("amount_remaining"),
            "subtotal": d.get("subtotal"),
            "total": d.get("total"),
            "tax": d.get("tax"),
            "billing_reason": d.get("billing_reason"),
            "collection_method": d.get("collection_method"),
            "hosted_invoice_url": d.get("hosted_invoice_url"),
            "invoice_pdf": d.get("invoice_pdf"),
            "number": d.get("number"),
            "paid": d.get("paid"),
            "period_start": _ts(d.get("period_start")),
            "period_end": _ts(d.get("period_end")),
            "stripe_created": _ts(d.get("created")),
            "due_date": _ts(d.get("due_date")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeInvoice(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        await self._upsert_invoice_lines(org, sid, d)
        return True

    async def apply_credit_note(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeCreditNote, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        vals = {
            "invoice_stripe_id": d.get("invoice") if isinstance(d.get("invoice"), str) else None,
            "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
            "status": d.get("status"),
            "currency": d.get("currency"),
            "amount": d.get("amount"),
            "subtotal": d.get("subtotal"),
            "total": d.get("total"),
            "reason": d.get("reason"),
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeCreditNote(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_product(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeProduct, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        imgs = d.get("images")
        vals = {
            "name": d.get("name"),
            "active": d.get("active"),
            "description": d.get("description"),
            "default_price_id": _source_id(d.get("default_price")),
            "images": imgs if isinstance(imgs, list) else None,
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeProduct(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_price(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripePrice, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        rec = d.get("recurring")
        vals = {
            "product_stripe_id": d.get("product") if isinstance(d.get("product"), str) else None,
            "active": d.get("active"),
            "currency": d.get("currency"),
            "unit_amount": d.get("unit_amount"),
            "billing_scheme": d.get("billing_scheme"),
            "stripe_type": d.get("type"),
            "recurring": rec if isinstance(rec, dict) else None,
            "tax_behavior": d.get("tax_behavior"),
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripePrice(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_payment_intent(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripePaymentIntent, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        vals = {
            "amount": d.get("amount"),
            "amount_received": d.get("amount_received"),
            "currency": d.get("currency"),
            "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
            "status": d.get("status"),
            "description": d.get("description"),
            "invoice_stripe_id": d.get("invoice") if isinstance(d.get("invoice"), str) else None,
            "latest_charge": _source_id(d.get("latest_charge")),
            "payment_method": _source_id(d.get("payment_method")),
            "receipt_email": d.get("receipt_email"),
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripePaymentIntent(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_refund(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeRefund, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        vals = {
            "amount": d.get("amount"),
            "currency": d.get("currency"),
            "charge_stripe_id": _source_id(d.get("charge")),
            "payment_intent_stripe_id": _source_id(d.get("payment_intent")),
            "status": d.get("status"),
            "reason": d.get("reason"),
            "failure_reason": d.get("failure_reason"),
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeRefund(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_dispute(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeDispute, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        vals = {
            "amount": d.get("amount"),
            "currency": d.get("currency"),
            "charge_stripe_id": _source_id(d.get("charge")),
            "status": d.get("status"),
            "reason": d.get("reason"),
            "evidence_due_by": _ts(d.get("evidence_due_by")),
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeDispute(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_tax_rate(self, obj: Any, *, deleted: bool = False) -> bool:
        d = _as_dict(obj)
        org = self._resolve_org(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeTaxRate, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        pct = d.get("percentage")
        vals = {
            "display_name": d.get("display_name"),
            "description": d.get("description"),
            "percentage": Decimal(str(pct)) if pct is not None else None,
            "inclusive": d.get("inclusive"),
            "active": d.get("active"),
            "jurisdiction": d.get("jurisdiction"),
            "tax_type": d.get("tax_type"),
            "stripe_created": _ts(d.get("created")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                StripeTaxRate(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    async def apply_charge(self, obj: Any) -> bool:
        """Persist balance transaction from a charge when present (treasury)."""
        d = _as_dict(obj)
        bt = d.get("balance_transaction")
        if isinstance(bt, dict) and bt.get("object") == "balance_transaction":
            return await self.apply_balance_transaction(bt)
        if isinstance(bt, str):
            try:
                full = await asyncio.to_thread(lambda: stripe.BalanceTransaction.retrieve(bt))
                return await self.apply_balance_transaction(full)
            except Exception as exc:
                logger.debug("balance_transaction retrieve failed: %s", exc)
                return False
        return False

    # --- Pull sync ------------------------------------------------------

    async def _pull_page(
        self,
        list_call: Any,
        *,
        apply: Any,
        page_size: int,
        max_pages: int,
        expand: list[str] | None = None,
    ) -> StripeSyncStatsResponse:
        self._require_stripe()
        self._require_org_for_pull()
        stats = StripeSyncStatsResponse()
        starting_after: str | None = None
        for _ in range(max_pages):
            kwargs: dict[str, Any] = {"limit": page_size}
            if starting_after:
                kwargs["starting_after"] = starting_after
            if expand:
                kwargs["expand"] = expand
            page = await asyncio.to_thread(list_call, **kwargs)
            items = list(getattr(page, "data", []) or [])
            stats.fetched += len(items)
            for item in items:
                d = stripe_object_to_dict(item)
                ok = await apply(d)
                if ok:
                    stats.upserted += 1
                else:
                    stats.skipped_no_org_metadata += 1
            if not getattr(page, "has_more", False) or not items:
                break
            last = items[-1]
            starting_after = last.id if hasattr(last, "id") else d.get("id")
        await self._db.commit()
        return stats

    async def sync_customers(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(stripe.Customer.list, apply=self.apply_customer, page_size=page_size, max_pages=max_pages)

    async def sync_subscriptions(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.Subscription.list,
            apply=self.apply_subscription,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_invoices(self, *, page_size: int = 50, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.Invoice.list,
            apply=self.apply_invoice,
            page_size=page_size,
            max_pages=max_pages,
            expand=["data.lines.data"],
        )

    async def sync_credit_notes(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.CreditNote.list,
            apply=self.apply_credit_note,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_products(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.Product.list,
            apply=self.apply_product,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_prices(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.Price.list,
            apply=self.apply_price,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_payment_intents(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.PaymentIntent.list,
            apply=self.apply_payment_intent,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_refunds(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.Refund.list,
            apply=self.apply_refund,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_disputes(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.Dispute.list,
            apply=self.apply_dispute,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_tax_rates(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.TaxRate.list,
            apply=self.apply_tax_rate,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_payouts(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.Payout.list,
            apply=self.apply_payout,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_balance_transactions(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        self._require_stripe()
        self._require_org_for_pull()
        stats = StripeSyncStatsResponse()
        starting_after: str | None = None
        for _ in range(max_pages):
            kwargs: dict[str, Any] = {"limit": page_size}
            if starting_after:
                kwargs["starting_after"] = starting_after
            page = await asyncio.to_thread(stripe.BalanceTransaction.list, **kwargs)
            items = list(getattr(page, "data", []) or [])
            stats.fetched += len(items)
            for item in items:
                d = stripe_object_to_dict(item)
                ok = await self.apply_balance_transaction(d)
                if ok:
                    stats.upserted += 1
                else:
                    stats.skipped_no_org_metadata += 1
            if not getattr(page, "has_more", False) or not items:
                break
            last = items[-1]
            starting_after = last.id
        await self._db.commit()
        return stats

    async def list_balance_transactions_mirror(
        self, *, limit: int = 100
    ) -> list[StripeBalanceTransactionResponse]:
        org = self._require_org_for_pull()
        r = await self._db.execute(
            select(StripeBalanceTransaction)
            .where(
                StripeBalanceTransaction.organization_id == org,
                StripeBalanceTransaction.deleted_at.is_(None),
            )
            .order_by(StripeBalanceTransaction.stripe_created.desc().nulls_last())
            .limit(limit)
        )
        return [StripeBalanceTransactionResponse.model_validate(x) for x in r.scalars().all()]

    async def list_invoices_mirror(self, *, limit: int = 100) -> list[StripeInvoiceResponse]:
        org = self._require_org_for_pull()
        r = await self._db.execute(
            select(StripeInvoice)
            .where(
                StripeInvoice.organization_id == org,
                StripeInvoice.deleted_at.is_(None),
            )
            .order_by(StripeInvoice.stripe_created.desc().nulls_last())
            .limit(limit)
        )
        return [StripeInvoiceResponse.model_validate(x) for x in r.scalars().all()]

    async def list_customers_mirror(self, *, limit: int = 100) -> list[StripeCustomerResponse]:
        org = self._require_org_for_pull()
        r = await self._db.execute(
            select(StripeCustomer)
            .where(
                StripeCustomer.organization_id == org,
                StripeCustomer.deleted_at.is_(None),
            )
            .order_by(StripeCustomer.stripe_created.desc().nulls_last())
            .limit(limit)
        )
        return [StripeCustomerResponse.model_validate(x) for x in r.scalars().all()]

    async def snapshot_balance(self) -> StripeBalanceSnapshotResponse:
        """Store a point-in-time Balance; Stripe account must match tenant model."""
        self._require_stripe()
        org = self._require_org_for_pull()
        bal = await asyncio.to_thread(stripe.Balance.retrieve)
        d = stripe_object_to_dict(bal)
        snap = StripeBalanceSnapshot(
            id=str(uuid.uuid4()),
            organization_id=org,
            available=d.get("available") or [],
            pending=d.get("pending") or [],
            connect_reserved=d.get("connect_reserved"),
            instant_available=d.get("instant_available"),
            livemode=d.get("livemode"),
            raw_stripe_object=d,
            retrieved_at=utcnow(),
        )
        self._db.add(snap)
        await self._db.commit()
        await self._db.refresh(snap)
        return StripeBalanceSnapshotResponse.model_validate(snap)
