"""Stripe webhook and event-adjacent API envelopes."""
from __future__ import annotations

from pydantic import BaseModel


class StripeWebhookAckResponse(BaseModel):
    received: bool = True
    event_type: str | None = None
    handled: bool = False
