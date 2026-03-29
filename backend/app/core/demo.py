"""Demo-mode fixtures for Factora.

When ``ENVIRONMENT=demo`` (``settings.demo_mode``):

  - **Business data** (dashboard, counterparties, banking rows, etc.) is read from
    PostgreSQL. Populate demo databases with ``scripts/seed_demo_db.py`` (creates a
    demo password user tied to the seeded org — see that script's docstring for login).
  - **External HTTP clients** (AADE/myDATA, SaltEdge, GEMI) return pre-canned JSON
    from ``core/demo_fixtures/*.json`` instead of calling the real APIs.
  - **Agents** may still use ``@demo_fixture`` so ``ainvoke`` returns static JSON
    from ``core/demo_fixtures/agents/`` without LLM calls (see ``app/agents/CLAUDE.md``).
  - **Notifications** (Brevo) are suppressed in ``NotificationService`` when demo.

Fixture files are loaded from ``core/demo_fixtures/*.json`` at import time.

``fixture_key`` for ``get_demo_payload`` / ``demo_fixture`` must match a filename
stem under ``core/demo_fixtures/`` (without ``.json``).
"""
from __future__ import annotations

import json
import logging
from functools import wraps
from pathlib import Path
from typing import Any, Callable, TypeVar

from pydantic import BaseModel

from app.config import settings

from app.core.demo_constants import DEMO_SALTEDGE_CUSTOMER_ID

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
            if isinstance(_raw, list):
                _DEMO_FIXTURES[_key] = _raw
            elif isinstance(_raw, dict):
                # Strip the _comment meta-key so services receive clean data
                _DEMO_FIXTURES[_key] = {
                    k: v for k, v in _raw.items() if k != "_comment"
                }
            else:
                _DEMO_FIXTURES[_key] = _raw
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


def get_demo_payload(fixture_key: str) -> Any:
    """Return parsed fixture data for ``fixture_key`` (filename stem without ``.json``).

    Raises:
        KeyError: If the fixture was not loaded.
    """
    if fixture_key not in _DEMO_FIXTURES:
        raise KeyError(
            f"Demo fixture '{fixture_key}' not found. "
            f"Available: {sorted(_DEMO_FIXTURES)}"
        )
    return _DEMO_FIXTURES[fixture_key]


def is_demo_saltedge_customer_id(customer_id: str) -> bool:
    """True when ``customer_id`` is the canonical demo Open Banking customer."""
    return customer_id == DEMO_SALTEDGE_CUSTOMER_ID


T = TypeVar("T", bound=BaseModel)


def demo_model_validate(fixture_key: str, model: type[T], *, root_key: str | None = None) -> T:
    """Load fixture ``fixture_key`` and validate with ``model``.

    If ``root_key`` is set, validate ``payload[root_key]`` instead of the whole dict
    (e.g. nested list under ``counterparties``).
    """
    payload = get_demo_payload(fixture_key)
    if root_key is not None:
        payload = payload[root_key]
    return model.model_validate(payload)


def get_demo_dashboard_transactions() -> list[dict[str, Any]]:
    """Return transaction dicts for dashboard history demo."""
    blob = get_demo_payload("dashboard_transactions")
    if not isinstance(blob, dict):
        raise TypeError("dashboard_transactions fixture must be a JSON object")
    rows = blob.get("transactions")
    if not isinstance(rows, list):
        raise TypeError("dashboard_transactions.transactions must be a list")
    return rows
