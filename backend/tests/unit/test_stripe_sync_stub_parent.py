"""Stub-parent logic + org resolution in ``StripeSyncService``.

These tests protect two critical invariants of the Stripe mirror:

1. When an invoice event arrives before the referenced Price / Product /
   SubscriptionItem, the service inserts a minimal stub row so composite
   FKs hold. The stub must carry the correct ``organization_id`` and
   ``stripe_id``, and must not be inserted twice.
2. When org metadata is missing and the service is constructed in
   non-blocking mode (webhook hot-path), fallback Stripe HTTP calls are
   short-circuited (i.e. ``_org_from_charge_id`` returns ``None`` without
   hitting the network).
"""

from __future__ import annotations

import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.models.stripe_billing import (
    StripePrice,
    StripeProduct,
    StripeSubscriptionItem,
)
from app.services.stripe_sync_service import StripeSyncService


class _FakeSession:
    """Minimal stand-in for ``AsyncSession`` — enough for stub-parent checks."""

    def __init__(self, preloaded: dict[tuple[type, str, str], Any] | None = None) -> None:
        self.preloaded = preloaded or {}
        self.added: list[Any] = []

    def add(self, obj: Any) -> None:
        self.added.append(obj)

    async def execute(self, stmt: Any) -> Any:
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        return result


@pytest.mark.asyncio
async def test_ensure_stub_parent_inserts_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _FakeSession()
    svc = StripeSyncService(db, organization_id=str(uuid.uuid4()))

    async def _miss(*_args: Any, **_kwargs: Any) -> Any:
        return None

    monkeypatch.setattr(svc, "_load_row", _miss)

    org = svc._organization_id
    assert org is not None
    await svc._ensure_stub_parent(
        model=StripePrice,
        org=org,
        stripe_id="price_stub_1",
        defaults={
            "product_stripe_id": "prod_x",
            "currency": "eur",
            "unit_amount": 100,
            "raw_stripe_object": None,
        },
    )
    assert len(db.added) == 1
    row = db.added[0]
    assert isinstance(row, StripePrice)
    assert row.organization_id == org
    assert row.stripe_id == "price_stub_1"
    assert row.product_stripe_id == "prod_x"


@pytest.mark.asyncio
async def test_ensure_stub_parent_noop_when_existing(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _FakeSession()
    svc = StripeSyncService(db, organization_id=str(uuid.uuid4()))

    async def _hit(*_args: Any, **_kwargs: Any) -> Any:
        return MagicMock(spec=StripeProduct)

    monkeypatch.setattr(svc, "_load_row", _hit)
    await svc._ensure_stub_parent(
        model=StripeProduct,
        org=svc._organization_id or "org-1",
        stripe_id="prod_exists",
        defaults={"raw_stripe_object": None},
    )
    assert db.added == []


@pytest.mark.asyncio
async def test_ensure_stub_parent_ignores_empty_stripe_id(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _FakeSession()
    svc = StripeSyncService(db, organization_id="org-1")
    await svc._ensure_stub_parent(
        model=StripeSubscriptionItem,
        org="org-1",
        stripe_id=None,
        defaults={"raw_stripe_object": None},
    )
    assert db.added == []


# ---------------------------------------------------------------------------
# Non-blocking webhook mode: no Stripe HTTP calls allowed in _org_from_charge_id
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_org_from_charge_id_short_circuits_when_blocking_disabled() -> None:
    svc = StripeSyncService(
        _FakeSession(),
        organization_id=None,
        allow_blocking_stripe_calls=False,
    )
    assert await svc._org_from_charge_id("ch_any") is None


@pytest.mark.asyncio
async def test_resolve_org_balance_tx_respects_non_blocking_mode() -> None:
    """Webhook hot-path must not issue live Stripe retrieve calls."""
    svc = StripeSyncService(
        _FakeSession(),
        organization_id=None,
        allow_blocking_stripe_calls=False,
    )
    # metadata absent AND source is ch_* — blocking path would normally
    # try a Charge.retrieve. With blocking disabled it must return None.
    result = await svc._resolve_org_balance_tx(
        {"metadata": {}, "source": "ch_abc"}
    )
    assert result is None


@pytest.mark.asyncio
async def test_resolve_org_reads_metadata_fastpath() -> None:
    svc = StripeSyncService(
        _FakeSession(), organization_id=None, allow_blocking_stripe_calls=False
    )
    org = svc._resolve_org({"metadata": {"organization_id": "org-abc"}})
    assert org == "org-abc"


@pytest.mark.asyncio
async def test_resolve_org_bound_service_requires_match() -> None:
    """Bound service rejects events whose metadata.org != the instance org."""
    svc = StripeSyncService(_FakeSession(), organization_id="org-abc")
    assert (
        svc._resolve_org({"metadata": {"organization_id": "org-xyz"}}) is None
    )
    assert (
        svc._resolve_org({"metadata": {"organization_id": "org-abc"}})
        == "org-abc"
    )
