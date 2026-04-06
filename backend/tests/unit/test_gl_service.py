"""Unit tests for GlService validation and read paths (mocked session)."""

from __future__ import annotations

import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import NotFoundError, ValidationError
from app.models.general_ledger import GlJournalLineInput
from app.services.gl_service import GlService, _trial_balance_net_balance
from app.db.models.gl import GlNormalBalance


@pytest.mark.asyncio
async def test_validate_manual_lines_rejects_unbalanced() -> None:
    db = AsyncMock()
    org_id = str(uuid.uuid4())
    svc = GlService(db, org_id)
    lines = [
        GlJournalLineInput(
            account_id="a1",
            debit=Decimal("100"),
            credit=Decimal("0"),
            line_order=0,
        ),
        GlJournalLineInput(
            account_id="a2",
            debit=Decimal("0"),
            credit=Decimal("50"),
            line_order=1,
        ),
    ]
    acc1 = MagicMock()
    acc1.id = "a1"
    acc1.is_control_account = False
    acc2 = MagicMock()
    acc2.id = "a2"
    acc2.is_control_account = False
    result = MagicMock()
    result.scalars.return_value.all.return_value = [acc1, acc2]
    db.execute = AsyncMock(return_value=result)

    with pytest.raises(ValidationError) as exc:
        await svc._validate_manual_lines(lines)
    assert exc.value.code == "gl.journal.unbalanced"


@pytest.mark.asyncio
async def test_validate_manual_lines_rejects_control_account() -> None:
    db = AsyncMock()
    org_id = str(uuid.uuid4())
    svc = GlService(db, org_id)
    lines = [
        GlJournalLineInput(
            account_id="a1",
            debit=Decimal("100"),
            credit=Decimal("0"),
            line_order=0,
        ),
        GlJournalLineInput(
            account_id="a2",
            debit=Decimal("0"),
            credit=Decimal("100"),
            line_order=1,
        ),
    ]
    acc1 = MagicMock()
    acc1.id = "a1"
    acc1.is_control_account = True
    acc1.code = "1200"
    acc2 = MagicMock()
    acc2.id = "a2"
    acc2.is_control_account = False
    result = MagicMock()
    result.scalars.return_value.all.return_value = [acc1, acc2]
    db.execute = AsyncMock(return_value=result)

    with pytest.raises(ValidationError) as exc:
        await svc._validate_manual_lines(lines)
    assert exc.value.code == "gl.journal.control_account_forbidden"


@pytest.mark.asyncio
async def test_get_journal_entry_not_found() -> None:
    db = AsyncMock()
    schema_row = MagicMock()
    schema_row.scalar.return_value = True
    db.execute = AsyncMock(return_value=schema_row)
    db.scalar = AsyncMock(return_value=None)
    svc = GlService(db, str(uuid.uuid4()))
    with pytest.raises(NotFoundError) as exc:
        await svc.get_journal_entry(str(uuid.uuid4()))
    assert exc.value.code == "gl.journal_not_found"


@pytest.mark.asyncio
async def test_list_entities_empty_when_gl_schema_missing() -> None:
    db = AsyncMock()
    schema_row = MagicMock()
    schema_row.scalar.return_value = False
    db.execute = AsyncMock(return_value=schema_row)
    svc = GlService(db, str(uuid.uuid4()))
    assert await svc.list_entities() == []


def test_static_fx_rate_identity() -> None:
    from app.services.gl_service import _static_fx_rate

    assert _static_fx_rate("EUR", "EUR") == Decimal("1")


def test_trial_balance_net_balance_debit_normal() -> None:
    assert _trial_balance_net_balance(
        GlNormalBalance.DEBIT, Decimal("100"), Decimal("40")
    ) == Decimal("60.0000")


def test_trial_balance_net_balance_credit_normal() -> None:
    assert _trial_balance_net_balance(
        GlNormalBalance.CREDIT, Decimal("100"), Decimal("250")
    ) == Decimal("150.0000")
