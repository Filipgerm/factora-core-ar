"""packages/_http shared outbound middleware.

Covers:
* ``redact_headers`` — redacts every known secret header, case-insensitive.
* ``retry_async`` — retries on ``decide(retry=True)``, respects
  ``retry_after_s``, surfaces the last exception on giveup, honours
  ``max_attempts``, and runs the ``on_retry`` hook between attempts.
* ``parse_retry_after`` — numeric seconds path.
"""
from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest

from packages._http import redact_headers, retry_async
from packages._http.retry import RetryDecision, parse_retry_after


# ---------------------------------------------------------------------------
# redact_headers
# ---------------------------------------------------------------------------


def test_redact_strips_authorization_and_signing_headers() -> None:
    h = {
        "Authorization": "Bearer secret",
        "Cookie": "sid=abc",
        "X-HubSpot-Signature-V3": "sig",
        "Stripe-Signature": "sig",
        "X-Request-Id": "rid-1",
        "Content-Type": "application/json",
    }
    out = redact_headers(h)
    assert out["Authorization"] == "[REDACTED]"
    assert out["Cookie"] == "[REDACTED]"
    assert out["X-HubSpot-Signature-V3"] == "[REDACTED]"
    assert out["Stripe-Signature"] == "[REDACTED]"
    assert out["X-Request-Id"] == "rid-1"
    assert out["Content-Type"] == "application/json"


def test_redact_empty_input() -> None:
    assert redact_headers(None) == {}
    assert redact_headers({}) == {}


# ---------------------------------------------------------------------------
# parse_retry_after
# ---------------------------------------------------------------------------


def test_parse_retry_after_numeric_seconds() -> None:
    assert parse_retry_after("3") == 3.0
    assert parse_retry_after(" 0.5 ") == 0.5


def test_parse_retry_after_unparseable_returns_none() -> None:
    # HTTP-date form — not supported, intentionally falls back to local.
    assert parse_retry_after("Wed, 21 Oct 2026 07:28:00 GMT") is None
    assert parse_retry_after(None) is None
    assert parse_retry_after("") is None


# ---------------------------------------------------------------------------
# retry_async
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_retry_async_returns_immediately_on_success() -> None:
    calls = 0

    async def op(attempt: int) -> str:
        nonlocal calls
        calls = attempt
        return "ok"

    result = await retry_async(op, decide=lambda *a: RetryDecision(retry=False))
    assert result == "ok"
    assert calls == 1


@pytest.mark.asyncio
async def test_retry_async_retries_then_succeeds() -> None:
    attempts: list[int] = []

    async def op(attempt: int) -> str:
        attempts.append(attempt)
        if attempt < 2:
            raise RuntimeError("transient")
        return "ok"

    def decide(_res: Any, exc: BaseException | None, _a: int) -> RetryDecision:
        return RetryDecision(retry=exc is not None)

    result = await retry_async(
        op, decide=decide, base_delay_s=0.01, jitter=False, max_attempts=3
    )
    assert result == "ok"
    assert attempts == [1, 2]


@pytest.mark.asyncio
async def test_retry_async_respects_retry_after(monkeypatch: Any) -> None:
    sleeps: list[float] = []

    async def fake_sleep(d: float) -> None:
        sleeps.append(d)

    monkeypatch.setattr("packages._http.retry.asyncio.sleep", fake_sleep)

    calls = 0

    async def op(_a: int) -> str:
        nonlocal calls
        calls += 1
        if calls == 1:
            raise RuntimeError("429")
        return "ok"

    def decide(_res: Any, exc: BaseException | None, _a: int) -> RetryDecision:
        return RetryDecision(retry=exc is not None, retry_after_s=2.5)

    result = await retry_async(op, decide=decide, base_delay_s=0.01, jitter=False)
    assert result == "ok"
    # Only one sleep (between attempt 1 and 2) and it matches Retry-After.
    assert sleeps == [2.5]


@pytest.mark.asyncio
async def test_retry_async_surfaces_last_exception_on_giveup() -> None:
    async def op(_a: int) -> Any:
        raise RuntimeError("persistent")

    def decide(_res: Any, exc: BaseException | None, _a: int) -> RetryDecision:
        return RetryDecision(retry=exc is not None)

    with pytest.raises(RuntimeError, match="persistent"):
        await retry_async(op, decide=decide, max_attempts=2, base_delay_s=0.001)


@pytest.mark.asyncio
async def test_retry_async_runs_on_retry_hook(monkeypatch: Any) -> None:
    async def fake_sleep(_d: float) -> None:
        return None

    monkeypatch.setattr("packages._http.retry.asyncio.sleep", fake_sleep)

    hook = AsyncMock()
    attempts = 0

    async def op(_a: int) -> str:
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("need refresh")
        return "ok"

    def decide(_res: Any, exc: BaseException | None, _a: int) -> RetryDecision:
        return RetryDecision(retry=exc is not None, on_retry=hook)

    result = await retry_async(op, decide=decide, base_delay_s=0.001, jitter=False)
    assert result == "ok"
    hook.assert_awaited_once()


@pytest.mark.asyncio
async def test_retry_async_stops_when_decide_returns_false() -> None:
    async def op(_a: int) -> str:
        return "final"

    def decide(_res: Any, _exc: BaseException | None, _a: int) -> RetryDecision:
        return RetryDecision(retry=False)

    result = await retry_async(op, decide=decide)
    assert result == "final"
