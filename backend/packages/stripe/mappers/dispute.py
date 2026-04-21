"""Dispute mapper."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_dispute(d: dict[str, Any]) -> dict[str, Any]:
    return {
        "amount": d.get("amount"),
        "currency": d.get("currency"),
        "charge_stripe_id": source_id(d.get("charge")),
        "status": d.get("status"),
        "reason": d.get("reason"),
        "evidence_due_by": ts_from_epoch(d.get("evidence_due_by")),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
