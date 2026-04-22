"""Subscription, SubscriptionItem, and SubscriptionSchedule mappers."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_subscription(d: dict[str, Any]) -> dict[str, Any]:
    items = d.get("items")
    items_data = items if isinstance(items, (dict, list)) else None
    return {
        "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
        "status": d.get("status"),
        "current_period_start": ts_from_epoch(d.get("current_period_start")),
        "current_period_end": ts_from_epoch(d.get("current_period_end")),
        "cancel_at_period_end": d.get("cancel_at_period_end"),
        "canceled_at": ts_from_epoch(d.get("canceled_at")),
        "collection_method": d.get("collection_method"),
        "default_payment_method": source_id(d.get("default_payment_method")),
        "items_data": items_data,
        "schedule_stripe_id": source_id(d.get("schedule")),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }


def map_subscription_item(
    d: dict[str, Any], *, subscription_stripe_id: str
) -> dict[str, Any]:
    """One row per ``SubscriptionItem`` — the atom of a subscription's pricing."""
    price_obj = d.get("price")
    price_sid = source_id(price_obj)
    product_sid = None
    if isinstance(price_obj, dict):
        p = price_obj.get("product")
        product_sid = p if isinstance(p, str) else source_id(p)
    return {
        "subscription_stripe_id": subscription_stripe_id,
        "price_stripe_id": price_sid,
        "product_stripe_id": product_sid,
        "quantity": d.get("quantity"),
        "billing_thresholds": d.get("billing_thresholds") if isinstance(d.get("billing_thresholds"), dict) else None,
        "tax_rates": d.get("tax_rates") if isinstance(d.get("tax_rates"), list) else None,
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }


def map_subscription_schedule(d: dict[str, Any]) -> dict[str, Any]:
    """``SubscriptionSchedule`` — multi-phase contracts with future transitions.

    Storing ``phases`` as JSONB gives revrec the full timeline for contract
    modification accounting without a second hop to Stripe.
    """
    return {
        "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
        "subscription_stripe_id": source_id(d.get("subscription")),
        "status": d.get("status"),
        "current_phase": d.get("current_phase") if isinstance(d.get("current_phase"), dict) else None,
        "phases": d.get("phases") if isinstance(d.get("phases"), list) else None,
        "end_behavior": d.get("end_behavior"),
        "canceled_at": ts_from_epoch(d.get("canceled_at")),
        "completed_at": ts_from_epoch(d.get("completed_at")),
        "released_at": ts_from_epoch(d.get("released_at")),
        "released_subscription_id": d.get("released_subscription"),
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
