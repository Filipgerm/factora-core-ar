"""Customer mapper."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_customer(d: dict[str, Any]) -> dict[str, Any]:
    addr = d.get("address")
    return {
        "email": d.get("email"),
        "name": d.get("name"),
        "phone": d.get("phone"),
        "description": d.get("description"),
        "balance": d.get("balance"),
        "currency": d.get("currency"),
        "delinquent": d.get("delinquent"),
        "invoice_prefix": d.get("invoice_prefix"),
        "tax_exempt": d.get("tax_exempt"),
        "default_source": source_id(d.get("default_source")),
        "address": addr if isinstance(addr, dict) else None,
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
