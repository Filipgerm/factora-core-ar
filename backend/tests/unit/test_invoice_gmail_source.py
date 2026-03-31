"""Invoice source enum and Gmail-related response validation."""

from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from app.db.models.invoices import InvoiceSource
from app.models.gmail import GmailSyncResponse
from app.models.invoices import InvoiceCreateRequest, InvoiceSourceEnum
from app.services.invoice_service import InvoiceService


@pytest.mark.asyncio
async def test_invoice_service_create_persists_gmail_source() -> None:
    """Gmail-synced invoices use ORM ``InvoiceSource.GMAIL`` (requires DB enum ``gmail``)."""
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    org_id = str(uuid.uuid4())
    svc = InvoiceService(db, org_id)
    body = InvoiceCreateRequest(
        source=InvoiceSourceEnum.GMAIL,
        external_id="gmail-msg-abc",
        counterparty_display_name="Cloud Vendor Inc",
        amount=Decimal("99.00"),
        issue_date=date(2026, 1, 15),
    )
    await svc.create(body)

    db.add.assert_called_once()
    added = db.add.call_args[0][0]
    assert added.source == InvoiceSource.GMAIL
    assert added.organization_id == org_id
    assert added.external_id == "gmail-msg-abc"


def test_gmail_sync_response_rejects_negative_ingested() -> None:
    with pytest.raises(ValidationError):
        GmailSyncResponse(ingested=-1, skipped=0, mailbox="a@b.com")


def test_gmail_sync_response_rejects_negative_skipped() -> None:
    with pytest.raises(ValidationError):
        GmailSyncResponse(ingested=0, skipped=-2, mailbox="a@b.com")


def test_gmail_sync_response_accepts_zero_counts() -> None:
    r = GmailSyncResponse(ingested=0, skipped=0, mailbox="a@b.com")
    assert r.ingested == 0 and r.skipped == 0


@pytest.mark.asyncio
async def test_invoice_service_create_sets_is_recurring() -> None:
    """is_recurring field must be persisted on the ORM Invoice row."""
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    org_id = str(uuid.uuid4())
    svc = InvoiceService(db, org_id)
    body = InvoiceCreateRequest(
        source=InvoiceSourceEnum.GMAIL,
        external_id="gmail-recurring-test",
        counterparty_display_name="Adobe Inc",
        amount=Decimal("59.99"),
        issue_date=date(2026, 3, 15),
        is_recurring=True,
    )
    await svc.create(body)

    added = db.add.call_args[0][0]
    assert added.is_recurring is True
