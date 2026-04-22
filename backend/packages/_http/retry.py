"""Async retry helper with Retry-After support.

Rationale
---------
``stamina`` / ``tenacity`` both work, but for outbound third-party calls we
need three very specific behaviours that their defaults don't give us:

1. **Retry-After respect.** When HubSpot returns 429 with ``Retry-After: 3``,
   we must wait exactly ~3 s, not our local exponential schedule. Stripe's
   SDK already does this internally; this helper gives the HTTP-based
   integrations the same property.
2. **Per-attempt hooks** so callers can refresh an expired OAuth token
   between attempts (e.g. auto-refresh on first 401) without rebuilding the
   whole retry loop.
3. **Zero external deps.** Packages sit at the bottom of the import graph —
   adding transitive deps here would cascade across every integration.

The helper is < 60 lines because "retry with backoff" does not need a
dependency. The API is deliberately explicit (caller provides the decision
function) so it's impossible to accidentally retry on a non-idempotent 500.
"""
from __future__ import annotations

import asyncio
import dataclasses
import logging
import random
from typing import Any, Awaitable, Callable

logger = logging.getLogger("factora.outbound.retry")


class OutboundError(Exception):
    """Root for transport-level failures surfaced by SDK packages.

    SDKs subclass this (e.g. ``HubspotError``) so callers catch by
    integration when they need to but can catch the base for generic
    "third-party down" handling.
    """


@dataclasses.dataclass(frozen=True)
class RetryDecision:
    """Result of a per-attempt retry decision.

    Attributes
    ----------
    retry:
        Whether to retry at all.
    retry_after_s:
        Server-requested wait in seconds (from ``Retry-After`` header) —
        overrides local backoff when set. ``None`` means "use local
        exponential backoff".
    on_retry:
        Optional async hook called *before* the next attempt. Use for
        OAuth token refresh etc. Raising from the hook aborts the retry
        loop — the original exception bubbles.
    """

    retry: bool
    retry_after_s: float | None = None
    on_retry: Callable[[], Awaitable[None]] | None = None


async def retry_async(
    operation: Callable[[int], Awaitable[Any]],
    *,
    decide: Callable[[Any, BaseException | None, int], RetryDecision],
    max_attempts: int = 4,
    base_delay_s: float = 0.5,
    max_delay_s: float = 30.0,
    jitter: bool = True,
) -> Any:
    """Run ``operation(attempt)`` with retry per ``decide``.

    ``operation`` receives the 1-based attempt number and returns the
    final value. When it raises, or when ``decide`` says so, this helper
    retries up to ``max_attempts`` times using exponential backoff unless
    the server asked us to wait a specific time via ``retry_after_s``.

    ``decide`` is called with ``(result, exc, attempt)`` — exactly one of
    ``result`` / ``exc`` is non-None. Return ``RetryDecision(retry=False)``
    to accept the current result/raise. Return ``retry=True`` to loop.

    Raises whatever ``operation`` raised on the final attempt.
    """
    last_exc: BaseException | None = None
    for attempt in range(1, max_attempts + 1):
        result: Any = None
        exc: BaseException | None = None
        try:
            result = await operation(attempt)
        except BaseException as caught:  # noqa: BLE001 — re-raised below
            exc = caught
            last_exc = caught
        decision = decide(result, exc, attempt)
        if not decision.retry or attempt == max_attempts:
            if exc is not None:
                raise exc
            return result
        delay = _next_delay(
            attempt=attempt,
            base=base_delay_s,
            cap=max_delay_s,
            retry_after=decision.retry_after_s,
            jitter=jitter,
        )
        logger.info(
            "outbound.retry attempt=%d next_in=%.2fs reason=%s",
            attempt,
            delay,
            "retry-after" if decision.retry_after_s is not None else "backoff",
            extra={"attempt": attempt, "delay_s": delay},
        )
        if decision.on_retry is not None:
            await decision.on_retry()
        await asyncio.sleep(delay)
    if last_exc is not None:
        raise last_exc
    return None


def _next_delay(
    *,
    attempt: int,
    base: float,
    cap: float,
    retry_after: float | None,
    jitter: bool,
) -> float:
    if retry_after is not None and retry_after >= 0:
        return min(retry_after, cap)
    # Exponential backoff: base * 2^(attempt-1), capped.
    raw = base * (2 ** (attempt - 1))
    raw = min(raw, cap)
    if jitter:
        raw = raw * (0.5 + random.random() * 0.5)  # 50-100% of raw
    return raw


def parse_retry_after(value: str | None) -> float | None:
    """Parse a ``Retry-After`` header value (seconds or HTTP-date).

    HubSpot always returns seconds; Stripe does the same when it 429s.
    Returns ``None`` for unparseable input (falls back to local backoff).
    """
    if not value:
        return None
    stripped = value.strip()
    try:
        return float(stripped)
    except ValueError:
        # HTTP-date form is rare enough for APIs we talk to that we
        # don't bother parsing it; treating it as "unknown → local
        # backoff" is safer than getting the tz wrong.
        return None
