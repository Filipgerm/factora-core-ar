"""Treasury resource mappers: BalanceTransaction, Payout."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_balance_transaction(d: dict[str, Any]) -> dict[str, Any]:
    return {
        "amount": int(d.get("amount", 0)),
        "currency": str(d.get("currency") or "eur").lower()[:3],
        "description": d.get("description"),
        "fee": int(d.get("fee") or 0),
        "net": int(d.get("net", 0)),
        "status": d.get("status"),
        "type": d.get("type"),
        "reporting_category": d.get("reporting_category"),
        "source": source_id(d.get("source")),
        "stripe_created": ts_from_epoch(d.get("created")),
        "available_on": ts_from_epoch(d.get("available_on")),
        "exchange_rate": d.get("exchange_rate"),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
