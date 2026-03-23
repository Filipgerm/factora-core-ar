"""StripeWebhookService — dispatch verified Stripe events to mirror upserts.

**Scope:** Map ``event.type`` to ``StripeSyncService`` apply methods; commit once per delivery.

**Contract:** Expects an event dict (from ``StripeClient.verify_webhook_event``). Returns
ack metadata; does not verify signatures (caller responsibility).

**Architectural notes:** Tenant resolution is exclusively via ``metadata.organization_id``
on Stripe objects — events without it are acknowledged but not persisted.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.stripe_client import stripe_object_to_dict
from app.config import Settings, settings
from app.models.stripe_billing import StripeWebhookAckResponse
from app.services.stripe_sync_service import StripeSyncService


class StripeWebhookService:
    def __init__(self, db: AsyncSession, app_settings: Settings | None = None) -> None:
        self._db = db
        self._settings = app_settings or settings

    async def dispatch(self, event: dict[str, Any]) -> StripeWebhookAckResponse:
        """Route a Stripe event to the correct upsert handler."""
        etype = str(event.get("type") or "")
        raw_obj = (event.get("data") or {}).get("object")
        obj_d = stripe_object_to_dict(raw_obj) if raw_obj is not None else {}
        sync = StripeSyncService(self._db, organization_id=None, app_settings=self._settings)
        handled = False

        if etype.startswith("customer.subscription"):
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

        await self._db.commit()
        return StripeWebhookAckResponse(received=True, event_type=etype or None, handled=handled)
