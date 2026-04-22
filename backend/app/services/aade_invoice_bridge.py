"""AadeInvoiceBridgeService — mirror AADE invoices into the unified ``invoices`` table.

**Scope:** Bridge the AADE / myDATA-specific ``aade_invoices`` mirror into the
tenant-wide unified ``invoices`` domain so dashboards, collections, revrec
and GL posting consume ONE canonical invoice stream regardless of whether
the row originated from AADE, Stripe, manual entry, OCR, CSV import or Gmail.

**Contract:**
    * Idempotent upsert by
      ``(organization_id, source=AADE, external_id=<mark|uid>)``.
    * Writes through without committing — the caller owns the transaction
      boundary (typically ``MyDataService.save_documents`` or the backfill
      CLI). This mirrors the ``StripeInvoiceBridgeService`` contract so the
      two bridges compose cleanly.
    * Maps ``InvoiceDirection`` → ``InvoiceAccountingKind`` so GL bridges
      and AR/AP dashboards can tell income apart from expenses without
      knowing about AADE internals.
    * Attempts an opportunistic ``Counterparty`` lookup by VAT number; when
      it finds nothing the unified row is flagged ``requires_human_review``
      and the matcher can fix it up later (same pattern as Stripe).

**Flow:**
    1. Choose a stable ``external_id`` — prefer ``mark`` (globally unique
       AADE identifier, BIGINT stringified) and fall back to ``uid`` when
       marks are absent (rare; classifier invoices / drafts).
    2. Resolve the counterpart VAT → ``Counterparty`` in the same org.
    3. Map AADE direction to ``InvoiceAccountingKind`` + a reasonable
       default ``InvoiceStatus``.
    4. Upsert the unified row; update it in place on subsequent syncs so
       AADE-side corrections propagate through.

**Architectural notes:** The bridge reads only from the AADE mirror — never
from AADE's HTTP API — so it is cheap enough to run inline with the save
path. ``organization_id`` is required and never inferred from the JWT here;
the caller provides it (``MyDataService`` does, as does the backfill).
"""
from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.aade import AadeInvoiceModel, InvoiceDirection
from app.db.models.counterparty import Counterparty
from app.db.models.invoices import (
    Invoice,
    InvoiceAccountingKind,
    InvoiceSource,
    InvoiceStatus,
)

logger = logging.getLogger(__name__)


def _accounting_kind(direction: InvoiceDirection) -> InvoiceAccountingKind:
    """AADE direction semantics mirror Greek-tax AR/AP:

    * ``TRANSMITTED`` = issuer is the tenant → accounts receivable (revenue).
    * ``RECEIVED``    = tenant was billed   → accounts payable (expense).
    """
    if direction == InvoiceDirection.TRANSMITTED:
        return InvoiceAccountingKind.AR_REVENUE
    if direction == InvoiceDirection.RECEIVED:
        return InvoiceAccountingKind.AP_EXPENSE
    return InvoiceAccountingKind.UNKNOWN


def _normalized(inv: AadeInvoiceModel) -> dict:
    """Return the AADE normalizer payload as a plain dict.

    Step 5 removes ``issue_date`` / ``currency`` / ``total_gross_value`` from
    the slim mirror schema; the canonical source for those fields is the
    ``normalized_data`` JSONB that the myData normalizer already writes.
    """
    data = getattr(inv, "normalized_data", None)
    return data if isinstance(data, dict) else {}


def _coerce_date(value: object) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _default_issue_date(inv: AadeInvoiceModel) -> date:
    """Prefer ``normalized_data.issue_date``; fall back to ``created_at`` or today.

    Keeps reading the legacy column when the normalized payload is empty so
    rows written before Step 5 still bridge without a backfill.
    """
    issue = _coerce_date(_normalized(inv).get("issue_date"))
    if issue is None:
        issue = _coerce_date(getattr(inv, "issue_date", None))
    if issue is not None:
        return issue
    created = inv.created_at
    if isinstance(created, datetime):
        return created.astimezone(timezone.utc).date() if created.tzinfo else created.date()
    return datetime.now(timezone.utc).date()


class AadeInvoiceBridgeService:
    """Dual-write AADE mirror rows into the unified ``invoices`` table."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # --- Public API -----------------------------------------------------

    async def upsert_from_aade_invoice(
        self, aade_invoice: AadeInvoiceModel
    ) -> Invoice | None:
        """Upsert one unified ``Invoice`` row from an ``AadeInvoiceModel``.

        Returns the persisted/updated ``Invoice`` (never ``None`` on success).
        ``None`` is returned only when the AADE row is unusable (missing
        ``organization_id`` or no ``mark``/``uid`` to key by — both would
        indicate an ingestion bug).
        """
        if not aade_invoice.organization_id:
            return None
        external_id = self._external_id(aade_invoice)
        if external_id is None:
            return None

        counterparty_id = await self._resolve_counterparty(aade_invoice)
        display_name = self._display_name(aade_invoice)
        existing = await self._load_unified(
            aade_invoice.organization_id, external_id
        )

        data = _normalized(aade_invoice)
        amount = _to_decimal(
            data.get("total_gross_value", getattr(aade_invoice, "total_gross_value", None))
        )
        currency_raw = data.get("currency") or getattr(aade_invoice, "currency", None)
        currency = (currency_raw or "EUR").upper()[:3]
        issue = _default_issue_date(aade_invoice)
        kind = _accounting_kind(aade_invoice.direction)

        if existing is None:
            unified = Invoice(
                id=str(uuid.uuid4()),
                organization_id=aade_invoice.organization_id,
                source=InvoiceSource.AADE,
                external_id=external_id,
                counterparty_id=counterparty_id,
                counterparty_display_name=display_name,
                amount=amount,
                currency=currency,
                issue_date=issue,
                due_date=None,
                status=InvoiceStatus.FINALIZED,
                accounting_kind=kind,
                requires_human_review=counterparty_id is None,
            )
            self._db.add(unified)
            # Link the AADE mirror row back to the unified row so Step 5
            # can swap dashboard joins onto the structural FK.
            aade_invoice.invoice_id = unified.id
            return unified

        existing.counterparty_id = counterparty_id or existing.counterparty_id
        if counterparty_id is not None:
            existing.requires_human_review = False
        existing.counterparty_display_name = display_name or existing.counterparty_display_name
        existing.amount = amount
        existing.currency = currency
        existing.issue_date = issue
        existing.accounting_kind = kind
        aade_invoice.invoice_id = existing.id
        return existing

    # --- Internals ------------------------------------------------------

    @staticmethod
    def _external_id(inv: AadeInvoiceModel) -> str | None:
        if inv.mark is not None:
            return str(inv.mark)
        if inv.uid:
            return inv.uid
        return None

    @staticmethod
    def _display_name(inv: AadeInvoiceModel) -> str | None:
        """Use the counterpart VAT prefixed by country as a best-effort label.

        ``MyDataService`` discards party names during normalization (AADE
        exposes them in ``normalized_data`` but not in structured columns),
        so this keeps something human-recognizable on the unified row until
        a ``Counterparty`` match populates a proper name.
        """
        if inv.direction == InvoiceDirection.RECEIVED and inv.issuer_vat:
            country = (inv.issuer_country or "GR").upper()
            return f"{country}{inv.issuer_vat}"
        if inv.direction == InvoiceDirection.TRANSMITTED and inv.counterpart_vat:
            country = (inv.counterpart_country or "GR").upper()
            return f"{country}{inv.counterpart_vat}"
        return None

    async def _load_unified(
        self, organization_id: str, external_id: str
    ) -> Invoice | None:
        stmt = select(Invoice).where(
            Invoice.organization_id == organization_id,
            Invoice.source == InvoiceSource.AADE,
            Invoice.external_id == external_id,
        )
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def _resolve_counterparty(self, inv: AadeInvoiceModel) -> str | None:
        """Match the AADE counterpart/issuer VAT to a ``Counterparty``.

        AADE direction determines which VAT is the external party:
        * RECEIVED    → ``issuer_vat`` is the vendor (external).
        * TRANSMITTED → ``counterpart_vat`` is the customer (external).
        """
        vat = (
            inv.issuer_vat
            if inv.direction == InvoiceDirection.RECEIVED
            else inv.counterpart_vat
        )
        if not vat:
            return None
        stmt = (
            select(Counterparty.id)
            .where(
                Counterparty.organization_id == inv.organization_id,
                Counterparty.vat_number == vat,
                Counterparty.deleted_at.is_(None),
            )
            .limit(2)
        )
        rows = (await self._db.execute(stmt)).scalars().all()
        if len(rows) == 1:
            return rows[0]
        return None


def _to_decimal(value: Decimal | float | int | None) -> Decimal:
    if value is None:
        return Decimal("0.00")
    if isinstance(value, Decimal):
        return value.quantize(Decimal("0.01"))
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")
