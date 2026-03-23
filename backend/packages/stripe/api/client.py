"""Stripe SDK wrapper — API key configuration, customers, payment intents, webhooks.

No application imports; callers supply keys and secrets explicitly.
"""
from __future__ import annotations

from typing import Any

import stripe

from packages.stripe.api.serialize import stripe_object_to_dict
from packages.stripe.api.webhooks import construct_verified_event


class StripeClient:
    """Thin Stripe SDK wrapper: module-level config + webhook verification."""

    def __init__(
        self,
        *,
        secret_key: str = "",
        api_version: str = "",
        webhook_secret: str = "",
    ) -> None:
        self._secret_key = secret_key
        self._api_version = api_version
        self._webhook_secret = webhook_secret
        self._apply_settings()

    def _apply_settings(self) -> None:
        if self._secret_key:
            stripe.api_key = self._secret_key
        if self._api_version:
            stripe.api_version = self._api_version

    def is_configured(self) -> bool:
        return bool(self._secret_key)

    def is_webhook_configured(self) -> bool:
        return bool(self._webhook_secret)

    def verify_webhook_event(self, payload: bytes, stripe_signature: str) -> dict[str, Any]:
        """Verify ``Stripe-Signature`` and return the event as a dict.

        Raises:
            stripe.error.SignatureVerificationError: Invalid signature or payload.
            ValueError: Webhook secret not configured.
        """
        if not self.is_webhook_configured():
            raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")
        return construct_verified_event(
            payload, stripe_signature, self._webhook_secret
        )

    def create_customer(self, *, email: str, name: str | None = None) -> dict[str, Any]:
        """Create a Stripe customer; returns a dict with at least ``id``."""
        if not self.is_configured():
            return {"id": "stub_cus", "email": email, "name": name}
        cust = stripe.Customer.create(email=email, name=name)
        return {
            "id": cust.id,
            "email": getattr(cust, "email", email),
            "name": getattr(cust, "name", name),
        }

    def create_payment_intent_stub(
        self,
        *,
        amount_cents: int,
        currency: str = "eur",
        customer_id: str | None = None,
    ) -> dict[str, Any]:
        """Create a PaymentIntent (test mode) — used by future checkout flows."""
        if not self.is_configured():
            return {
                "id": "stub_pi",
                "client_secret": "stub_secret",
                "amount": amount_cents,
                "currency": currency,
            }
        params: dict[str, Any] = {
            "amount": amount_cents,
            "currency": currency,
            "automatic_payment_methods": {"enabled": True},
        }
        if customer_id and not customer_id.startswith("stub_"):
            params["customer"] = customer_id
        pi = stripe.PaymentIntent.create(**params)
        return {
            "id": pi.id,
            "client_secret": getattr(pi, "client_secret", None),
            "amount": amount_cents,
            "currency": currency,
        }
