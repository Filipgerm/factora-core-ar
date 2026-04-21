"""StripeController — HTTP bridge for Stripe webhooks and mirror sync APIs."""

from __future__ import annotations

from typing import Any

from packages.stripe.api.client import StripeClient
from packages.stripe.models import (
    StripeBalanceSnapshotResponse,
    StripeBalanceTransactionResponse,
    StripeCustomerResponse,
    StripeInvoiceResponse,
    StripeMeterEventAckResponse,
    StripeMeterEventRequest,
    StripeMeterEventSummaryQuery,
    StripeSyncStatsResponse,
    StripeTaxCalculationRequest,
    StripeTaxTransactionCommitRequest,
    StripeWebhookAckResponse,
)

from app.core.exceptions import StripeError
from app.services.stripe_sync_service import StripeSyncService
from app.services.stripe_webhook_service import StripeWebhookService


class StripeController:
    def __init__(
        self,
        sync_service: StripeSyncService,
        webhook_service: StripeWebhookService,
        stripe_client: StripeClient,
    ) -> None:
        self._sync = sync_service
        self._webhook = webhook_service
        self._stripe = stripe_client

    async def _wrap_sync(self, coro: Any, *, err_detail: str) -> Any:
        try:
            return await coro
        except StripeError:
            raise
        except Exception as exc:
            raise StripeError(err_detail.format(exc=exc), code="external.stripe.sync") from exc

    async def ingest_webhook(self, payload: bytes, stripe_signature: str | None) -> StripeWebhookAckResponse:
        return await self._webhook.process_webhook(payload, stripe_signature)

    async def sync_balance_transactions(
        self, *, page_size: int = 100, max_pages: int = 50
    ) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_balance_transactions(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_payouts(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_payouts(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_customers(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_customers(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_subscriptions(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_subscriptions(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_invoices(self, *, page_size: int = 50, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_invoices(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_credit_notes(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_credit_notes(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_products(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_products(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_prices(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_prices(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_payment_intents(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_payment_intents(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_refunds(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_refunds(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_disputes(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_disputes(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_tax_rates(self, *, page_size: int = 100, max_pages: int = 50) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_tax_rates(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def snapshot_balance(self) -> StripeBalanceSnapshotResponse:
        return await self._wrap_sync(
            self._sync.snapshot_balance(),
            err_detail="Stripe balance snapshot failed: {exc}",
        )

    async def list_balance_transactions(self, limit: int = 100) -> list[StripeBalanceTransactionResponse]:
        return await self._sync.list_balance_transactions_mirror(limit=limit)

    async def list_invoices(self, limit: int = 100) -> list[StripeInvoiceResponse]:
        return await self._sync.list_invoices_mirror(limit=limit)

    async def list_customers(self, limit: int = 100) -> list[StripeCustomerResponse]:
        return await self._sync.list_customers_mirror(limit=limit)

    # --- Stripe-native integrations: Schedules, Meters, Tax, RevRec ---

    async def sync_subscription_schedules(
        self, *, page_size: int = 100, max_pages: int = 50
    ) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_subscription_schedules(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe sync failed: {exc}",
        )

    async def sync_billing_meters(
        self, *, page_size: int = 100, max_pages: int = 50
    ) -> StripeSyncStatsResponse:
        return await self._wrap_sync(
            self._sync.sync_billing_meters(page_size=page_size, max_pages=max_pages),
            err_detail="Stripe meter sync failed: {exc}",
        )

    async def record_meter_event(
        self, req: StripeMeterEventRequest
    ) -> StripeMeterEventAckResponse:
        """Forward usage events to Stripe Billing Meters.

        We intentionally do **not** persist these into our mirror — MeterEventSummary
        (aggregated rollups) is the canonical source for revenue recognition.
        """
        try:
            ev = self._stripe.record_meter_event(
                event_name=req.event_name,
                payload=req.payload,
                identifier=req.identifier,
                timestamp=req.timestamp,
            )
        except Exception as exc:
            raise StripeError(
                f"Failed to record Stripe meter event: {exc}",
                code="external.stripe.meter_event",
            ) from exc
        return StripeMeterEventAckResponse(
            identifier=ev.get("identifier") if isinstance(ev, dict) else None,
            event_name=req.event_name,
            stripe_event=ev if isinstance(ev, dict) else None,
        )

    async def fetch_meter_event_summaries(
        self, req: StripeMeterEventSummaryQuery
    ) -> StripeSyncStatsResponse:
        """Pull per-customer meter summaries from Stripe into ``stripe_meter_event_summaries``."""
        return await self._wrap_sync(
            self._sync.sync_meter_event_summaries_for_customer(
                stripe_client=self._stripe,
                meter_stripe_id=req.meter_id,
                customer_stripe_id=req.customer,
                start_time=req.start_time,
                end_time=req.end_time,
                value_grouping_window=req.value_grouping_window,
            ),
            err_detail="Stripe meter summaries fetch failed: {exc}",
        )

    async def calculate_tax(
        self, req: StripeTaxCalculationRequest
    ) -> dict[str, Any]:
        """Stripe Tax Calculation (read-only preview)."""
        try:
            calc = self._stripe.create_tax_calculation(
                currency=req.currency,
                line_items=req.line_items,
                customer_details=req.customer_details,
            )
        except Exception as exc:
            raise StripeError(
                f"Stripe tax calculation failed: {exc}",
                code="external.stripe.tax_calculation",
            ) from exc
        return calc

    async def commit_tax_transaction(
        self, req: StripeTaxTransactionCommitRequest
    ) -> StripeSyncStatsResponse:
        """Commit a prior Tax Calculation into a Transaction and mirror it locally."""
        try:
            tx = self._stripe.create_tax_transaction_from_calculation(
                calculation=req.calculation, reference=req.reference
            )
        except Exception as exc:
            raise StripeError(
                f"Stripe tax transaction commit failed: {exc}",
                code="external.stripe.tax_transaction",
            ) from exc
        return await self._wrap_sync(
            self._sync.commit_tax_transaction_record(tx),
            err_detail="Stripe tax transaction persist failed: {exc}",
        )
