"""HubSpot webhook signature verification (v3 HMAC-SHA256).

HubSpot signs every webhook POST with a ``X-HubSpot-Signature-v3`` header.
The signature is a base64-encoded HMAC-SHA256 of the concatenation:

    <method>\n<uri>\n<raw_body>\n<timestamp>

where the timestamp comes from ``X-HubSpot-Request-Timestamp`` and is
validated against a 5-minute replay window.

Ref: https://developers.hubspot.com/docs/api/webhooks/validating-requests
"""
from __future__ import annotations

import base64
import hmac
import json
import time
from hashlib import sha256
from typing import Any, Iterable

from packages.hubspot.models.common import HubspotWebhookEvent


class HubspotSignatureError(Exception):
    """Raised when signature verification fails — callers map to 401."""


_DEFAULT_REPLAY_WINDOW_SECONDS = 300  # 5 minutes (HubSpot recommendation).


def verify_webhook_signature(
    *,
    app_secret: str,
    method: str,
    request_url: str,
    raw_body: bytes | str,
    timestamp_header: str | None,
    signature_header: str | None,
    max_replay_seconds: int = _DEFAULT_REPLAY_WINDOW_SECONDS,
    _now_ms: int | None = None,
) -> None:
    """Verify a HubSpot v3 signature. Raises :class:`HubspotSignatureError` on failure.

    Parameters
    ----------
    app_secret:
        The developer app's client secret (never the portal's access
        token). Found in the HubSpot developer dashboard.
    method, request_url:
        Uppercase HTTP method + the full request URL seen by the
        webhook endpoint (scheme, host, path, query). Must exactly match
        what HubSpot signed — use the URL the platform delivered to
        (e.g. read ``X-Forwarded-*`` behind a proxy).
    raw_body:
        The request body bytes as received (NOT re-serialized JSON —
        whitespace differences break verification).
    timestamp_header, signature_header:
        Values of ``X-HubSpot-Request-Timestamp`` and
        ``X-HubSpot-Signature-v3`` respectively.
    max_replay_seconds:
        Reject requests older than this many seconds.
    """
    if not app_secret:
        raise HubspotSignatureError("HubSpot app secret not configured.")
    if not timestamp_header or not signature_header:
        raise HubspotSignatureError("Missing HubSpot signature headers.")

    try:
        request_ts = int(timestamp_header)
    except (TypeError, ValueError) as exc:
        raise HubspotSignatureError("Invalid timestamp header.") from exc

    now_ms = _now_ms if _now_ms is not None else int(time.time() * 1000)
    if abs(now_ms - request_ts) > max_replay_seconds * 1000:
        raise HubspotSignatureError("Signature timestamp outside replay window.")

    if isinstance(raw_body, str):
        raw_body = raw_body.encode("utf-8")

    message = b"%s\n%s\n%s\n%s" % (
        method.upper().encode("ascii"),
        request_url.encode("utf-8"),
        raw_body,
        str(request_ts).encode("ascii"),
    )
    mac = hmac.new(app_secret.encode("utf-8"), message, sha256).digest()
    expected = base64.b64encode(mac).decode("ascii")

    if not hmac.compare_digest(expected, signature_header):
        raise HubspotSignatureError("HubSpot signature mismatch.")


def parse_webhook_event(raw_body: bytes | str) -> Iterable[HubspotWebhookEvent]:
    """Decode a HubSpot webhook batch (JSON array) into typed events."""
    if isinstance(raw_body, bytes):
        raw_body = raw_body.decode("utf-8")
    try:
        payload: Any = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HubspotSignatureError("Invalid JSON in webhook body.") from exc
    if not isinstance(payload, list):
        raise HubspotSignatureError("Expected JSON array from HubSpot webhook.")
    return [HubspotWebhookEvent.model_validate(ev) for ev in payload]
