"""TaxRate and Tax Transaction mappers.

``map_tax_transaction`` models the Stripe Tax API ``Tax.Transaction`` object —
one per calculated / committed tax document, keyed by ``ref_type`` + ``reference``
to the upstream invoice / payment intent / checkout session.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from packages.stripe.mappers.common import ts_from_epoch


def map_tax_rate(d: dict[str, Any]) -> dict[str, Any]:
    pct = d.get("percentage")
    return {
        "display_name": d.get("display_name"),
        "description": d.get("description"),
        "percentage": Decimal(str(pct)) if pct is not None else None,
        "inclusive": d.get("inclusive"),
        "active": d.get("active"),
        "jurisdiction": d.get("jurisdiction"),
        "tax_type": d.get("tax_type"),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }


def map_tax_transaction(d: dict[str, Any]) -> dict[str, Any]:
    """Stripe Tax API — ``Tax.Transaction`` resource mapper."""
    return {
        "transaction_type": d.get("type"),
        "reference": d.get("reference"),
        "currency": d.get("currency"),
        "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
        "customer_details": d.get("customer_details") if isinstance(d.get("customer_details"), dict) else None,
        "ship_from_details": d.get("ship_from_details") if isinstance(d.get("ship_from_details"), dict) else None,
        "tax_date": ts_from_epoch(d.get("tax_date")),
        "line_items": d.get("line_items") if isinstance(d.get("line_items"), (dict, list)) else None,
        "shipping_cost": d.get("shipping_cost") if isinstance(d.get("shipping_cost"), dict) else None,
        "posted_at": ts_from_epoch(d.get("posted_at")),
        "reversal": d.get("reversal") if isinstance(d.get("reversal"), dict) else None,
        "stripe_created": ts_from_epoch(d.get("created")),
        "livemode": d.get("livemode"),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
