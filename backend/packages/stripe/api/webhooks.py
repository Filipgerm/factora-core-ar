"""Stripe webhook signature verification (Stripe-Signature header)."""
from __future__ import annotations

from typing import Any

from stripe import Webhook

from packages.stripe.api.serialize import stripe_object_to_dict


def construct_verified_event(
    payload: bytes,
    stripe_signature: str,
    webhook_secret: str,
) -> dict[str, Any]:
    """Verify the signature and return the event payload as a plain dict.

    Raises:
        stripe.error.SignatureVerificationError: Invalid signature or payload.
    """
    event = Webhook.construct_event(payload, stripe_signature, webhook_secret)
    return stripe_object_to_dict(event)
