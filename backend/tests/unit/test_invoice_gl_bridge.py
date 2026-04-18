"""Unit tests for invoice → GL classification and bridge idempotency."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ValidationError
from app.db.models.counterparty import CounterpartyType
from app.db.models.invoices import InvoiceAccountingKind
from app.services.invoice_gl_bridge_service import (
    InvoiceGlBridgeService,
    infer_invoice_accounting_kind,
)


def test_infer_vendor_maps_to_ap() -> None:
    assert (
        infer_invoice_accounting_kind(CounterpartyType.VENDOR)
        == InvoiceAccountingKind.AP_EXPENSE
    )


def test_infer_customer_maps_to_ar() -> None:
    assert (
        infer_invoice_accounting_kind(CounterpartyType.CUSTOMER)
        == InvoiceAccountingKind.AR_REVENUE
    )


def test_infer_both_without_context_unknown() -> None:
    assert (
        infer_invoice_accounting_kind(CounterpartyType.BOTH)
        == InvoiceAccountingKind.UNKNOWN
    )


def test_infer_both_ambiguous_bill_prefers_ap() -> None:
    assert (
        infer_invoice_accounting_kind(
            CounterpartyType.BOTH, ambiguous_incoming_document=True
        )
        == InvoiceAccountingKind.AP_EXPENSE
    )


def test_infer_missing_counterparty_unknown() -> None:
    assert infer_invoice_accounting_kind(None) == InvoiceAccountingKind.UNKNOWN


@pytest.mark.asyncio
async def test_bridge_idempotent_returns_existing_journal_id() -> None:
    inv = MagicMock()
    inv.organization_id = "org-1"
    inv.gl_journal_entry_id = "00000000-0000-0000-0000-00000000aa01"
    inv.deleted_at = None

    db = AsyncMock()
    db.get = AsyncMock(return_value=inv)

    with patch(
        "app.services.invoice_gl_bridge_service.gl_ledger_schema_installed",
        new_callable=AsyncMock,
        return_value=True,
    ), patch("app.services.invoice_gl_bridge_service.GlService") as gl_cls:
        svc = InvoiceGlBridgeService(db, "org-1")
        out = await svc.create_draft_journal_for_invoice("inv-1")
        assert out == inv.gl_journal_entry_id
        gl_cls.assert_not_called()


@pytest.mark.asyncio
async def test_bridge_unknown_kind_skips_gl_service() -> None:
    inv = MagicMock()
    inv.organization_id = "org-1"
    inv.gl_journal_entry_id = None
    inv.counterparty_id = None
    inv.deleted_at = None
    inv.issue_date = date(2026, 1, 15)
    inv.amount = Decimal("100.00")

    db = AsyncMock()
    db.get = AsyncMock(return_value=inv)

    with patch(
        "app.services.invoice_gl_bridge_service.gl_ledger_schema_installed",
        new_callable=AsyncMock,
        return_value=True,
    ), patch("app.services.invoice_gl_bridge_service.GlService") as gl_cls:
        svc = InvoiceGlBridgeService(db, "org-1")
        out = await svc.create_draft_journal_for_invoice("inv-2")
        assert out is None
        gl_cls.assert_not_called()


@pytest.mark.asyncio
async def test_bridge_propagates_validation_error_when_account_missing() -> None:
    inv = MagicMock()
    inv.organization_id = "org-1"
    inv.gl_journal_entry_id = None
    inv.counterparty_id = "cp-1"
    inv.deleted_at = None
    inv.issue_date = date(2026, 1, 15)
    inv.amount = Decimal("50.00")
    inv.id = "inv-3"

    cp = MagicMock()
    cp.organization_id = "org-1"
    cp.deleted_at = None
    cp.type = CounterpartyType.VENDOR

    db = AsyncMock()
    db.get = AsyncMock(side_effect=[inv, cp])

    svc = InvoiceGlBridgeService(db, "org-1")
    with (
        patch(
            "app.services.invoice_gl_bridge_service.gl_ledger_schema_installed",
            new_callable=AsyncMock,
            return_value=True,
        ),
        patch.object(
            svc,
            "_primary_legal_entity_id",
            new_callable=AsyncMock,
            return_value="00000000-0000-0000-0000-00000000e001",
        ),
        patch.object(
            svc,
            "_account_id_for_code",
            new_callable=AsyncMock,
            side_effect=ValidationError(
                "missing account",
                code="gl.invoice_bridge.missing_account",
                fields={"account_code": "2110"},
            ),
        ),
        patch("app.services.invoice_gl_bridge_service.GlService") as gl_cls,
    ):
        with pytest.raises(ValidationError) as excinfo:
            await svc.create_draft_journal_for_invoice("inv-3")
        assert excinfo.value.code == "gl.invoice_bridge.missing_account"
        gl_cls.assert_not_called()
