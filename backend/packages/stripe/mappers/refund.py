"""Refund mapper."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_refund(d: dict[str, Any]) -> dict[str, Any]:
    return {
        "amount": d.get("amount"),
        "currency": d.get("currency"),
        "charge_stripe_id": source_id(d.get("charge")),
        "payment_intent_stripe_id": source_id(d.get("payment_intent")),
        "status": d.get("status"),
        "reason": d.get("reason"),
        "failure_reason": d.get("failure_reason"),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
