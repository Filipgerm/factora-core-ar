"""Payout mapper."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_payout(d: dict[str, Any]) -> dict[str, Any]:
    destination = d.get("destination")
    return {
        "amount": int(d.get("amount", 0)),
        "currency": str(d.get("currency") or "eur").lower()[:3],
        "status": d.get("status"),
        "arrival_date": ts_from_epoch(d.get("arrival_date")),
        "automatic": d.get("automatic"),
        "balance_transaction_id": source_id(d.get("balance_transaction")),
        "destination": destination if isinstance(destination, str) else None,
        "failure_code": d.get("failure_code"),
        "failure_message": d.get("failure_message"),
        "method": d.get("method"),
        "stripe_type": d.get("type"),
        "statement_descriptor": d.get("statement_descriptor"),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
