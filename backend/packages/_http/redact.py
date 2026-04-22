"""Header redaction for outbound log events.

Never log Authorization / Cookie / signing secrets. The set below covers
every integration we ship today — add new secret-bearing headers here
before rolling out a new integration.
"""
from __future__ import annotations

from typing import Mapping

_SECRET_HEADER_NAMES: frozenset[str] = frozenset(
    {
        "authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "x-hubspot-signature",
        "x-hubspot-signature-v3",
        "stripe-signature",
        "proxy-authorization",
    }
)

_REDACTED = "[REDACTED]"


def redact_headers(headers: Mapping[str, str] | None) -> dict[str, str]:
    """Return a shallow copy of ``headers`` with secret values replaced.

    Lookups are case-insensitive. Missing/empty input returns ``{}``.
    """
    if not headers:
        return {}
    out: dict[str, str] = {}
    for k, v in headers.items():
        if k.lower() in _SECRET_HEADER_NAMES:
            out[k] = _REDACTED
        else:
            out[k] = v
    return out
