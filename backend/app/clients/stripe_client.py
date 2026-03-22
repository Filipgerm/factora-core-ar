"""StripeClient — thin wrapper around the Stripe Python SDK for billing prep.

No business logic beyond delegating to Stripe; callers handle errors.
"""
from __future__ import annotations

from typing import Any

import stripe

from app.config import settings


class StripeClient:
    """Minimal Stripe surface (customers + payment intents) for future billing."""

    def __init__(self) -> None:
        if settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY

    def is_configured(self) -> bool:
        return bool(settings.STRIPE_SECRET_KEY)

    def create_customer(self, *, email: str, name: str | None = None) -> dict[str, Any]:
        """Create a Stripe customer; returns a dict with at least ``id``."""
        if not self.is_configured():
            return {"id": "stub_cus", "email": email, "name": name}
        cust = stripe.Customer.create(email=email, name=name)
        return {"id": cust.id, "email": getattr(cust, "email", email)}

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
            "client_secret": pi.client_secret,
            "amount": amount_cents,
            "currency": currency,
        }
