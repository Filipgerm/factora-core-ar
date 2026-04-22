"""Tests for ContractBootstrapperService — Stripe subscription → Contract + POs.

Covers the pure helpers (enum/currency/kind mapping), the engine-agnostic
``upsert_from_seed`` write path, and the end-to-end ``from_stripe_subscription``
orchestration. Uses stubbed ``AsyncSession`` and ``SimpleNamespace`` fixtures
so tests run without a database.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.models.contracts import (
    BillingSystem,
    ContractSource,
    ContractStatus,
    PerformanceObligationKind,
)
from app.services.contract_bootstrapper_service import (
    ContractBootstrapperService,
    ContractSeed,
    PoSeed,
    _contract_name_from_sub,
    _contract_status_from_stripe,
    _meter_ref_from_price,
    _po_kind_from_stripe_price,
    _po_name_from_product,
    _to_date,
)


# ----- Pure helpers --------------------------------------------------------


def test_contract_status_from_stripe_maps_all_buckets() -> None:
    assert _contract_status_from_stripe("active") == ContractStatus.ACTIVE
    assert _contract_status_from_stripe("trialing") == ContractStatus.ACTIVE
    assert _contract_status_from_stripe("past_due") == ContractStatus.ACTIVE
    assert _contract_status_from_stripe("paused") == ContractStatus.PAUSED
    assert _contract_status_from_stripe("canceled") == ContractStatus.CANCELED
    assert _contract_status_from_stripe("incomplete") == ContractStatus.DRAFT
    assert _contract_status_from_stripe("incomplete_expired") == ContractStatus.TERMINATED
    assert _contract_status_from_stripe(None) == ContractStatus.DRAFT
    assert _contract_status_from_stripe("unknown") == ContractStatus.DRAFT


def test_to_date_handles_naive_and_aware() -> None:
    aware = datetime(2026, 4, 1, 12, 30, tzinfo=timezone.utc)
    naive = datetime(2026, 4, 1, 12, 30)
    assert _to_date(aware) == date(2026, 4, 1)
    assert _to_date(naive) == date(2026, 4, 1)
    assert _to_date(None) is None


def test_po_kind_from_stripe_price_routes_by_recurring() -> None:
    metered = SimpleNamespace(recurring={"usage_type": "metered"}, stripe_type="recurring")
    licensed = SimpleNamespace(recurring={"usage_type": "licensed"}, stripe_type="recurring")
    one_off = SimpleNamespace(recurring=None, stripe_type="one_time")
    assert _po_kind_from_stripe_price(metered) == PerformanceObligationKind.OVER_TIME_USAGE_BASED
    assert _po_kind_from_stripe_price(licensed) == PerformanceObligationKind.OVER_TIME_STRAIGHT_LINE
    assert _po_kind_from_stripe_price(one_off) == PerformanceObligationKind.POINT_IN_TIME
    assert _po_kind_from_stripe_price(None) == PerformanceObligationKind.POINT_IN_TIME


def test_po_name_prefers_product_name() -> None:
    product = SimpleNamespace(name="Pro Tier")
    price = SimpleNamespace(stripe_id="price_123")
    assert _po_name_from_product(product, price, "si_1") == "Pro Tier"
    assert _po_name_from_product(None, price, "si_1") == "Price price_123"
    assert _po_name_from_product(None, None, "si_1") == "Subscription item si_1"


def test_contract_name_truncates_and_uses_sub_id() -> None:
    sub = SimpleNamespace(stripe_id="sub_abc")
    item = SimpleNamespace(stripe_id="si_1")
    assert _contract_name_from_sub(sub, [item]) == "Stripe subscription sub_abc"


def test_meter_ref_extracts_meter_from_recurring() -> None:
    price = SimpleNamespace(recurring={"meter": "mtr_123"})
    assert _meter_ref_from_price(price) == "mtr_123"
    assert _meter_ref_from_price(SimpleNamespace(recurring={})) is None
    assert _meter_ref_from_price(None) is None


# ----- upsert_from_seed (engine-agnostic write path) ----------------------


@pytest.mark.asyncio
async def test_upsert_from_seed_creates_new_contract_and_po() -> None:
    """New seed → new Contract + one PO, ATPs summed onto the contract."""
    db = MagicMock()
    db.scalar = AsyncMock(return_value=None)  # nothing exists
    db.flush = AsyncMock()
    db.add = MagicMock()

    service = ContractBootstrapperService(db)
    seed = ContractSeed(
        organization_id="org-1",
        name="Contract X",
        billing_system=BillingSystem.HUBSPOT,
        billing_contract_ref="deal_123",
        source=ContractSource.HUBSPOT_DEAL,
        status=ContractStatus.ACTIVE,
        currency="EUR",
        performance_obligations=[
            PoSeed(
                name="Line 1",
                kind=PerformanceObligationKind.OVER_TIME_STRAIGHT_LINE,
                currency="EUR",
                standalone_selling_price=Decimal("120.00"),
                allocated_transaction_price=Decimal("120.00"),
                billing_system=BillingSystem.HUBSPOT,
                billing_item_ref="line_1",
            ),
            PoSeed(
                name="Line 2",
                kind=PerformanceObligationKind.POINT_IN_TIME,
                currency="EUR",
                standalone_selling_price=Decimal("30.00"),
                allocated_transaction_price=Decimal("30.00"),
                billing_system=BillingSystem.HUBSPOT,
                billing_item_ref="line_2",
            ),
        ],
    )

    contract = await service.upsert_from_seed(seed)

    assert contract.billing_contract_ref == "deal_123"
    assert contract.billing_system == BillingSystem.HUBSPOT
    assert contract.status == ContractStatus.ACTIVE
    assert contract.total_transaction_price == Decimal("150.00")
    assert contract.allocation_variance == Decimal("0")
    # 1 contract add + 2 POs adds
    assert db.add.call_count == 3
    db.flush.assert_awaited()


@pytest.mark.asyncio
async def test_upsert_from_seed_is_idempotent_for_existing_contract() -> None:
    """Second call with the same billing_contract_ref updates in place."""
    existing = SimpleNamespace(
        id="contract-uuid-1",
        organization_id="org-1",
        name="old",
        status=ContractStatus.DRAFT,
        counterparty_id=None,
        billing_account_ref=None,
        currency="EUR",
        service_start_date=None,
        service_end_date=None,
        effective_at=None,
        terminated_at=None,
        billing_frequency=None,
        auto_renew=False,
        extra={"old": True},
        total_transaction_price=Decimal("0"),
        allocation_variance=Decimal("0"),
    )
    # First scalar call: load existing contract.
    # Second scalar call (for PO existing lookup): return None (new PO).
    db = MagicMock()
    db.scalar = AsyncMock(side_effect=[existing, None])
    db.flush = AsyncMock()
    db.add = MagicMock()

    service = ContractBootstrapperService(db)
    seed = ContractSeed(
        organization_id="org-1",
        name="new name",
        billing_system=BillingSystem.STRIPE,
        billing_contract_ref="sub_1",
        source=ContractSource.STRIPE_SUBSCRIPTION,
        status=ContractStatus.ACTIVE,
        currency="USD",
        extra={"new": True},
        performance_obligations=[
            PoSeed(
                name="Item 1",
                kind=PerformanceObligationKind.OVER_TIME_STRAIGHT_LINE,
                currency="USD",
                standalone_selling_price=Decimal("99.00"),
                allocated_transaction_price=Decimal("99.00"),
                billing_system=BillingSystem.STRIPE,
                billing_item_ref="si_1",
            )
        ],
    )

    contract = await service.upsert_from_seed(seed)

    assert contract is existing
    assert contract.name == "new name"
    assert contract.status == ContractStatus.ACTIVE
    assert contract.currency == "USD"
    assert contract.extra == {"old": True, "new": True}
    assert contract.total_transaction_price == Decimal("99.00")
    # No contract add — only 1 PO add.
    db.add.assert_called_once()


# ----- from_stripe_subscription (orchestration) ---------------------------


@pytest.mark.asyncio
async def test_from_stripe_subscription_no_subscription_returns_none() -> None:
    db = MagicMock()
    db.scalar = AsyncMock(return_value=None)
    service = ContractBootstrapperService(db)
    result = await service.from_stripe_subscription(
        organization_id="org-1", stripe_subscription_id="sub_404"
    )
    assert result is None


@pytest.mark.asyncio
async def test_from_stripe_subscription_no_items_returns_none() -> None:
    sub = SimpleNamespace(
        stripe_id="sub_1",
        organization_id="org-1",
        customer_stripe_id="cus_1",
        status="active",
        current_period_start=datetime(2026, 4, 1, tzinfo=timezone.utc),
        current_period_end=datetime(2026, 5, 1, tzinfo=timezone.utc),
        stripe_created=datetime(2026, 4, 1, tzinfo=timezone.utc),
        canceled_at=None,
        cancel_at_period_end=False,
    )

    exec_result = MagicMock()
    exec_result.scalars = MagicMock(return_value=iter([]))

    db = MagicMock()
    db.scalar = AsyncMock(return_value=sub)
    db.execute = AsyncMock(return_value=exec_result)

    service = ContractBootstrapperService(db)
    result = await service.from_stripe_subscription(
        organization_id="org-1", stripe_subscription_id="sub_1"
    )
    assert result is None
