"""Product mapper."""
from __future__ import annotations

from typing import Any

from packages.stripe.mappers.common import source_id, ts_from_epoch


def map_product(d: dict[str, Any]) -> dict[str, Any]:
    imgs = d.get("images")
    return {
        "name": d.get("name"),
        "active": d.get("active"),
        "description": d.get("description"),
        "default_price_id": source_id(d.get("default_price")),
        "images": imgs if isinstance(imgs, list) else None,
        "stripe_created": ts_from_epoch(d.get("created")),
        "stripe_metadata": d.get("metadata") if isinstance(d.get("metadata"), dict) else None,
        "raw_stripe_object": d,
    }
