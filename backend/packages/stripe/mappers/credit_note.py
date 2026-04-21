"""CreditNote mapper."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import ts_from_epoch


def map_credit_note(d: dict[str, Any]) -> dict[str, Any]:
    return {
        "invoice_stripe_id": d.get("invoice") if isinstance(d.get("invoice"), str) else None,
        "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
        "status": d.get("status"),
        "currency": d.get("currency"),
        "amount": d.get("amount"),
        "subtotal": d.get("subtotal"),
        "total": d.get("total"),
        "reason": d.get("reason"),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
