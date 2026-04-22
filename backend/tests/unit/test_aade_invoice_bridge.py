"""AADE→unified invoice bridge tests.

The bridge must:
* Map ``InvoiceDirection`` to ``InvoiceAccountingKind`` (TRANSMITTED=AR, RECEIVED=AP).
* Key the unified row on ``(org, source=AADE, external_id=<mark|uid>)``.
* Resolve a Counterparty when exactly one matches by VAT; flag human review otherwise.
* Update an existing unified row in place instead of inserting a duplicate.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.db.models.aade import InvoiceDirection
from app.db.models.invoices import (
    InvoiceAccountingKind,
    InvoiceSource,
    InvoiceStatus,
)
from app.services.aade_invoice_bridge import (
    AadeInvoiceBridgeService,
    _accounting_kind,
    _default_issue_date,
    _to_decimal,
)


# --- Pure helpers ---------------------------------------------------------


def test_accounting_kind_maps_direction() -> None:
    assert _accounting_kind(InvoiceDirection.TRANSMITTED) == InvoiceAccountingKind.AR_REVENUE
    assert _accounting_kind(InvoiceDirection.RECEIVED) == InvoiceAccountingKind.AP_EXPENSE


def test_default_issue_date_prefers_issue_date() -> None:
    inv = SimpleNamespace(
        issue_date=date(2026, 1, 5),
        created_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
    )
    assert _default_issue_date(inv) == date(2026, 1, 5)


def test_default_issue_date_falls_back_to_created_at() -> None:
    inv = SimpleNamespace(
        issue_date=None,
        created_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
    )
    assert _default_issue_date(inv) == date(2026, 3, 1)


def test_to_decimal_quantizes() -> None:
    assert _to_decimal(None) == Decimal("0.00")
    assert _to_decimal(Decimal("12.3456")) == Decimal("12.35")
    assert _to_decimal(7) == Decimal("7.00")


# --- Fixture helpers ------------------------------------------------------


def _aade(
    *,
    org: str = "org-1",
    mark: int | None = 42,
    uid: str | None = "UID-1",
    direction: InvoiceDirection = InvoiceDirection.RECEIVED,
    issuer_vat: str | None = "EL12345",
    counterpart_vat: str | None = "EL99999",
    total_gross: Decimal | None = Decimal("123.45"),
    currency: str = "EUR",
    issue: date = date(2026, 4, 1),
) -> Any:
    """Duck-typed ``AadeInvoiceModel`` — bridge only touches attributes."""
    return SimpleNamespace(
        id="aade-row-1",
        organization_id=org,
        direction=direction,
        mark=mark,
        uid=uid,
        issuer_vat=issuer_vat,
        issuer_country="GR",
        counterpart_vat=counterpart_vat,
        counterpart_country="GR",
        total_gross_value=total_gross,
        currency=currency,
        issue_date=issue,
        created_at=datetime(2026, 4, 1, tzinfo=timezone.utc),
    )


class _Recorder:
    """Minimal ``AsyncSession`` stand-in capturing ``add`` + ``execute`` calls."""

    def __init__(self, existing: Any | None = None, counterparty_ids: list[str] | None = None):
        self.added: list[Any] = []
        self._existing = existing
        self._counterparty_ids = counterparty_ids or []

        load_result = MagicMock()
        load_result.scalar_one_or_none.return_value = existing

        cp_result = MagicMock()
        cp_result.scalars.return_value = MagicMock(all=lambda: self._counterparty_ids)

        # Bridge calls order: (1) counterparty lookup, (2) unified load.
        self.execute = AsyncMock(side_effect=[cp_result, load_result])

    def add(self, obj: Any) -> None:
        self.added.append(obj)


# --- Behavioural tests ----------------------------------------------------


@pytest.mark.asyncio
async def test_received_invoice_inserts_ap_expense_unified_row() -> None:
    session = _Recorder(existing=None, counterparty_ids=["cp-1"])
    bridge = AadeInvoiceBridgeService(session)  # type: ignore[arg-type]

    unified = await bridge.upsert_from_aade_invoice(
        _aade(direction=InvoiceDirection.RECEIVED)
    )

    assert unified is not None
    assert unified.source == InvoiceSource.AADE
    assert unified.external_id == "42"  # mark stringified
    assert unified.accounting_kind == InvoiceAccountingKind.AP_EXPENSE
    assert unified.status == InvoiceStatus.FINALIZED
    assert unified.counterparty_id == "cp-1"
    assert unified.requires_human_review is False
    assert unified.amount == Decimal("123.45")
    assert unified.currency == "EUR"
    assert session.added == [unified]


@pytest.mark.asyncio
async def test_transmitted_invoice_maps_to_ar_revenue() -> None:
    session = _Recorder(existing=None, counterparty_ids=[])
    bridge = AadeInvoiceBridgeService(session)  # type: ignore[arg-type]

    unified = await bridge.upsert_from_aade_invoice(
        _aade(direction=InvoiceDirection.TRANSMITTED, counterpart_vat="EL77777")
    )

    assert unified is not None
    assert unified.accounting_kind == InvoiceAccountingKind.AR_REVENUE
    # No counterparty match → flagged for human review.
    assert unified.counterparty_id is None
    assert unified.requires_human_review is True


@pytest.mark.asyncio
async def test_ambiguous_counterparty_does_not_link() -> None:
    session = _Recorder(existing=None, counterparty_ids=["cp-1", "cp-2"])
    bridge = AadeInvoiceBridgeService(session)  # type: ignore[arg-type]

    unified = await bridge.upsert_from_aade_invoice(_aade())
    assert unified is not None
    assert unified.counterparty_id is None
    assert unified.requires_human_review is True


@pytest.mark.asyncio
async def test_uid_fallback_when_mark_missing() -> None:
    session = _Recorder(existing=None, counterparty_ids=[])
    bridge = AadeInvoiceBridgeService(session)  # type: ignore[arg-type]

    unified = await bridge.upsert_from_aade_invoice(
        _aade(mark=None, uid="UID-FALLBACK")
    )
    assert unified is not None
    assert unified.external_id == "UID-FALLBACK"


@pytest.mark.asyncio
async def test_missing_keys_returns_none() -> None:
    session = _Recorder()
    bridge = AadeInvoiceBridgeService(session)  # type: ignore[arg-type]

    unified = await bridge.upsert_from_aade_invoice(_aade(mark=None, uid=None))
    assert unified is None
    assert session.added == []


@pytest.mark.asyncio
async def test_existing_unified_row_is_updated_in_place() -> None:
    existing = SimpleNamespace(
        id="unified-1",
        organization_id="org-1",
        counterparty_id=None,
        counterparty_display_name=None,
        amount=Decimal("0.00"),
        currency="USD",
        issue_date=date(2020, 1, 1),
        accounting_kind=None,
        requires_human_review=True,
    )
    session = _Recorder(existing=existing, counterparty_ids=["cp-9"])
    bridge = AadeInvoiceBridgeService(session)  # type: ignore[arg-type]

    unified = await bridge.upsert_from_aade_invoice(_aade(total_gross=Decimal("500.00")))

    assert unified is existing  # in-place update, no new row added
    assert session.added == []
    assert existing.amount == Decimal("500.00")
    assert existing.currency == "EUR"
    assert existing.counterparty_id == "cp-9"
    assert existing.requires_human_review is False
    assert existing.accounting_kind == InvoiceAccountingKind.AP_EXPENSE


@pytest.mark.asyncio
async def test_missing_organization_returns_none() -> None:
    session = _Recorder()
    bridge = AadeInvoiceBridgeService(session)  # type: ignore[arg-type]

    unified = await bridge.upsert_from_aade_invoice(_aade(org=""))
    assert unified is None
