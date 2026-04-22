"""Shared outbound HTTP middleware for internal SDK packages.

**Scope**
    Cross-cutting primitives used by every ``packages/*`` SDK that makes
    outbound calls to a third party (HubSpot, Stripe, GEMI, SaltEdge, Brevo,
    etc.). Keeps observability, retry policy, and header redaction consistent
    across integrations.

**Contract**
    * Import-only from the standard library (no ``httpx``, no ``stripe``, no
      ``app.*``) — every SDK decides which transport to apply these helpers to.
    * Packages convention still applies: must NEVER import from ``app.*``.

**What ships here**
    * :func:`redact_headers` — redact Authorization / Cookie / signing headers
      before logging so tokens never land in stdout.
    * :func:`log_outbound_request` / :func:`log_outbound_response` — structured
      log events keyed by ``integration`` + ``correlation_id``.
    * :func:`retry_async` — exponential-backoff async retry with ``Retry-After``
      header support. Returns ``None`` to signal "give up" so the caller can
      raise its own error type.
    * :class:`OutboundError` — hierarchy root for transport-level failures.
"""

from packages._http.logging import (
    log_outbound_request,
    log_outbound_response,
    new_correlation_id,
)
from packages._http.redact import redact_headers
from packages._http.retry import OutboundError, RetryDecision, retry_async

__all__ = [
    "OutboundError",
    "RetryDecision",
    "log_outbound_request",
    "log_outbound_response",
    "new_correlation_id",
    "redact_headers",
    "retry_async",
]
