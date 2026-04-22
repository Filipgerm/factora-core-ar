"""Shared Stripe mapper helpers: epoch → datetime, nested-id extraction, metadata lookup.

Pure functions. No DB, no app imports.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from packages.stripe.api.serialize import stripe_object_to_dict

ORG_META = "organization_id"


def ts_from_epoch(sec: int | float | None) -> datetime | None:
    """Convert a Stripe epoch-seconds timestamp to a timezone-aware ``datetime``."""
    if sec is None:
        return None
    return datetime.fromtimestamp(int(sec), tz=timezone.utc)


def source_id(src: Any) -> str | None:
    """Stripe fields are commonly ``{"id": "..."}`` or a bare ``str`` — unify to id."""
    if isinstance(src, dict):
        raw = src.get("id")
        return raw if isinstance(raw, str) else None
    if isinstance(src, str):
        return src
    return None


def as_dict(obj: Any) -> dict[str, Any]:
    """Normalize a StripeObject (or dict) to a plain dict."""
    return obj if isinstance(obj, dict) else stripe_object_to_dict(obj)


def metadata_org(obj: dict[str, Any]) -> str | None:
    """Pull ``metadata.organization_id`` off a Stripe object dict, if present."""
    md = obj.get("metadata")
    if not isinstance(md, dict):
        return None
    v = md.get(ORG_META)
    if isinstance(v, str) and v.strip():
        return v.strip()
    return None
