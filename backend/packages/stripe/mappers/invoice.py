"""Invoice + InvoiceLineItem mappers."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_invoice(d: dict[str, Any]) -> dict[str, Any]:
    return {
        "customer_stripe_id": d.get("customer") if isinstance(d.get("customer"), str) else None,
        "subscription_stripe_id": source_id(d.get("subscription")),
        "status": d.get("status"),
        "currency": d.get("currency"),
        "amount_due": d.get("amount_due"),
        "amount_paid": d.get("amount_paid"),
        "amount_remaining": d.get("amount_remaining"),
        "subtotal": d.get("subtotal"),
        "total": d.get("total"),
        "tax": d.get("tax"),
        "billing_reason": d.get("billing_reason"),
        "collection_method": d.get("collection_method"),
        "hosted_invoice_url": d.get("hosted_invoice_url"),
        "invoice_pdf": d.get("invoice_pdf"),
        "number": d.get("number"),
        "paid": d.get("paid"),
        "period_start": ts_from_epoch(d.get("period_start")),
        "period_end": ts_from_epoch(d.get("period_end")),
        "stripe_created": ts_from_epoch(d.get("created")),
        "due_date": ts_from_epoch(d.get("due_date")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }


def map_invoice_line_item(ld: dict[str, Any], *, invoice_stripe_id: str) -> dict[str, Any]:
    period = ld.get("period")
    pr_obj = ld.get("price")
    price_sid = source_id(pr_obj)
    product_sid = None
    if isinstance(pr_obj, dict):
        p = pr_obj.get("product")
        product_sid = p if isinstance(p, str) else source_id(p)
    return {
        "invoice_stripe_id": invoice_stripe_id,
        "amount": ld.get("amount"),
        "currency": ld.get("currency"),
        "description": ld.get("description"),
        "quantity": ld.get("quantity"),
        "price_stripe_id": price_sid,
        "product_stripe_id": product_sid,
        "unit_amount": ld.get("unit_amount"),
        "discountable": ld.get("discountable"),
        "stripe_type": ld.get("type"),
        "period": period if isinstance(period, dict) else None,
        "subscription_item_stripe_id": source_id(ld.get("subscription_item")),
        "stripe_metadata": ld.get("metadata") if isinstance(ld.get("metadata"), dict) else None,
        "raw_stripe_object": ld,
    }
