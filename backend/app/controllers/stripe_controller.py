"""StripeController — HTTP bridge for Stripe webhooks and mirror sync APIs."""

from __future__ import annotations

from typing import Any

import stripe
from fastapi import HTTPException

from app.clients.stripe_client import get_stripe_client
from app.core.exceptions import StripeError, ValidationError
from app.models.stripe_billing import (
    StripeBalanceSnapshotResponse,
    StripeBalanceTransactionResponse,
    StripeCustomerResponse,
    StripeInvoiceResponse,
    StripeSyncStatsResponse,
    StripeWebhookAckResponse,
)
from app.services.stripe_sync_service import StripeSyncService
from app.services.stripe_webhook_service import StripeWebhookService


class StripeController:
    def __init__(
        self,
        sync_service: StripeSyncService,
        webhook_service: StripeWebhookService,
    ) -> None:
        self._sync = sync_service
        self._webhook = webhook_service

    async def _wrap_sync(self, coro: Any, *, err_detail: str) -> Any:
        try:
            return await coro
        except StripeError:
            raise
        except Exception as exc:
            raise StripeError(err_detail.format(exc=exc), code="external.stripe.sync") from exc

    async def ingest_webhook(self, payload: bytes, stripe_signature: str | None) -> StripeWebhookAckResponse:
        if not stripe_signature:
            raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")
        client = get_stripe_client()
        if not client.is_webhook_configured():
            raise ValidationError(
                "Stripe webhook secret is not configured",
                code="stripe.webhook_unconfigured",
            )
        try:
            event = client.verify_webhook_event(payload, stripe_signature)
        except stripe.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")
        except ValueError as exc:
            raise ValidationError(str(exc), code="stripe.webhook_config") from exc
        return await self._webhook.dispatch(event)

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
