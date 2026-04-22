"""Tests for HubspotContractBridgeService — HubSpot Deal → Contract + POs."""

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
from app.services.hubspot_contract_bridge import (
    HubspotContractBridgeService,
    _contract_status_from_deal,
    _first_non_null,
    _frequency_from_lines,
    _po_kind_from_line,
    _po_seed_from_line,
    _service_end,
    _service_start,
)


# ----- Pure helpers --------------------------------------------------------


def test_contract_status_from_deal_closed_won_is_active() -> None:
    assert _contract_status_from_deal(
        SimpleNamespace(is_closed=True, is_closed_won=True)
    ) == ContractStatus.ACTIVE


def test_contract_status_from_deal_closed_lost_is_terminated() -> None:
    assert _contract_status_from_deal(
        SimpleNamespace(is_closed=True, is_closed_won=False)
    ) == ContractStatus.TERMINATED


def test_contract_status_from_deal_open_is_draft() -> None:
    assert _contract_status_from_deal(
        SimpleNamespace(is_closed=False, is_closed_won=False)
    ) == ContractStatus.DRAFT


def test_first_non_null_skips_empty_strings() -> None:
    assert _first_non_null(None, "", "USD", default="EUR") == "USD"
    assert _first_non_null(None, None, default="EUR") == "EUR"


def test_service_start_and_end_pick_extremes() -> None:
    lines = [
        SimpleNamespace(
            recurring_billing_start_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
            recurring_billing_end_date=datetime(2027, 3, 31, tzinfo=timezone.utc),
        ),
        SimpleNamespace(
            recurring_billing_start_date=datetime(2026, 3, 15, tzinfo=timezone.utc),
            recurring_billing_end_date=datetime(2026, 12, 31, tzinfo=timezone.utc),
        ),
    ]
    assert _service_start(lines) == date(2026, 3, 15)
    assert _service_end(lines) == date(2027, 3, 31)


def test_frequency_from_lines_prefers_period() -> None:
    lines = [
        SimpleNamespace(
            recurring_billing_period="annually", recurring_billing_frequency=None
        ),
        SimpleNamespace(
            recurring_billing_period=None, recurring_billing_frequency="monthly"
        ),
    ]
    assert _frequency_from_lines(lines) == "annually"


def test_po_kind_from_line_detects_recurring_vs_oneoff() -> None:
    recurring = SimpleNamespace(
        billing_period=None,
        recurring_billing_period="monthly",
        recurring_billing_frequency=None,
        sku=None,
        term_months=12,
    )
    usage = SimpleNamespace(
        billing_period="usage",
        recurring_billing_period=None,
        recurring_billing_frequency=None,
        sku="api-metered",
        term_months=None,
    )
    one_off = SimpleNamespace(
        billing_period=None,
        recurring_billing_period=None,
        recurring_billing_frequency=None,
        sku="setup-fee",
        term_months=None,
    )
    assert _po_kind_from_line(recurring) == PerformanceObligationKind.OVER_TIME_STRAIGHT_LINE
    assert _po_kind_from_line(usage) == PerformanceObligationKind.OVER_TIME_USAGE_BASED
    assert _po_kind_from_line(one_off) == PerformanceObligationKind.POINT_IN_TIME


def test_po_seed_from_line_populates_amount_and_billing_refs() -> None:
    line = SimpleNamespace(
        hubspot_id="li_1",
        name="Seat licence",
        sku="SEAT-PRO",
        product_hubspot_id="prod_99",
        quantity=Decimal("5"),
        price=Decimal("20.00"),
        amount=Decimal("100.00"),
        currency="eur",
        term_months=12,
        recurring_billing_period="monthly",
        recurring_billing_frequency=None,
        recurring_billing_start_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        recurring_billing_end_date=datetime(2027, 3, 31, tzinfo=timezone.utc),
        billing_period=None,
    )
    seed = _po_seed_from_line(line)
    assert seed.standalone_selling_price == Decimal("100.00")
    assert seed.allocated_transaction_price == Decimal("100.00")
    assert seed.currency == "EUR"
    assert seed.billing_system == BillingSystem.HUBSPOT
    assert seed.billing_item_ref == "li_1"
    assert seed.billing_product_ref == "prod_99"
    assert seed.service_start_date == date(2026, 4, 1)
    assert seed.service_end_date == date(2027, 3, 31)
    assert seed.kind == PerformanceObligationKind.OVER_TIME_STRAIGHT_LINE


# ----- Orchestration ------------------------------------------------------


@pytest.mark.asyncio
async def test_upsert_from_deal_id_returns_none_when_deal_missing() -> None:
    db = MagicMock()
    db.scalar = AsyncMock(return_value=None)
    bridge = HubspotContractBridgeService(db)
    result = await bridge.upsert_from_deal_id(
        organization_id="org-1", hubspot_deal_id="deal_404"
    )
    assert result is None


@pytest.mark.asyncio
async def test_upsert_from_deal_id_returns_none_when_no_lines() -> None:
    deal = SimpleNamespace(
        hubspot_id="deal_1",
        name="Deal",
        primary_company_hubspot_id="comp_1",
        is_closed=True,
        is_closed_won=True,
        currency="USD",
        close_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        hubspot_created_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
        pipeline="default",
        stage="closedwon",
        mrr=None,
        arr=None,
        tcv=None,
    )
    exec_result = MagicMock()
    exec_result.scalars = MagicMock(return_value=iter([]))
    db = MagicMock()
    db.scalar = AsyncMock(return_value=deal)
    db.execute = AsyncMock(return_value=exec_result)
    bridge = HubspotContractBridgeService(db)
    result = await bridge.upsert_from_deal_id(
        organization_id="org-1", hubspot_deal_id="deal_1"
    )
    assert result is None


@pytest.mark.asyncio
async def test_upsert_from_deal_id_builds_seed_and_delegates_to_bootstrapper(
    monkeypatch,
) -> None:
    """Closed-won deal + lines → ContractSeed handed off to bootstrapper."""
    deal = SimpleNamespace(
        hubspot_id="deal_1",
        name="Acme Pro",
        primary_company_hubspot_id="comp_42",
        is_closed=True,
        is_closed_won=True,
        currency="USD",
        close_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        hubspot_created_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
        pipeline="default",
        stage="closedwon",
        mrr=Decimal("100"),
        arr=Decimal("1200"),
        tcv=Decimal("1200"),
    )
    line = SimpleNamespace(
        hubspot_id="li_1",
        name="Annual licence",
        sku="PRO",
        product_hubspot_id="prod_1",
        quantity=Decimal("1"),
        price=Decimal("1200"),
        amount=Decimal("1200"),
        currency="USD",
        term_months=12,
        recurring_billing_period="annually",
        recurring_billing_frequency=None,
        recurring_billing_start_date=datetime(2026, 4, 1, tzinfo=timezone.utc),
        recurring_billing_end_date=datetime(2027, 3, 31, tzinfo=timezone.utc),
        billing_period=None,
    )

    exec_result = MagicMock()
    exec_result.scalars = MagicMock(return_value=iter([line]))

    db = MagicMock()
    # Two scalar calls: 1) deal load, 2) counterparty_id lookup.
    db.scalar = AsyncMock(side_effect=[deal, "counterparty-uuid"])
    db.execute = AsyncMock(return_value=exec_result)

    # Patch the bootstrapper used by the bridge to capture the seed.
    captured: dict = {}

    async def fake_upsert(seed):
        captured["seed"] = seed
        return SimpleNamespace(id="contract-uuid")

    bridge = HubspotContractBridgeService(db)
    bridge._bootstrapper.upsert_from_seed = fake_upsert  # type: ignore[assignment]

    result = await bridge.upsert_from_deal_id(
        organization_id="org-1", hubspot_deal_id="deal_1"
    )

    assert result.id == "contract-uuid"
    seed = captured["seed"]
    assert seed.billing_system == BillingSystem.HUBSPOT
    assert seed.billing_contract_ref == "deal_1"
    assert seed.source == ContractSource.HUBSPOT_DEAL
    assert seed.status == ContractStatus.ACTIVE
    assert seed.counterparty_id == "counterparty-uuid"
    assert seed.currency == "USD"
    assert len(seed.performance_obligations) == 1
    assert seed.performance_obligations[0].billing_item_ref == "li_1"
