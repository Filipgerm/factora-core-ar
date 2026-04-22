"""Price mapper."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import ts_from_epoch


def map_price(d: dict[str, Any]) -> dict[str, Any]:
    rec = d.get("recurring")
    return {
        "product_stripe_id": d.get("product") if isinstance(d.get("product"), str) else None,
        "active": d.get("active"),
        "currency": d.get("currency"),
        "unit_amount": d.get("unit_amount"),
        "billing_scheme": d.get("billing_scheme"),
        "stripe_type": d.get("type"),
        "recurring": rec if isinstance(rec, dict) else None,
        "tax_behavior": d.get("tax_behavior"),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
