"""Structured logging for outbound HTTP events.

Every log record carries the same keys regardless of integration so ops
dashboards (Grafana/Datadog) can filter by ``integration`` and group by
``correlation_id`` (our id) paired with the remote service's request id.

The log messages are intentionally terse — the structured ``extra`` payload
is what downstream systems query on.
"""
from __future__ import annotations

import logging
import secrets
from typing import Any, Mapping

from packages._http.redact import redact_headers

logger = logging.getLogger("factora.outbound")


def new_correlation_id() -> str:
    """16-byte hex id suitable for tracing one outbound call across logs."""
    return secrets.token_hex(8)


def log_outbound_request(
    *,
    integration: str,
    method: str,
    url: str,
    correlation_id: str,
    headers: Mapping[str, str] | None = None,
    extra: Mapping[str, Any] | None = None,
) -> None:
    """Log the start of an outbound call.

    ``extra`` is merged into the log record's ``extra`` dict (compatible
    with ``python-json-logger``). The ``msg`` is a short, grep-friendly
    marker; analytics should key on ``integration`` + ``correlation_id``.
    """
    payload: dict[str, Any] = {
        "integration": integration,
        "direction": "outbound",
        "method": method.upper(),
        "url": url,
        "correlation_id": correlation_id,
        "headers": redact_headers(headers),
    }
    if extra:
        payload.update(extra)
    logger.info("outbound.request %s %s", method.upper(), url, extra=payload)


def log_outbound_response(
    *,
    integration: str,
    method: str,
    url: str,
    correlation_id: str,
    status: int,
    duration_ms: float,
    remote_request_id: str | None = None,
    attempt: int = 1,
    extra: Mapping[str, Any] | None = None,
) -> None:
    """Log the completion of an outbound call (success OR error)."""
    payload: dict[str, Any] = {
        "integration": integration,
        "direction": "outbound",
        "method": method.upper(),
        "url": url,
        "correlation_id": correlation_id,
        "status": status,
        "duration_ms": round(duration_ms, 2),
        "attempt": attempt,
    }
    if remote_request_id:
        payload["remote_request_id"] = remote_request_id
    if extra:
        payload.update(extra)
    level = logging.INFO if status < 400 else logging.WARNING
    logger.log(
        level,
        "outbound.response %s %s status=%d dur=%.1fms",
        method.upper(),
        url,
        status,
        duration_ms,
        extra=payload,
    )
