"""InvoiceGlBridgeService — draft GL journals from unified invoices (Gmail ingest).

Scope: Classify AP vs AR from counterparty type, resolve non-control CoA codes,
call ``GlService.create_journal_entry`` (draft only), link ``Invoice.gl_journal_entry_id``.
Contract: Idempotent when ``gl_journal_entry_id`` is set; returns ``None`` when GL
is skipped (unknown classification, schema missing); raises ``ValidationError`` when
required accounts are missing (callers may catch and log).

Flow:
    1. Skip if GL schema not installed or invoice already linked.
    2. Load counterparty type; infer ``InvoiceAccountingKind``.
    3. Resolve account UUIDs by code (2110/1211 accrual detail, 6500/4100 defaults).
    4. Build balanced lines, primary legal entity, ``GlJournalEntryCreateRequest``.
    5. ``GlService.create_journal_entry`` (commits), then update invoice row + commit.

Architectural Notes:
    Uses **non-control** detail accounts so ``_validate_manual_lines`` passes.
    Gmail worker treats ``ValidationError`` as non-fatal so the invoice still persists.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationError
from app.db.models.counterparty import Counterparty, CounterpartyType
from app.db.models.gl import GlAccount, GlLegalEntity
from app.db.models.invoices import Invoice, InvoiceAccountingKind
from app.models.general_ledger import GlJournalEntryCreateRequest, GlJournalLineInput
from app.services.gl_schema_check import gl_ledger_schema_installed
from app.services.gl_service import GlService

# Demo seed / runbook: non-control posting targets (2100/1200 remain control subledgers).
CODE_AP_ACCRUAL = "2110"
CODE_AR_DETAIL = "1211"
CODE_DEFAULT_EXPENSE = "6500"
CODE_DEFAULT_REVENUE = "4100"


def infer_invoice_accounting_kind(
    counterparty_type: CounterpartyType | None,
    *,
    ambiguous_incoming_document: bool = False,
) -> InvoiceAccountingKind:
    """Map counterparty role to AP vs AR; **BOTH** defaults to AP only in bill context."""
    if counterparty_type is None:
        return InvoiceAccountingKind.UNKNOWN
    if counterparty_type == CounterpartyType.VENDOR:
        return InvoiceAccountingKind.AP_EXPENSE
    if counterparty_type == CounterpartyType.CUSTOMER:
        return InvoiceAccountingKind.AR_REVENUE
    if counterparty_type == CounterpartyType.BOTH and ambiguous_incoming_document:
        return InvoiceAccountingKind.AP_EXPENSE
    return InvoiceAccountingKind.UNKNOWN


class InvoiceGlBridgeService:
    def __init__(self, db: AsyncSession, organization_id: str) -> None:
        self.db = db
        self.organization_id = organization_id

    async def _primary_legal_entity_id(self) -> str:
        row = await self.db.scalar(
            select(GlLegalEntity.id)
            .where(GlLegalEntity.organization_id == self.organization_id)
            .order_by(GlLegalEntity.is_primary.desc(), GlLegalEntity.code)
            .limit(1)
        )
        if not row:
            raise ValidationError(
                "No legal entity found for this organization. Seed or create a GL entity first.",
                code="gl.invoice_bridge.no_entity",
                fields={"legal_entity": "missing"},
            )
        return row

    async def _account_id_for_code(self, code: str) -> str:
        aid = await self.db.scalar(
            select(GlAccount.id).where(
                GlAccount.organization_id == self.organization_id,
                GlAccount.code == code,
                GlAccount.deleted_at.is_(None),
            )
        )
        if not aid:
            raise ValidationError(
                f"Chart of accounts is missing account code {code} required for automated "
                "invoice journals. Add a non-control account or update org seeding.",
                code="gl.invoice_bridge.missing_account",
                fields={"account_code": code},
            )
        return aid

    async def create_draft_journal_for_invoice(
        self,
        invoice_id: str,
        *,
        ambiguous_incoming_document: bool = False,
    ) -> str | None:
        """Create a **draft** journal for ``invoice_id`` if rules allow; else return ``None``."""
        if not await gl_ledger_schema_installed(self.db):
            return None

        inv = await self.db.get(Invoice, invoice_id)
        if not inv or inv.organization_id != self.organization_id:
            return None
        if inv.deleted_at is not None:
            return None
        if inv.gl_journal_entry_id:
            return inv.gl_journal_entry_id

        cp_type: CounterpartyType | None = None
        if inv.counterparty_id:
            cp = await self.db.get(Counterparty, inv.counterparty_id)
            if cp and cp.organization_id == self.organization_id and cp.deleted_at is None:
                cp_type = cp.type

        kind = infer_invoice_accounting_kind(
            cp_type, ambiguous_incoming_document=ambiguous_incoming_document
        )
        if kind == InvoiceAccountingKind.UNKNOWN:
            return None

        amt = inv.amount.quantize(Decimal("0.01"))
        if amt <= 0:
            return None

        entity_id = await self._primary_legal_entity_id()
        doc_ccy = inv.currency.strip().upper()[:3] or "EUR"
        base_ccy = doc_ccy

        if kind == InvoiceAccountingKind.AP_EXPENSE:
            expense_id = await self._account_id_for_code(CODE_DEFAULT_EXPENSE)
            liability_id = await self._account_id_for_code(CODE_AP_ACCRUAL)
            lines = [
                GlJournalLineInput(
                    account_id=expense_id,
                    description="Vendor invoice expense (automated)",
                    debit=amt,
                    credit=Decimal("0"),
                    line_order=0,
                ),
                GlJournalLineInput(
                    account_id=liability_id,
                    description="Vendor invoice accrued (non-control)",
                    debit=Decimal("0"),
                    credit=amt,
                    line_order=1,
                ),
            ]
        else:
            receivable_id = await self._account_id_for_code(CODE_AR_DETAIL)
            revenue_id = await self._account_id_for_code(CODE_DEFAULT_REVENUE)
            lines = [
                GlJournalLineInput(
                    account_id=receivable_id,
                    description="Customer invoice receivable (non-control)",
                    debit=amt,
                    credit=Decimal("0"),
                    line_order=0,
                ),
                GlJournalLineInput(
                    account_id=revenue_id,
                    description="Customer invoice revenue (automated)",
                    debit=Decimal("0"),
                    credit=amt,
                    line_order=1,
                ),
            ]

        memo = f"Invoice {inv.id[:8]}… ({kind.value})"
        reference = f"invoice:{inv.id}"

        gl = GlService(self.db, self.organization_id, actor_user_id=None, actor_role=None)
        body = GlJournalEntryCreateRequest(
            legal_entity_id=entity_id,
            posting_period_id=None,
            entry_date=inv.issue_date,
            document_currency=doc_ccy,
            base_currency=base_ccy,
            fx_rate_to_base=None,
            memo=memo,
            reference=reference[:128] if len(reference) > 128 else reference,
            lines=lines,
        )
        entry = await gl.create_journal_entry(body)

        inv2 = await self.db.get(Invoice, invoice_id)
        if inv2 and inv2.organization_id == self.organization_id:
            inv2.gl_journal_entry_id = entry.id
            inv2.accounting_kind = kind
            await self.db.commit()
        return entry.id
