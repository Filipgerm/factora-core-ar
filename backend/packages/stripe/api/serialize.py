"""Normalize Stripe SDK objects to plain dicts."""
from __future__ import annotations

from typing import Any


def stripe_object_to_dict(obj: Any) -> dict[str, Any]:
    """Normalize a StripeObject (or dict) to a plain dict."""
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    if hasattr(obj, "to_dict_recursive"):
        return obj.to_dict_recursive()
    if hasattr(obj, "to_dict"):
        return obj.to_dict()
    return dict(obj)
