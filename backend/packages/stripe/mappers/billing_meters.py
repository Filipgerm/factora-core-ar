"""Billing Meter + MeterEventSummary mappers.

Stripe Billing Meters track usage deltas per customer per meter. Each
``MeterEvent`` is ingested by Stripe and aggregated. We mirror the meter
definition and the per-customer summaries; individual ``meter_event`` items
are too granular to store in Postgres and should be read from Stripe when
an auditor drills in.
"""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import ts_from_epoch


def map_billing_meter(d: dict[str, Any]) -> dict[str, Any]:
    """Stripe ``billing.Meter`` — a usage event definition (e.g. ``api_requests``)."""
    return {
        "display_name": d.get("display_name"),
        "event_name": d.get("event_name"),
        "event_time_window": d.get("event_time_window"),
        "status": d.get("status"),
        "customer_mapping": d.get("customer_mapping") if isinstance(d.get("customer_mapping"), dict) else None,
        "default_aggregation": d.get("default_aggregation") if isinstance(d.get("default_aggregation"), dict) else None,
        "value_settings": d.get("value_settings") if isinstance(d.get("value_settings"), dict) else None,
        "status_transitions": d.get("status_transitions") if isinstance(d.get("status_transitions"), dict) else None,
        "stripe_created": ts_from_epoch(d.get("created")),
        "livemode": d.get("livemode"),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }


def map_billing_meter_event_summary(
    d: dict[str, Any], *, meter_stripe_id: str, customer_stripe_id: str
) -> dict[str, Any]:
    """``billing.MeterEventSummary`` — aggregated usage per customer per window."""
    return {
        "meter_stripe_id": meter_stripe_id,
        "customer_stripe_id": customer_stripe_id,
        "aggregated_value": float(d.get("aggregated_value")) if d.get("aggregated_value") is not None else None,
        "start_time": ts_from_epoch(d.get("start_time")),
        "end_time": ts_from_epoch(d.get("end_time")),
        "livemode": d.get("livemode"),
        "raw_stripe_object": d,
    }
