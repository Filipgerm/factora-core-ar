"""StripeWebhookService — verify Stripe signatures and dispatch events to mirror upserts.

**Scope:** Cryptographically verify webhook payloads, then map ``event.type`` to
``StripeSyncService`` apply methods; commit once per delivery.

**Contract:** ``process_webhook`` raises ``ClientBadRequestError`` / ``ValidationError``
from ``app.core.exceptions``; returns ``StripeWebhookAckResponse`` on success.

**Architectural notes:**
    * Uses ``stripe.Webhook.construct_event`` with ``STRIPE_WEBHOOK_SECRET``
      from settings.
    * Tenant resolution in ``dispatch`` is via ``metadata.organization_id``
      on Stripe objects. The webhook's ``StripeSyncService`` is constructed
      with ``allow_blocking_stripe_calls=False`` — any fallback requiring a
      live Stripe HTTP round-trip (``Charge.retrieve``,
      ``BalanceTransaction.retrieve``) is enqueued to a Celery task so the
      ack stays O(1) DB.
"""
from __future__ import annotations

import logging
from typing import Any

import stripe
from sqlalchemy.ext.asyncio import AsyncSession
from stripe import SignatureVerificationError

from packages.stripe.api.serialize import stripe_object_to_dict
from packages.stripe.models import StripeWebhookAckResponse
from app.config import Settings, settings
from app.core.exceptions import ClientBadRequestError, ValidationError
from app.services.stripe_sync_service import StripeSyncService

logger = logging.getLogger(__name__)


class StripeWebhookService:
    def __init__(self, db: AsyncSession, app_settings: Settings | None = None) -> None:
        self._db = db
        self._settings = app_settings or settings

    async def process_webhook(
        self, payload: bytes, stripe_signature: str | None
    ) -> StripeWebhookAckResponse:
        """Verify ``Stripe-Signature`` and run ``dispatch`` on the event dict."""
        if not stripe_signature:
            raise ClientBadRequestError(
                "Missing Stripe-Signature header",
                code="stripe.missing_signature",
            )
        secret = (self._settings.STRIPE_WEBHOOK_SECRET or "").strip()
        if not secret:
            raise ValidationError(
                "Stripe webhook secret is not configured",
                code="stripe.webhook_unconfigured",
            )
        try:
            event = stripe.Webhook.construct_event(payload, stripe_signature, secret)
        except SignatureVerificationError as e:
            raise ClientBadRequestError(
                "Invalid Stripe webhook signature",
                code="stripe.signature_invalid",
            ) from e
        except ValueError as e:
            raise ValidationError(str(e), code="stripe.webhook_config") from e
        event_dict = stripe_object_to_dict(event)
        return await self.dispatch(event_dict)

    async def dispatch(self, event: dict[str, Any]) -> StripeWebhookAckResponse:
        """Route a verified Stripe event to the correct upsert handler."""
        etype = str(event.get("type") or "")
        raw_obj = (event.get("data") or {}).get("object")
        obj_d = stripe_object_to_dict(raw_obj) if raw_obj is not None else {}
        # Hot-path: NO live Stripe HTTP round-trips. Fallbacks are enqueued.
        sync = StripeSyncService(
            self._db,
            organization_id=None,
            app_settings=self._settings,
            allow_blocking_stripe_calls=False,
        )
        handled = False

        if etype.startswith("customer.subscription_item"):
            handled = await sync.apply_subscription_item(
                obj_d, deleted=etype.endswith(".deleted")
            )
        elif etype.startswith("customer.subscription"):
            deleted = etype.endswith(".deleted")
            handled = await sync.apply_subscription(obj_d, deleted=deleted)
        elif etype.startswith("customer."):
            handled = await sync.apply_customer(obj_d, deleted=etype.endswith(".deleted"))
        elif etype.startswith("invoice."):
            deleted = etype.endswith(".deleted") or etype.endswith(".voided")
            handled = await sync.apply_invoice(obj_d, deleted=deleted)
        elif etype.startswith("product."):
            handled = await sync.apply_product(obj_d, deleted=etype.endswith(".deleted"))
        elif etype.startswith("price."):
            handled = await sync.apply_price(obj_d, deleted=etype.endswith(".deleted"))
        elif etype.startswith("payment_intent."):
            handled = await sync.apply_payment_intent(obj_d, deleted=False)
        elif etype.startswith("charge."):
            handled = await sync.apply_charge(obj_d)
            # If the row could not be persisted (missing metadata.org or the
            # embedded balance_transaction was a bare id), enqueue a Celery
            # task so the ack stays fast.
            if not handled:
                self._enqueue_charge_followup(obj_d)
        elif etype.startswith("payout."):
            handled = await sync.apply_payout(obj_d, deleted=etype.endswith(".canceled"))
        elif etype.startswith("credit_note."):
            handled = await sync.apply_credit_note(
                obj_d, deleted=etype.endswith(".voided")
            )
        elif etype.startswith("refund."):
            handled = await sync.apply_refund(obj_d, deleted=False)
        elif etype.startswith("dispute."):
            handled = await sync.apply_dispute(obj_d, deleted=False)
        elif etype.startswith("tax_rate."):
            handled = await sync.apply_tax_rate(obj_d, deleted=etype.endswith(".deleted"))
        elif etype.startswith("balance_transaction."):
            handled = await sync.apply_balance_transaction(obj_d)
        elif etype.startswith("subscription_schedule."):
            handled = await sync.apply_subscription_schedule(
                obj_d, deleted=etype.endswith(".canceled") or etype.endswith(".released")
            )
        elif etype.startswith("billing.meter."):
            handled = await sync.apply_billing_meter(
                obj_d, deleted=etype.endswith(".deactivated")
            )
        elif etype.startswith("tax.transaction."):
            handled = await sync.apply_tax_transaction(obj_d, deleted=False)
        elif etype.startswith("revenue_recognition.") or etype.startswith(
            "revenue_recognition_report."
        ):
            handled = await sync.apply_revrec_report(obj_d, deleted=False)

        await self._db.commit()
        return StripeWebhookAckResponse(received=True, event_type=etype or None, handled=handled)

    # --- Off-hot-path enqueue helpers -----------------------------------

    def _enqueue_charge_followup(self, charge: dict[str, Any]) -> None:
        """Fire-and-forget Celery dispatch so the ack doesn't wait on Stripe I/O.

        We only enqueue when we have a stable ``ch_*`` id. Task imports are
        done lazily to keep the webhook path independent of Celery app
        lifecycle in tests.
        """
        charge_id = charge.get("id")
        if not isinstance(charge_id, str) or not charge_id.startswith("ch_"):
            return
        try:
            from app.workers.tasks.stripe import resync_charge_balance

            resync_charge_balance.delay(charge_id)
        except Exception as exc:  # noqa: BLE001 — never break webhook ack
            logger.warning(
                "failed to enqueue resync_charge_balance charge=%s err=%s",
                charge_id,
                exc,
            )
