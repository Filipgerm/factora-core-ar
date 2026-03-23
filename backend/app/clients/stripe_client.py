"""StripeClient — singleton SDK configuration and webhook signature verification.

**Scope:** Apply API version and secret key from ``settings``; verify webhook payloads.

**Contract:** No business logic or database access. Callers use ``get_stripe_client()``
for a process-wide configured client. Webhook verification returns a plain ``dict`` event.

**Architectural notes:** Stripe's Python SDK mutates module-level ``stripe.api_key`` and
``stripe.api_version``; the singleton avoids conflicting reconfiguration per request.
"""
from __future__ import annotations

from typing import Any

import stripe
from stripe import Webhook

from app.config import settings

_client_singleton: StripeClient | None = None


def get_stripe_client() -> StripeClient:
    """Return the process-wide Stripe client (lazy-initialized)."""
    global _client_singleton
    if _client_singleton is None:
        _client_singleton = StripeClient()
    return _client_singleton


def stripe_object_to_dict(obj: Any) -> dict[str, Any]:
    """Normalize a StripeObject (or dict) to a plain dict."""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict_recursive"):
        return obj.to_dict_recursive()
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    return dict(obj)


class StripeClient:
    """Thin Stripe SDK wrapper: configuration + webhook construct_event."""

    def __init__(self) -> None:
        self._apply_settings()

    def _apply_settings(self) -> None:
        if settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
        if settings.STRIPE_API_VERSION:
            stripe.api_version = settings.STRIPE_API_VERSION

    def is_configured(self) -> bool:
        return bool(settings.STRIPE_SECRET_KEY)

    def is_webhook_configured(self) -> bool:
        return bool(settings.STRIPE_WEBHOOK_SECRET)

    def verify_webhook_event(self, payload: bytes, stripe_signature: str) -> dict[str, Any]:
        """Verify ``Stripe-Signature`` and return the event as a dict.

        Raises:
            stripe.error.SignatureVerificationError: Invalid signature or payload.
        """
        if not self.is_webhook_configured():
            raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")
        event = Webhook.construct_event(
            payload,
            stripe_signature,
            settings.STRIPE_WEBHOOK_SECRET,
        )
        return stripe_object_to_dict(event)

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
