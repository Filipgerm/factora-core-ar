"""StripeSyncService — mirror Stripe API objects into org-scoped SQL rows.

**Scope:** Upsert from webhook or pull-sync; resolve tenant via ``metadata.organization_id``.

**Contract:** Raises ``ValidationError`` when pull sync is invoked without a JWT organization;
raises ``StripeError`` when API keys are missing. Commits on pull/sync endpoints after work.

**Flow:**
1. Resolve ``organization_id`` (JWT for pull; metadata for webhooks; charge/PI for balance txs).
2. Delegate payload shaping to ``packages.stripe.mappers`` (pure, DB-free).
3. Upsert by ``(organization_id, stripe_id)`` or insert balance snapshot rows.
4. ``await commit()`` for transactional persistence on pull paths.

**Architectural notes:**
    * Per-resource mappers live in ``packages/stripe/mappers/`` — this service owns
      only org resolution, loading, upserting, and pagination.
    * Stripe SDK calls use ``asyncio.to_thread`` to avoid blocking the loop.
    * The webhook dispatcher should *not* call ``_org_from_charge_id`` — the
      fallback Stripe HTTP retrieve is moved to a Celery task to keep the
      webhook hot-path O(1) DB.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from typing import Any, Callable

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
    StripeMeter,
    StripeMeterEventSummary,
    StripePaymentIntent,
    StripePayout,
    StripePrice,
    StripeProduct,
    StripeRefund,
    StripeRevrecReport,
    StripeSubscription,
    StripeSubscriptionItem,
    StripeSubscriptionSchedule,
    StripeTaxRate,
    StripeTaxTransaction,
)
from packages.stripe import mappers as M
from packages.stripe.api.serialize import stripe_object_to_dict
from packages.stripe.models import (
    StripeBalanceSnapshotResponse,
    StripeBalanceTransactionResponse,
    StripeCustomerResponse,
    StripeInvoiceResponse,
    StripeSyncStatsResponse,
)

logger = logging.getLogger(__name__)


class StripeSyncService:
    def __init__(
        self,
        db: AsyncSession,
        organization_id: str | None,
        app_settings: Settings | None = None,
        *,
        allow_blocking_stripe_calls: bool = True,
    ) -> None:
        """Build a sync service.

        ``allow_blocking_stripe_calls`` controls whether org-resolution
        fallbacks are permitted to issue live Stripe HTTP requests
        (``Charge.retrieve`` / ``BalanceTransaction.retrieve``). Webhook
        dispatchers instantiate this service with ``False`` so the ack
        latency stays O(1) DB — the fallback is re-attempted by a
        Celery task off the hot-path.
        """
        self._db = db
        self._organization_id = organization_id
        self._settings = app_settings or settings
        self._allow_blocking_stripe_calls = allow_blocking_stripe_calls

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

    # --- Org resolution --------------------------------------------------

    def _resolve_org(self, obj: dict[str, Any]) -> str | None:
        mo = M.metadata_org(obj)
        if self._organization_id:
            return self._organization_id if mo == self._organization_id else None
        return mo

    async def _resolve_org_balance_tx(self, obj: dict[str, Any]) -> str | None:
        """Resolve org for a balance-transaction row.

        Order:
            1. ``metadata.organization_id`` on the row (fast, DB-free).
            2. (**Only when ``allow_blocking_stripe_calls`` is True**) issue
               a live ``Charge.retrieve`` to read the source metadata.

        On the webhook hot-path the second step is **disabled**; the caller
        is expected to enqueue a Celery task that retries this resolution
        asynchronously (see ``app.workers.tasks.stripe``).
        """
        mo = M.metadata_org(obj)
        if self._organization_id:
            if mo == self._organization_id:
                return self._organization_id
            if not self._allow_blocking_stripe_calls:
                return None
            src = M.source_id(obj.get("source"))
            if src and src.startswith("ch_"):
                org = await self._org_from_charge_id(src)
                if org == self._organization_id:
                    return self._organization_id
            return None
        if mo:
            return mo
        if not self._allow_blocking_stripe_calls:
            return None
        src = M.source_id(obj.get("source"))
        if src and src.startswith("ch_"):
            return await self._org_from_charge_id(src)
        return None

    async def _org_from_charge_id(self, charge_id: str) -> str | None:
        """Slow fallback: retrieve charge + PI to read metadata.organization_id.

        **IMPORTANT:** never invoke this on the webhook hot-path — it blocks
        the ack. The webhook dispatcher constructs this service with
        ``allow_blocking_stripe_calls=False`` so accidental invocations are
        short-circuited; the Celery task in ``app.workers.tasks.stripe``
        re-runs this resolution off the hot-path.
        """
        if not self._allow_blocking_stripe_calls:
            logger.debug(
                "_org_from_charge_id short-circuited (blocking disabled) for %s",
                charge_id,
            )
            return None
        try:
            ch = await asyncio.to_thread(
                lambda: stripe.Charge.retrieve(charge_id, expand=["payment_intent"]),
            )
        except Exception as exc:
            logger.debug("stripe charge retrieve failed: %s", exc)
            return None
        d = stripe_object_to_dict(ch)
        o = M.metadata_org(d)
        if o:
            return o
        pi = d.get("payment_intent")
        if isinstance(pi, dict):
            return M.metadata_org(pi)
        return None

    async def _load_row(self, model: type, org: str, sid: str) -> Any:
        r = await self._db.execute(
            select(model).where(model.organization_id == org, model.stripe_id == sid)
        )
        return r.scalar_one_or_none()

    # --- Generic upsert pipeline ----------------------------------------

    async def _upsert(
        self,
        *,
        model: type,
        mapper: Callable[[dict[str, Any]], dict[str, Any]],
        obj: Any,
        deleted: bool,
        org_resolver: Callable[[dict[str, Any]], Any] | None = None,
    ) -> bool:
        """Upsert a Stripe object via a pure mapper.

        ``org_resolver`` defaults to ``_resolve_org``; async variants (balance
        transaction) pass their own coroutine.
        """
        d = M.as_dict(obj)
        resolver = org_resolver or self._resolve_org
        org = resolver(d)
        if asyncio.iscoroutine(org):
            org = await org
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(model, org, sid)
        if deleted:
            if row:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
            return True
        vals = mapper(d)
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
            row.deleted_at = None
            row.updated_at = utcnow()
        else:
            self._db.add(
                model(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    stripe_id=sid,
                    **vals,
                )
            )
        return True

    # --- Individual resources -------------------------------------------

    async def apply_balance_transaction(self, obj: Any) -> bool:
        d = M.as_dict(obj)
        org = await self._resolve_org_balance_tx(d)
        if not org:
            return False
        sid = d.get("id")
        if not isinstance(sid, str):
            return False
        row = await self._load_row(StripeBalanceTransaction, org, sid)
        vals = M.map_balance_transaction(d)
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
        return await self._upsert(model=StripePayout, mapper=M.map_payout, obj=obj, deleted=deleted)

    async def apply_customer(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(model=StripeCustomer, mapper=M.map_customer, obj=obj, deleted=deleted)

    async def apply_subscription(self, obj: Any, *, deleted: bool = False) -> bool:
        d = M.as_dict(obj)
        handled = await self._upsert(
            model=StripeSubscription, mapper=M.map_subscription, obj=d, deleted=deleted
        )
        if handled and not deleted:
            await self._upsert_subscription_items_from_subscription(d)
        return handled

    async def _upsert_subscription_items_from_subscription(
        self, d: dict[str, Any]
    ) -> None:
        """Stripe embeds a subscription's items on the parent — upsert inline."""
        org = self._resolve_org(d)
        if not org:
            return
        sub_id = d.get("id")
        if not isinstance(sub_id, str):
            return
        items_wrap = d.get("items") or {}
        raw_items = items_wrap.get("data") if isinstance(items_wrap, dict) else []
        if not isinstance(raw_items, list):
            return
        for item in raw_items:
            item_d = M.as_dict(item)
            sid = item_d.get("id")
            if not isinstance(sid, str):
                continue
            row = await self._load_row(StripeSubscriptionItem, org, sid)
            vals = M.map_subscription_item(item_d, subscription_stripe_id=sub_id)
            if row:
                for k, v in vals.items():
                    setattr(row, k, v)
                row.updated_at = utcnow()
            else:
                self._db.add(
                    StripeSubscriptionItem(
                        id=str(uuid.uuid4()),
                        organization_id=org,
                        stripe_id=sid,
                        **vals,
                    )
                )

    async def apply_subscription_item(self, obj: Any, *, deleted: bool = False) -> bool:
        """Webhook path for ``customer.subscription_item.*`` events (rare — usually inline)."""
        d = M.as_dict(obj)
        sub_id = d.get("subscription") if isinstance(d.get("subscription"), str) else None
        if not sub_id:
            return False
        return await self._upsert(
            model=StripeSubscriptionItem,
            mapper=lambda x: M.map_subscription_item(x, subscription_stripe_id=sub_id),
            obj=d,
            deleted=deleted,
        )

    async def apply_subscription_schedule(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripeSubscriptionSchedule,
            mapper=M.map_subscription_schedule,
            obj=obj,
            deleted=deleted,
        )

    async def apply_billing_meter(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripeMeter, mapper=M.map_billing_meter, obj=obj, deleted=deleted
        )

    async def apply_billing_meter_event_summary(
        self, obj: Any, *, meter_stripe_id: str, customer_stripe_id: str
    ) -> bool:
        """MeterEventSummary is not uniquely ``stripe_id``-keyed — we use (meter, customer, window)."""
        d = M.as_dict(obj)
        org = self._organization_id
        if not org:
            return False
        start = M.ts_from_epoch(d.get("start_time"))
        r = await self._db.execute(
            select(StripeMeterEventSummary).where(
                StripeMeterEventSummary.organization_id == org,
                StripeMeterEventSummary.meter_stripe_id == meter_stripe_id,
                StripeMeterEventSummary.customer_stripe_id == customer_stripe_id,
                StripeMeterEventSummary.start_time == start,
            )
        )
        row = r.scalar_one_or_none()
        vals = M.map_billing_meter_event_summary(
            d, meter_stripe_id=meter_stripe_id, customer_stripe_id=customer_stripe_id
        )
        if row:
            for k, v in vals.items():
                setattr(row, k, v)
        else:
            self._db.add(
                StripeMeterEventSummary(
                    id=str(uuid.uuid4()),
                    organization_id=org,
                    **vals,
                )
            )
        return True

    async def apply_tax_transaction(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripeTaxTransaction,
            mapper=M.map_tax_transaction,
            obj=obj,
            deleted=deleted,
        )

    async def apply_revrec_report(self, obj: Any, *, deleted: bool = False) -> bool:
        """Stripe native Revenue Recognition — mirrored so our scheduler can reconcile."""
        d = M.as_dict(obj)
        vals = {
            "report_type": d.get("report_type"),
            "status": d.get("status"),
            "interval_start": M.ts_from_epoch(d.get("interval_start")),
            "interval_end": M.ts_from_epoch(d.get("interval_end")),
            "result_url": d.get("result"),
            "parameters": d.get("parameters") if isinstance(d.get("parameters"), dict) else None,
            "summary": d.get("summary") if isinstance(d.get("summary"), dict) else None,
            "stripe_created": M.ts_from_epoch(d.get("created")),
            "succeeded_at": M.ts_from_epoch(d.get("succeeded_at")),
            "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
            "raw_stripe_object": d,
        }
        return await self._upsert(
            model=StripeRevrecReport,
            mapper=lambda _: vals,
            obj=d,
            deleted=deleted,
        )

    async def _ensure_stub_parent(
        self,
        *,
        model: type,
        org: str,
        stripe_id: str | None,
        defaults: dict[str, Any],
    ) -> None:
        """Insert a minimal parent row if absent — used to satisfy FKs on out-of-order events."""
        if not stripe_id:
            return
        existing = await self._load_row(model, org, stripe_id)
        if existing is not None:
            return
        self._db.add(
            model(
                id=str(uuid.uuid4()),
                organization_id=org,
                stripe_id=stripe_id,
                **defaults,
            )
        )

    async def _upsert_invoice_lines(
        self, org: str, invoice_stripe_id: str, d: dict[str, Any]
    ) -> None:
        lines_wrap = d.get("lines") or {}
        raw_lines = lines_wrap.get("data") if isinstance(lines_wrap, dict) else []
        for line in raw_lines:
            ld = M.as_dict(line)
            lid = ld.get("id")
            if not isinstance(lid, str):
                continue
            vals = M.map_invoice_line_item(ld, invoice_stripe_id=invoice_stripe_id)
            # Stub parents so FKs hold even if the price/product/sub item
            # webhook arrives after this invoice event.
            await self._ensure_stub_parent(
                model=StripeProduct,
                org=org,
                stripe_id=vals.get("product_stripe_id"),
                defaults={"raw_stripe_object": None},
            )
            await self._ensure_stub_parent(
                model=StripePrice,
                org=org,
                stripe_id=vals.get("price_stripe_id"),
                defaults={
                    "product_stripe_id": vals.get("product_stripe_id"),
                    "currency": ld.get("currency"),
                    "unit_amount": ld.get("unit_amount"),
                    "raw_stripe_object": None,
                },
            )
            sub_item_sid = vals.get("subscription_item_stripe_id")
            if sub_item_sid:
                sub_raw = ld.get("subscription")
                sub_sid = sub_raw if isinstance(sub_raw, str) else M.source_id(sub_raw)
                await self._ensure_stub_parent(
                    model=StripeSubscriptionItem,
                    org=org,
                    stripe_id=sub_item_sid,
                    defaults={
                        "subscription_stripe_id": sub_sid or "",
                        "price_stripe_id": vals.get("price_stripe_id"),
                        "product_stripe_id": vals.get("product_stripe_id"),
                        "raw_stripe_object": None,
                    },
                )
            row = await self._load_row(StripeInvoiceLineItem, org, lid)
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
        d = M.as_dict(obj)
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
        vals = M.map_invoice(d)
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
        return await self._upsert(
            model=StripeCreditNote, mapper=M.map_credit_note, obj=obj, deleted=deleted
        )

    async def apply_product(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripeProduct, mapper=M.map_product, obj=obj, deleted=deleted
        )

    async def apply_price(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripePrice, mapper=M.map_price, obj=obj, deleted=deleted
        )

    async def apply_payment_intent(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripePaymentIntent, mapper=M.map_payment_intent, obj=obj, deleted=deleted
        )

    async def apply_refund(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripeRefund, mapper=M.map_refund, obj=obj, deleted=deleted
        )

    async def apply_dispute(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripeDispute, mapper=M.map_dispute, obj=obj, deleted=deleted
        )

    async def apply_tax_rate(self, obj: Any, *, deleted: bool = False) -> bool:
        return await self._upsert(
            model=StripeTaxRate, mapper=M.map_tax_rate, obj=obj, deleted=deleted
        )

    async def apply_charge(self, obj: Any) -> bool:
        """Persist balance transaction from a charge when present (treasury).

        On the webhook hot-path (``allow_blocking_stripe_calls=False``) we
        never fetch the ``BalanceTransaction`` synchronously — the dispatch
        layer enqueues ``app.workers.tasks.stripe.resync_charge_balance``
        instead. On pull-sync / admin paths the retrieve runs inline.
        """
        d = M.as_dict(obj)
        bt = d.get("balance_transaction")
        if isinstance(bt, dict) and bt.get("object") == "balance_transaction":
            return await self.apply_balance_transaction(bt)
        if isinstance(bt, str):
            if not self._allow_blocking_stripe_calls:
                logger.debug(
                    "apply_charge skipped Stripe retrieve (hot-path); Celery task will reconcile %s",
                    bt,
                )
                return False
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
            last_d: dict[str, Any] = {}
            for item in items:
                last_d = stripe_object_to_dict(item)
                ok = await apply(last_d)
                if ok:
                    stats.upserted += 1
                else:
                    stats.skipped_no_org_metadata += 1
            if not getattr(page, "has_more", False) or not items:
                break
            last = items[-1]
            starting_after = last.id if hasattr(last, "id") else last_d.get("id")
        await self._db.commit()
        return stats

    async def sync_customers(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.Customer.list, apply=self.apply_customer, page_size=page_size, max_pages=max_pages
        )

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

    async def sync_subscription_schedules(
        self, *, page_size: int = 100, max_pages: int = 50
    ) -> StripeSyncStatsResponse:
        return await self._pull_page(
            stripe.SubscriptionSchedule.list,
            apply=self.apply_subscription_schedule,
            page_size=page_size,
            max_pages=max_pages,
        )

    async def sync_meter_event_summaries_for_customer(
        self,
        *,
        stripe_client: Any,
        meter_stripe_id: str,
        customer_stripe_id: str,
        start_time: int,
        end_time: int,
        value_grouping_window: str | None = None,
    ) -> StripeSyncStatsResponse:
        """Fetch meter summaries for one customer via the provided client and upsert."""
        self._require_org_for_pull()
        summaries = await asyncio.to_thread(
            stripe_client.list_meter_event_summaries,
            meter_id=meter_stripe_id,
            customer=customer_stripe_id,
            start_time=start_time,
            end_time=end_time,
            value_grouping_window=value_grouping_window,
        )
        stats = StripeSyncStatsResponse(fetched=len(summaries))
        for raw in summaries:
            ok = await self.apply_billing_meter_event_summary(
                raw,
                meter_stripe_id=meter_stripe_id,
                customer_stripe_id=customer_stripe_id,
            )
            if ok:
                stats.upserted += 1
            else:
                stats.skipped_no_org_metadata += 1
        await self._db.commit()
        return stats

    async def commit_tax_transaction_record(self, tx: dict[str, Any]) -> StripeSyncStatsResponse:
        """Persist a single Tax Transaction returned from Stripe and commit."""
        self._require_org_for_pull()
        stats = StripeSyncStatsResponse(fetched=1)
        ok = await self.apply_tax_transaction(tx)
        if ok:
            stats.upserted = 1
            await self._db.commit()
        else:
            stats.skipped_no_org_metadata = 1
        return stats

    async def sync_billing_meters(
        self, *, page_size: int = 100, max_pages: int = 50
    ) -> StripeSyncStatsResponse:
        """Stripe Billing Meters (``stripe.billing.Meter.list``)."""
        meter_list = getattr(getattr(stripe, "billing", None), "Meter", None)
        if meter_list is None or not hasattr(meter_list, "list"):
            raise StripeError(
                "Stripe Billing Meters API not available in this SDK version",
                code="external.stripe.meters_unavailable",
            )
        return await self._pull_page(
            meter_list.list,
            apply=self.apply_billing_meter,
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

    async def sync_balance_transactions(
        self, *, page_size: int = 100, max_pages: int = 50
    ) -> StripeSyncStatsResponse:
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

    # --- Mirror reads ---------------------------------------------------

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
