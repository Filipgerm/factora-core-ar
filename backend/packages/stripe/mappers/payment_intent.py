"""PaymentIntent mapper."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_payment_intent(d: dict[str, Any]) -> dict[str, Any]:
    return {
        "amount": d.get("amount"),
        "amount_received": d.get("amount_received"),
        "currency": d.get("currency"),
        "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
        "status": d.get("status"),
        "description": d.get("description"),
        "invoice_stripe_id": d.get("invoice") if isinstance(d.get("invoice"), str) else None,
        "latest_charge": source_id(d.get("latest_charge")),
        "payment_method": source_id(d.get("payment_method")),
        "receipt_email": d.get("receipt_email"),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
