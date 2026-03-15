"""Demo-mode fixture injection for Factora.

How it works (following the Stripe / Plaid pattern):
  - When ``ENVIRONMENT=demo`` in the settings, all external API calls
    (AADE/myDATA, SaltEdge, GEMI, Brevo) return pre-canned JSON fixtures
    instead of making real HTTP requests.
  - Fixture data is loaded from ``core/demo_fixtures/*.json`` at import time
    so there is zero latency penalty.
  - A middleware adds the ``X-Demo-Mode: true`` response header so the frontend
    can display a "Demo Mode" banner and disable destructive actions.

Usage::

    from app.core.demo import demo_fixture

    class MyDataService:
        @demo_fixture("aade_documents")
        async def fetch_documents(self, ...):
            # This only runs when ENVIRONMENT != "demo"
            return await real_aade_client.get_docs(...)

The ``fixture_key`` must match a filename inside ``core/demo_fixtures/``
(without the ``.json`` extension).
"""
from __future__ import annotations

import json
import logging
from functools import wraps
from pathlib import Path
from typing import Any, Callable

from app.config import settings

logger = logging.getLogger(__name__)

_FIXTURES_DIR = Path(__file__).parent / "demo_fixtures"

# ---------------------------------------------------------------------------
# Load all fixtures at import time (one-time I/O, no per-request overhead)
# ---------------------------------------------------------------------------
_DEMO_FIXTURES: dict[str, Any] = {}

for _fixture_path in _FIXTURES_DIR.glob("*.json"):
    _key = _fixture_path.stem  # filename without extension
    try:
        with _fixture_path.open("r", encoding="utf-8") as _fh:
            _raw = json.load(_fh)
            # Strip the _comment meta-key so services receive clean data
            _DEMO_FIXTURES[_key] = {k: v for k, v in _raw.items() if k != "_comment"}
    except (json.JSONDecodeError, OSError) as exc:
        logger.error("Failed to load demo fixture %s: %s", _fixture_path, exc)


# ---------------------------------------------------------------------------
# Decorator
# ---------------------------------------------------------------------------


def demo_fixture(fixture_key: str) -> Callable:
    """Return static fixture data when ``ENVIRONMENT=demo``.

    When demo mode is inactive the original service method is called normally.

    Args:
        fixture_key: Key matching a filename in ``core/demo_fixtures/``
            (without the ``.json`` extension).

    Returns:
        A decorator that wraps the async service method.

    Raises:
        KeyError: At decoration time if ``fixture_key`` is not found in the
            loaded fixtures (catches misconfiguration early, not at runtime).

    Example::

        @demo_fixture("aade_documents")
        async def fetch_income_documents(self, query):
            return await self._aade_client.get_docs(query)
    """
    if fixture_key not in _DEMO_FIXTURES:
        raise KeyError(
            f"Demo fixture '{fixture_key}' not found. "
            f"Available fixtures: {list(_DEMO_FIXTURES)}"
        )

    def decorator(fn: Callable) -> Callable:
        @wraps(fn)
        async def wrapper(self: Any, *args: Any, **kwargs: Any) -> Any:
            if settings.demo_mode:
                logger.info(
                    "demo_fixture(%s): returning static fixture for %s",
                    fixture_key,
                    fn.__qualname__,
                )
                return _DEMO_FIXTURES[fixture_key]
            return await fn(self, *args, **kwargs)

        return wrapper

    return decorator


def get_demo_fixtures() -> dict[str, Any]:
    """Return all loaded demo fixtures (for testing or debugging).

    Returns:
        Dict mapping fixture key to parsed JSON data.
    """
    return dict(_DEMO_FIXTURES)
