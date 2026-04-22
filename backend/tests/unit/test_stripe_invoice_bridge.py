"""Stripe→unified invoice bridge tests.

The bridge must:
* Map Stripe invoice status to our InvoiceStatus domain enum.
* Convert amounts from minor units to Decimal.
* Flag ``requires_human_review=True`` when counterparty resolution fails.
* Not raise on invoices with no lines.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.models.invoices import InvoiceAccountingKind, InvoiceSource, InvoiceStatus
from app.services.stripe_invoice_bridge import (
    StripeInvoiceBridgeService,
    _map_status,
    _to_decimal_amount,
    _to_date,
)


def test_map_status_open_is_finalized() -> None:
    assert _map_status("open") == InvoiceStatus.FINALIZED


def test_map_status_paid_is_synced() -> None:
    assert _map_status("paid") == InvoiceStatus.SYNCED


def test_map_status_unknown_defaults_to_draft() -> None:
    assert _map_status("mystery") == InvoiceStatus.DRAFT
    assert _map_status(None) == InvoiceStatus.DRAFT


def test_to_decimal_amount_converts_cents() -> None:
    assert _to_decimal_amount(12345) == Decimal("123.45")
    assert _to_decimal_amount(0) == Decimal("0.00")
    assert _to_decimal_amount(None) == Decimal("0")


def test_to_date_handles_aware_and_naive_datetimes() -> None:
    aware = datetime(2026, 4, 1, 12, 0, tzinfo=timezone.utc)
    naive = datetime(2026, 4, 1, 12, 0)
    assert _to_date(aware) == date(2026, 4, 1)
    assert _to_date(naive) == date(2026, 4, 1)
    assert _to_date(None) is None


def _make_stripe_invoice(
    *,
    org: str = "org-1",
    stripe_id: str = "in_abc",
    customer: str | None = "cus_1",
    total: int = 12345,
    status: str = "open",
    currency: str = "eur",
    subscription: str | None = None,
    created: datetime | None = None,
) -> Any:
    """Duck-typed stand-in for ``StripeInvoice`` (plain attribute reads only)."""
    return SimpleNamespace(
        organization_id=org,
        stripe_id=stripe_id,
        customer_stripe_id=customer,
        total=total,
        status=status,
        currency=currency,
        subscription_stripe_id=subscription,
        due_date=None,
        period_start=None,
        stripe_created=created or datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


@pytest.mark.asyncio
async def test_upsert_creates_new_invoice_with_review_flag_when_unmatched() -> None:
    db = AsyncMock()
    added: list[object] = []
    db.add = MagicMock(side_effect=added.append)

    # _load_unified → None (not present), _resolve_counterparty → None,
    # _apply_line_allocations executes a select returning no lines.
    no_row = MagicMock()
    no_row.scalar_one_or_none.return_value = None
    empty_scalars = MagicMock()
    empty_scalars.all.return_value = []
    no_row.scalars.return_value = empty_scalars
    db.execute = AsyncMock(return_value=no_row)

    svc = StripeInvoiceBridgeService(db)
    si = _make_stripe_invoice(customer="cus_unmatched")
    inv = await svc.upsert_from_stripe_invoice(si)

    assert inv is not None
    assert inv.source == InvoiceSource.STRIPE
    assert inv.external_id == "in_abc"
    assert inv.status == InvoiceStatus.FINALIZED
    assert inv.amount == Decimal("123.45")
    assert inv.currency == "EUR"
    assert inv.counterparty_id is None
    assert inv.requires_human_review is True
    assert inv.accounting_kind == InvoiceAccountingKind.AR_REVENUE
    assert inv is added[0]


@pytest.mark.asyncio
async def test_upsert_clears_review_flag_when_counterparty_resolved() -> None:
    db = AsyncMock()
    added: list[object] = []
    db.add = MagicMock(side_effect=added.append)

    cp_result = MagicMock()
    cp_result.scalar_one_or_none.return_value = "cp-123"
    no_row = MagicMock()
    no_row.scalar_one_or_none.return_value = None
    empty_scalars = MagicMock()
    empty_scalars.all.return_value = []
    no_row.scalars.return_value = empty_scalars

    # 1st execute → customer lookup (returns counterparty_id)
    # 2nd execute → load_unified (None)
    # 3rd execute → invoice lines (empty)
    db.execute = AsyncMock(side_effect=[cp_result, no_row, no_row])

    svc = StripeInvoiceBridgeService(db)
    si = _make_stripe_invoice()
    inv = await svc.upsert_from_stripe_invoice(si)
    assert inv is not None
    assert inv.counterparty_id == "cp-123"
    assert inv.requires_human_review is False


@pytest.mark.asyncio
async def test_upsert_noop_when_missing_stripe_id() -> None:
    db = AsyncMock()
    svc = StripeInvoiceBridgeService(db)
    si = _make_stripe_invoice(stripe_id="")
    result = await svc.upsert_from_stripe_invoice(si)
    assert result is None


@pytest.mark.asyncio
async def test_upsert_updates_existing_row_and_preserves_id() -> None:
    db = AsyncMock()
    existing = MagicMock()
    existing.id = "inv-existing"
    existing.counterparty_id = "cp-prior"
    existing.currency = "EUR"
    existing.due_date = None
    existing.requires_human_review = True

    cp_result = MagicMock()
    cp_result.scalar_one_or_none.return_value = None  # no link yet
    load_existing = MagicMock()
    load_existing.scalar_one_or_none.return_value = existing
    no_lines = MagicMock()
    empty_scalars = MagicMock()
    empty_scalars.all.return_value = []
    no_lines.scalars.return_value = empty_scalars

    db.execute = AsyncMock(side_effect=[cp_result, load_existing, no_lines])
    db.add = MagicMock()

    svc = StripeInvoiceBridgeService(db)
    si = _make_stripe_invoice(status="paid", total=50000)
    inv = await svc.upsert_from_stripe_invoice(si)

    assert inv is existing
    assert inv.amount == Decimal("500.00")
    assert inv.status == InvoiceStatus.SYNCED
    db.add.assert_not_called()
