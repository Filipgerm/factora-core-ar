"""GlService — general ledger persistence and validation per organization.

Scope: Legal entities, CoA, periods, journals, dimensions, billing batches,
IFRS 15 schedules, recurring templates, and audit events.
Contract: Accepts Pydantic requests, returns response DTOs or ORM rows for
mapping; raises ``NotFoundError`` / ``ValidationError`` for rule violations.

Flow:
    1. List/get operations filter by ``organization_id``.
    2. Journal draft save validates balance, line sides, and control-account rules.
    3. Posting checks period status and immutability.
    4. ``_journal_to_response`` maps ORM fields including ``entry_date`` and
       ``reversed_from_id`` to API DTOs.
    5. Trial balance rows include ``account_type`` and natural ``net_balance``.
    6. Hard-closed periods reject status weakening unless owner + explicit ack.
    7. Recurring templates can spawn draft journals via ``generate_journal_from_recurring_template``.

Architectural Notes:
    Consolidated reporting omits ``legal_entity_id`` filter on queries that
    aggregate across entities. FX rates for demo use static mock factors.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Sequence

from sqlalchemy import and_, delete, func, select
from sqlalchemy.orm import selectinload

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ServiceUnavailableError, ValidationError
from app.db.models.identity import UserRole
from app.services.gl_schema_check import gl_ledger_schema_installed
from app.db.models.gl import (
    GlAccount,
    GlAccountType,
    GlAccountingPeriod,
    GlAuditEvent,
    GlBillingBatch,
    GlDimension,
    GlDimensionValue,
    GlJournalEntry,
    GlJournalLine,
    GlJournalLineDimensionTag,
    GlJournalStatus,
    GlLegalEntity,
    GlNormalBalance,
    GlPeriodStatus,
    GlSubledgerKind,
    GlRecurringEntryTemplate,
    GlRecurringEntryTemplateLine,
    GlRecurringFrequency,
    GlRevenueRecognitionSchedule,
)
from app.models.general_ledger import (
    GlAccountCreateRequest,
    GlAccountResponse,
    GlAccountTypeEnum,
    GlAccountUpdateRequest,
    GlAccountingPeriodResponse,
    GlAccountingPeriodUpdateRequest,
    GlAuditEventResponse,
    GlBillingBatchResponse,
    GlDimensionResponse,
    GlDimensionValueResponse,
    GlFxQuoteResponse,
    GlJournalEntryCreateRequest,
    GlJournalEntryResponse,
    GlJournalEntryReverseRequest,
    GlJournalEntryUpdateRequest,
    GlJournalLineInput,
    GlJournalLineResponse,
    GlJournalStatusEnum,
    GlLegalEntityResponse,
    GlRecurringFrequencyEnum,
    GlRecurringTemplateCreateRequest,
    GlRecurringTemplateLineInput,
    GlRecurringTemplateGenerateJournalRequest,
    GlRecurringTemplateLineResponse,
    GlRecurringTemplateResponse,
    GlRecurringTemplateUpdateRequest,
    GlRecognitionMethodEnum,
    GlRevenueScheduleResponse,
    GlRevenueWaterfallPoint,
    GlTrialBalanceRowResponse,
)


def _static_fx_rate(from_ccy: str, to_ccy: str) -> Decimal:
    f = from_ccy.upper().strip()
    t = to_ccy.upper().strip()
    if f == t:
        return Decimal("1")
    # Demo mock rates vs EUR base
    rates_to_eur = {"EUR": Decimal("1"), "USD": Decimal("0.92"), "GBP": Decimal("1.17")}
    if f not in rates_to_eur or t not in rates_to_eur:
        return Decimal("1")
    # f -> t = (f in EUR) / (t in EUR) = rate f/eur * eur/t
    fe = rates_to_eur[f]
    te = rates_to_eur[t]
    return (fe / te).quantize(Decimal("0.00000001"))


def _line_sides_valid(debit: Decimal, credit: Decimal) -> bool:
    if debit < 0 or credit < 0:
        return False
    if debit > 0 and credit > 0:
        return False
    return True


def _sum_lines(lines: Sequence[GlJournalLineInput | GlJournalLine]) -> tuple[Decimal, Decimal]:
    td = Decimal("0")
    tc = Decimal("0")
    for ln in lines:
        td += ln.debit
        tc += ln.credit
    return td, tc


def _reject_explicit_null_for_required_field(
    field_name: str, value: object, *, code: str, message: str
) -> None:
    """Raise when a PATCH body explicitly sets a field to null but the column is NOT NULL."""
    if value is None:
        raise ValidationError(message, code=code, fields={field_name: "cannot be null"})


def _trial_balance_net_balance(
    normal: GlNormalBalance, debit_total: Decimal, credit_total: Decimal
) -> Decimal:
    """Signed balance in the account's natural (normal-balance) direction."""
    if normal == GlNormalBalance.DEBIT:
        return (debit_total - credit_total).quantize(Decimal("0.0001"))
    return (credit_total - debit_total).quantize(Decimal("0.0001"))


class GlService:
    def __init__(
        self,
        db: AsyncSession,
        organization_id: str,
        *,
        actor_user_id: str | None = None,
        actor_role: str | None = None,
    ) -> None:
        self.db = db
        self.organization_id = organization_id
        self.actor_user_id = actor_user_id
        self._actor_role = actor_role
        self._gl_schema_confirmed: bool = False

    async def _gl_tables_ready(self) -> bool:
        """True once GL migration is applied; re-probes until then (no stale False cache)."""
        if self._gl_schema_confirmed:
            return True
        if await gl_ledger_schema_installed(self.db):
            self._gl_schema_confirmed = True
            return True
        return False

    async def _require_gl_for_write(self) -> None:
        if not await self._gl_tables_ready():
            raise ServiceUnavailableError(
                "General ledger tables are not installed. From the backend directory run: "
                "uv run alembic upgrade head",
                code="gl.schema_missing",
            )

    async def _entity(self, entity_id: str) -> GlLegalEntity:
        row = await self.db.scalar(
            select(GlLegalEntity).where(
                GlLegalEntity.id == entity_id,
                GlLegalEntity.organization_id == self.organization_id,
            )
        )
        if not row:
            raise NotFoundError("Legal entity not found", code="gl.entity_not_found")
        return row

    async def _account(self, account_id: str) -> GlAccount:
        row = await self.db.scalar(
            select(GlAccount).where(
                GlAccount.id == account_id,
                GlAccount.organization_id == self.organization_id,
                GlAccount.deleted_at.is_(None),
            )
        )
        if not row:
            raise NotFoundError("Account not found", code="gl.account_not_found")
        return row

    async def _period(self, period_id: str) -> GlAccountingPeriod:
        row = await self.db.scalar(
            select(GlAccountingPeriod).where(
                GlAccountingPeriod.id == period_id,
                GlAccountingPeriod.organization_id == self.organization_id,
            )
        )
        if not row:
            raise NotFoundError("Accounting period not found", code="gl.period_not_found")
        return row

    async def _validate_manual_lines(self, lines: Sequence[GlJournalLineInput]) -> None:
        for i, ln in enumerate(lines):
            if not _line_sides_valid(ln.debit, ln.credit):
                raise ValidationError(
                    "Each journal line must have only debit or only credit (non-negative).",
                    code="gl.journal.invalid_line_sides",
                    fields={f"lines.{i}": "Invalid debit/credit combination"},
                )
        td, tc = _sum_lines(lines)
        if td != tc:
            raise ValidationError(
                "Journal entry is not balanced (debits must equal credits).",
                code="gl.journal.unbalanced",
                fields={"lines": f"Debits {td} != credits {tc}"},
            )
        if td == 0 and tc == 0:
            raise ValidationError(
                "Journal entry totals cannot be zero.",
                code="gl.journal.zero_totals",
                fields={"lines": "At least one non-zero amount is required"},
            )
        acc_ids = {ln.account_id for ln in lines}
        if not acc_ids:
            return
        result = await self.db.execute(
            select(GlAccount).where(
                GlAccount.organization_id == self.organization_id,
                GlAccount.id.in_(acc_ids),
                GlAccount.deleted_at.is_(None),
            )
        )
        found = {a.id: a for a in result.scalars().all()}
        for aid in acc_ids:
            if aid not in found:
                raise NotFoundError("Account not found", code="gl.account_not_found")
            if found[aid].is_control_account:
                raise ValidationError(
                    "Control accounts cannot be selected on manual journal lines.",
                    code="gl.journal.control_account_forbidden",
                    fields={"account_id": found[aid].code},
                )

    async def _dimension_values_owned(self, value_ids: Sequence[str]) -> None:
        if not value_ids:
            return
        result = await self.db.execute(
            select(GlDimensionValue.id).where(
                GlDimensionValue.organization_id == self.organization_id,
                GlDimensionValue.id.in_(value_ids),
                GlDimensionValue.deleted_at.is_(None),
            )
        )
        found = {r[0] for r in result.all()}
        for vid in value_ids:
            if vid not in found:
                raise NotFoundError(
                    "Dimension value not found", code="gl.dimension_value_not_found"
                )

    async def _append_audit(
        self,
        *,
        subject_type: str,
        subject_id: str,
        action: str,
        payload: dict | None = None,
    ) -> None:
        self.db.add(
            GlAuditEvent(
                organization_id=self.organization_id,
                subject_type=subject_type,
                subject_id=subject_id,
                action=action,
                actor_user_id=self.actor_user_id,
                payload=payload,
            )
        )

    def _journal_to_response(self, entry: GlJournalEntry) -> GlJournalEntryResponse:
        """Map journal ORM row (including ``entry_date``, ``reversed_from_id``) to API DTO."""
        line_res: list[GlJournalLineResponse] = []
        td = Decimal("0")
        tc = Decimal("0")
        for ln in sorted(entry.lines, key=lambda x: x.line_order):
            td += ln.debit
            tc += ln.credit
            dv_ids = [t.dimension_value_id for t in ln.dimension_tags]
            line_res.append(
                GlJournalLineResponse(
                    id=ln.id,
                    account_id=ln.account_id,
                    description=ln.description,
                    debit=ln.debit,
                    credit=ln.credit,
                    line_order=ln.line_order,
                    dimension_value_ids=dv_ids,
                )
            )
        return GlJournalEntryResponse(
            id=entry.id,
            legal_entity_id=entry.legal_entity_id,
            posting_period_id=entry.posting_period_id,
            status=GlJournalStatusEnum(entry.status.value),
            document_currency=entry.document_currency,
            base_currency=entry.base_currency,
            fx_rate_to_base=entry.fx_rate_to_base,
            memo=entry.memo,
            reference=entry.reference,
            source_batch_id=entry.source_batch_id,
            entry_date=entry.entry_date,
            reversed_from_id=entry.reversed_from_id,
            posted_at=entry.posted_at,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
            lines=line_res,
            total_debit=td,
            total_credit=tc,
        )

    async def list_entities(self) -> list[GlLegalEntityResponse]:
        if not await self._gl_tables_ready():
            return []
        result = await self.db.execute(
            select(GlLegalEntity)
            .where(GlLegalEntity.organization_id == self.organization_id)
            .order_by(GlLegalEntity.is_primary.desc(), GlLegalEntity.code)
        )
        rows = result.scalars().all()
        return [GlLegalEntityResponse.model_validate(r) for r in rows]

    async def list_accounts(self) -> list[GlAccountResponse]:
        if not await self._gl_tables_ready():
            return []
        result = await self.db.execute(
            select(GlAccount)
            .where(
                GlAccount.organization_id == self.organization_id,
                GlAccount.deleted_at.is_(None),
            )
            .order_by(GlAccount.sort_order, GlAccount.code)
        )
        return [GlAccountResponse.model_validate(r) for r in result.scalars().all()]

    async def create_account(self, body: GlAccountCreateRequest) -> GlAccountResponse:
        await self._require_gl_for_write()
        if body.parent_account_id:
            await self._account(body.parent_account_id)
        dup = await self.db.scalar(
            select(GlAccount.id).where(
                GlAccount.organization_id == self.organization_id,
                GlAccount.code == body.code,
                GlAccount.deleted_at.is_(None),
            )
        )
        if dup:
            raise ValidationError(
                "Account code already exists.",
                code="gl.account.duplicate_code",
                fields={"code": "Must be unique per organization"},
            )
        row = GlAccount(
            organization_id=self.organization_id,
            parent_account_id=body.parent_account_id,
            code=body.code.strip(),
            name=body.name.strip(),
            account_type=GlAccountType(body.account_type.value),
            normal_balance=GlNormalBalance(body.normal_balance.value),
            subledger_kind=GlSubledgerKind(body.subledger_kind.value),
            is_active=body.is_active,
            is_control_account=body.is_control_account,
            sort_order=body.sort_order,
        )
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return GlAccountResponse.model_validate(row)

    async def update_account(
        self, account_id: str, body: GlAccountUpdateRequest
    ) -> GlAccountResponse:
        await self._require_gl_for_write()
        row = await self._account(account_id)
        fs = body.model_fields_set
        if "name" in fs:
            _reject_explicit_null_for_required_field(
                "name",
                body.name,
                code="gl.account.name_required",
                message="Account name is required",
            )
            row.name = body.name.strip()  # type: ignore[union-attr]
        if "parent_account_id" in fs:
            pid = body.parent_account_id
            if pid is None:
                row.parent_account_id = None
            else:
                if pid == account_id:
                    raise ValidationError(
                        "Account cannot be its own parent.",
                        code="gl.account.invalid_parent",
                        fields={"parent_account_id": "Self-reference"},
                    )
                await self._account(pid)
                row.parent_account_id = pid
        if "account_type" in fs:
            _reject_explicit_null_for_required_field(
                "account_type",
                body.account_type,
                code="gl.account.type_required",
                message="Account type is required",
            )
            row.account_type = GlAccountType(body.account_type.value)  # type: ignore[union-attr]
        if "normal_balance" in fs:
            _reject_explicit_null_for_required_field(
                "normal_balance",
                body.normal_balance,
                code="gl.account.normal_balance_required",
                message="Normal balance is required",
            )
            row.normal_balance = GlNormalBalance(body.normal_balance.value)  # type: ignore[union-attr]
        if "subledger_kind" in fs:
            _reject_explicit_null_for_required_field(
                "subledger_kind",
                body.subledger_kind,
                code="gl.account.subledger_required",
                message="Subledger kind is required",
            )
            row.subledger_kind = GlSubledgerKind(body.subledger_kind.value)  # type: ignore[union-attr]
        if "is_active" in fs:
            _reject_explicit_null_for_required_field(
                "is_active",
                body.is_active,
                code="gl.account.is_active_required",
                message="is_active is required",
            )
            row.is_active = body.is_active  # type: ignore[assignment]
        if "is_control_account" in fs:
            _reject_explicit_null_for_required_field(
                "is_control_account",
                body.is_control_account,
                code="gl.account.is_control_required",
                message="is_control_account is required",
            )
            row.is_control_account = body.is_control_account  # type: ignore[assignment]
        if "sort_order" in fs:
            _reject_explicit_null_for_required_field(
                "sort_order",
                body.sort_order,
                code="gl.account.sort_order_required",
                message="sort_order is required",
            )
            row.sort_order = body.sort_order  # type: ignore[assignment]
        await self.db.commit()
        await self.db.refresh(row)
        return GlAccountResponse.model_validate(row)

    async def list_periods(self) -> list[GlAccountingPeriodResponse]:
        if not await self._gl_tables_ready():
            return []
        result = await self.db.execute(
            select(GlAccountingPeriod)
            .where(GlAccountingPeriod.organization_id == self.organization_id)
            .order_by(GlAccountingPeriod.period_start.desc())
        )
        return [GlAccountingPeriodResponse.model_validate(r) for r in result.scalars().all()]

    async def update_period(
        self, period_id: str, body: GlAccountingPeriodUpdateRequest
    ) -> GlAccountingPeriodResponse:
        await self._require_gl_for_write()
        row = await self._period(period_id)
        previous = row.status
        new_status = GlPeriodStatus(body.status.value)
        if previous == GlPeriodStatus.HARD_CLOSE and new_status != GlPeriodStatus.HARD_CLOSE:
            if not body.acknowledge_break_hard_close:
                raise ValidationError(
                    "A hard-closed period cannot be moved to a weaker status without "
                    "explicit acknowledgment (acknowledge_break_hard_close).",
                    code="gl.period.hard_close_locked",
                    fields={
                        "status": "Hard close is irreversible for routine users; "
                        "set acknowledge_break_hard_close after controlled review."
                    },
                )
            if (self._actor_role or "") != UserRole.OWNER.value:
                raise ValidationError(
                    "Reopening or relaxing a hard-closed period requires the "
                    "organization owner role.",
                    code="gl.period.hard_close_reopen_forbidden",
                    fields={"role": self._actor_role or "none"},
                )
        row.status = new_status
        await self._append_audit(
            subject_type="gl_accounting_period",
            subject_id=period_id,
            action="period_status_updated",
            payload={
                "previous_status": previous.value,
                "new_status": new_status.value,
                "broke_hard_close": previous == GlPeriodStatus.HARD_CLOSE
                and new_status != GlPeriodStatus.HARD_CLOSE,
            },
        )
        await self.db.commit()
        await self.db.refresh(row)
        return GlAccountingPeriodResponse.model_validate(row)

    async def list_dimensions(self) -> list[GlDimensionResponse]:
        if not await self._gl_tables_ready():
            return []
        result = await self.db.execute(
            select(GlDimension)
            .where(
                GlDimension.organization_id == self.organization_id,
                GlDimension.deleted_at.is_(None),
            )
            .options(selectinload(GlDimension.values))
            .order_by(GlDimension.key)
        )
        dims = result.scalars().unique().all()
        out: list[GlDimensionResponse] = []
        for d in dims:
            vals = [
                GlDimensionValueResponse.model_validate(v)
                for v in d.values
                if v.deleted_at is None
            ]
            out.append(
                GlDimensionResponse(
                    id=d.id,
                    key=d.key,
                    label=d.label,
                    values=vals,
                )
            )
        return out

    async def list_journal_entries(
        self,
        *,
        legal_entity_id: str | None,
        consolidated: bool,
        account_id: str | None,
        status: str | None,
        posting_period_id: str | None,
        source_batch_id: str | None,
    ) -> list[GlJournalEntryResponse]:
        if not await self._gl_tables_ready():
            return []
        stmt = (
            select(GlJournalEntry)
            .where(GlJournalEntry.organization_id == self.organization_id)
            .options(
                selectinload(GlJournalEntry.lines).selectinload(
                    GlJournalLine.dimension_tags
                )
            )
        )
        if not consolidated and legal_entity_id:
            stmt = stmt.where(GlJournalEntry.legal_entity_id == legal_entity_id)
        if status:
            stmt = stmt.where(GlJournalEntry.status == GlJournalStatus(status))
        if posting_period_id:
            stmt = stmt.where(GlJournalEntry.posting_period_id == posting_period_id)
        if source_batch_id:
            stmt = stmt.where(GlJournalEntry.source_batch_id == source_batch_id)
        if account_id:
            stmt = stmt.where(
                GlJournalEntry.id.in_(
                    select(GlJournalLine.journal_entry_id).where(
                        GlJournalLine.organization_id == self.organization_id,
                        GlJournalLine.account_id == account_id,
                    )
                )
            )
        stmt = stmt.order_by(GlJournalEntry.created_at.desc())
        result = await self.db.execute(stmt)
        entries = result.scalars().unique().all()
        return [self._journal_to_response(e) for e in entries]

    async def get_journal_entry(self, entry_id: str) -> GlJournalEntryResponse:
        if not await self._gl_tables_ready():
            raise NotFoundError("Journal entry not found", code="gl.journal_not_found")
        entry = await self.db.scalar(
            select(GlJournalEntry)
            .where(
                GlJournalEntry.id == entry_id,
                GlJournalEntry.organization_id == self.organization_id,
            )
            .options(
                selectinload(GlJournalEntry.lines).selectinload(
                    GlJournalLine.dimension_tags
                )
            )
        )
        if not entry:
            raise NotFoundError("Journal entry not found", code="gl.journal_not_found")
        return self._journal_to_response(entry)

    async def create_journal_entry(
        self, body: GlJournalEntryCreateRequest
    ) -> GlJournalEntryResponse:
        await self._require_gl_for_write()
        await self._entity(body.legal_entity_id)
        await self._validate_manual_lines(body.lines)
        for ln in body.lines:
            await self._dimension_values_owned(ln.dimension_value_ids)

        fx = body.fx_rate_to_base
        if fx is None:
            fx = _static_fx_rate(body.document_currency, body.base_currency)

        entry = GlJournalEntry(
            organization_id=self.organization_id,
            legal_entity_id=body.legal_entity_id,
            posting_period_id=body.posting_period_id,
            status=GlJournalStatus.DRAFT,
            document_currency=body.document_currency.upper(),
            base_currency=body.base_currency.upper(),
            fx_rate_to_base=fx,
            memo=body.memo,
            reference=body.reference,
            entry_date=body.entry_date,
            reversed_from_id=None,
        )
        self.db.add(entry)
        await self.db.flush()
        for ln in body.lines:
            line = GlJournalLine(
                organization_id=self.organization_id,
                journal_entry_id=entry.id,
                account_id=ln.account_id,
                description=ln.description,
                debit=ln.debit,
                credit=ln.credit,
                line_order=ln.line_order,
            )
            self.db.add(line)
            await self.db.flush()
            for dvid in ln.dimension_value_ids:
                self.db.add(
                    GlJournalLineDimensionTag(
                        journal_line_id=line.id,
                        dimension_value_id=dvid,
                    )
                )
        await self._append_audit(
            subject_type="journal_entry",
            subject_id=entry.id,
            action="created",
            payload={"memo": body.memo},
        )
        await self.db.commit()
        await self.db.refresh(entry)
        return await self.get_journal_entry(entry.id)

    async def update_journal_entry(
        self, entry_id: str, body: GlJournalEntryUpdateRequest
    ) -> GlJournalEntryResponse:
        await self._require_gl_for_write()
        entry = await self.db.scalar(
            select(GlJournalEntry)
            .where(
                GlJournalEntry.id == entry_id,
                GlJournalEntry.organization_id == self.organization_id,
            )
            .options(
                selectinload(GlJournalEntry.lines).selectinload(
                    GlJournalLine.dimension_tags
                )
            )
        )
        if not entry:
            raise NotFoundError("Journal entry not found", code="gl.journal_not_found")
        if entry.status != GlJournalStatus.DRAFT:
            raise ValidationError(
                "Only draft journal entries can be edited.",
                code="gl.journal.immutable",
                fields={"status": "posted"},
            )
        fs = body.model_fields_set
        if "posting_period_id" in fs:
            pid = body.posting_period_id
            if pid:
                await self._period(pid)
            entry.posting_period_id = pid
        if "entry_date" in fs:
            _reject_explicit_null_for_required_field(
                "entry_date",
                body.entry_date,
                code="gl.journal.entry_date_required",
                message="entry_date is required",
            )
            entry.entry_date = body.entry_date  # type: ignore[assignment]
        if "document_currency" in fs:
            _reject_explicit_null_for_required_field(
                "document_currency",
                body.document_currency,
                code="gl.journal.document_currency_required",
                message="document_currency is required",
            )
            entry.document_currency = body.document_currency.upper()  # type: ignore[union-attr]
        if "base_currency" in fs:
            _reject_explicit_null_for_required_field(
                "base_currency",
                body.base_currency,
                code="gl.journal.base_currency_required",
                message="base_currency is required",
            )
            entry.base_currency = body.base_currency.upper()  # type: ignore[union-attr]
        if "fx_rate_to_base" in fs:
            entry.fx_rate_to_base = body.fx_rate_to_base
        if "memo" in fs:
            entry.memo = body.memo
        if "reference" in fs:
            entry.reference = body.reference
        if "lines" in fs:
            if body.lines is None:
                raise ValidationError(
                    "Journal lines cannot be null; omit the field or send a full line list.",
                    code="gl.journal.lines_required",
                    fields={"lines": "cannot be null"},
                )
            await self._validate_manual_lines(body.lines)
            for ln in body.lines:
                await self._dimension_values_owned(ln.dimension_value_ids)
            await self.db.execute(
                delete(GlJournalLine).where(GlJournalLine.journal_entry_id == entry.id)
            )
            await self.db.flush()
            for ln in body.lines:
                line = GlJournalLine(
                    organization_id=self.organization_id,
                    journal_entry_id=entry.id,
                    account_id=ln.account_id,
                    description=ln.description,
                    debit=ln.debit,
                    credit=ln.credit,
                    line_order=ln.line_order,
                )
                self.db.add(line)
                await self.db.flush()
                for dvid in ln.dimension_value_ids:
                    self.db.add(
                        GlJournalLineDimensionTag(
                            journal_line_id=line.id,
                            dimension_value_id=dvid,
                        )
                    )
        await self._append_audit(
            subject_type="journal_entry",
            subject_id=entry.id,
            action="updated",
        )
        await self.db.commit()
        return await self.get_journal_entry(entry_id)

    async def post_journal_entry(self, entry_id: str) -> GlJournalEntryResponse:
        await self._require_gl_for_write()
        entry = await self.db.scalar(
            select(GlJournalEntry)
            .where(
                GlJournalEntry.id == entry_id,
                GlJournalEntry.organization_id == self.organization_id,
            )
            .options(
                selectinload(GlJournalEntry.lines).selectinload(
                    GlJournalLine.dimension_tags
                )
            )
        )
        if not entry:
            raise NotFoundError("Journal entry not found", code="gl.journal_not_found")
        if entry.status != GlJournalStatus.DRAFT:
            raise ValidationError(
                "Journal is already posted.",
                code="gl.journal.already_posted",
                fields={"status": "posted"},
            )
        lines = [
            GlJournalLineInput(
                account_id=ln.account_id,
                description=ln.description,
                debit=ln.debit,
                credit=ln.credit,
                line_order=ln.line_order,
                dimension_value_ids=[t.dimension_value_id for t in ln.dimension_tags],
            )
            for ln in entry.lines
        ]
        await self._validate_manual_lines(lines)
        if entry.posting_period_id:
            per = await self._period(entry.posting_period_id)
            if per.status == GlPeriodStatus.HARD_CLOSE:
                raise ValidationError(
                    "Cannot post into a hard-closed period.",
                    code="gl.period.hard_closed",
                    fields={"posting_period_id": per.label},
                )
        entry.status = GlJournalStatus.POSTED
        entry.posted_at = datetime.now(timezone.utc)
        await self._append_audit(
            subject_type="journal_entry",
            subject_id=entry.id,
            action="posted",
        )
        await self.db.commit()
        return await self.get_journal_entry(entry_id)

    async def reverse_journal_entry(
        self,
        entry_id: str,
        body: GlJournalEntryReverseRequest | None,
    ) -> GlJournalEntryResponse:
        """Create a balanced draft journal that swaps debits/credits of a posted entry."""
        await self._require_gl_for_write()
        opts = body or GlJournalEntryReverseRequest()
        original = await self.db.scalar(
            select(GlJournalEntry)
            .where(
                GlJournalEntry.id == entry_id,
                GlJournalEntry.organization_id == self.organization_id,
            )
            .options(
                selectinload(GlJournalEntry.lines).selectinload(
                    GlJournalLine.dimension_tags
                )
            )
        )
        if not original:
            raise NotFoundError("Journal entry not found", code="gl.journal_not_found")
        if original.status != GlJournalStatus.POSTED:
            raise ValidationError(
                "Only posted journal entries can be reversed.",
                code="gl.journal.reverse_requires_posted",
                fields={"status": str(original.status.value)},
            )
        dup = await self.db.scalar(
            select(GlJournalEntry.id).where(
                GlJournalEntry.organization_id == self.organization_id,
                GlJournalEntry.reversed_from_id == original.id,
                GlJournalEntry.status == GlJournalStatus.POSTED,
            )
        )
        if dup:
            raise ValidationError(
                "A posted reversal already exists for this journal entry.",
                code="gl.journal.already_reversed",
                fields={"reversal_id": dup},
            )
        rev_date = opts.entry_date
        if rev_date is None:
            rev_date = datetime.now(timezone.utc).date()
        memo = opts.memo
        if memo is None:
            ref = original.reference or original.id
            memo = f"Reversal of journal {ref}"
        ref_out = opts.reference

        entry = GlJournalEntry(
            organization_id=self.organization_id,
            legal_entity_id=original.legal_entity_id,
            posting_period_id=original.posting_period_id,
            status=GlJournalStatus.DRAFT,
            document_currency=original.document_currency,
            base_currency=original.base_currency,
            fx_rate_to_base=original.fx_rate_to_base,
            memo=memo,
            reference=ref_out,
            source_batch_id=None,
            entry_date=rev_date,
            reversed_from_id=original.id,
        )
        self.db.add(entry)
        await self.db.flush()
        for ln in sorted(original.lines, key=lambda x: x.line_order):
            desc = ln.description
            if desc:
                desc = f"Reversal: {desc}"
            else:
                desc = "Reversal"
            line = GlJournalLine(
                organization_id=self.organization_id,
                journal_entry_id=entry.id,
                account_id=ln.account_id,
                description=desc,
                debit=ln.credit,
                credit=ln.debit,
                line_order=ln.line_order,
            )
            self.db.add(line)
            await self.db.flush()
            for tag in ln.dimension_tags:
                self.db.add(
                    GlJournalLineDimensionTag(
                        journal_line_id=line.id,
                        dimension_value_id=tag.dimension_value_id,
                    )
                )
        await self._append_audit(
            subject_type="journal_entry",
            subject_id=entry.id,
            action="reversal_created",
            payload={"reversed_from_id": original.id},
        )
        await self.db.commit()
        return await self.get_journal_entry(entry.id)

    async def list_audit_for_journal(self, entry_id: str) -> list[GlAuditEventResponse]:
        if not await self._gl_tables_ready():
            return []
        await self.get_journal_entry(entry_id)
        result = await self.db.execute(
            select(GlAuditEvent)
            .where(
                GlAuditEvent.organization_id == self.organization_id,
                GlAuditEvent.subject_type == "journal_entry",
                GlAuditEvent.subject_id == entry_id,
            )
            .order_by(GlAuditEvent.created_at.asc())
        )
        return [GlAuditEventResponse.model_validate(r) for r in result.scalars().all()]

    async def list_billing_batches(self) -> list[GlBillingBatchResponse]:
        if not await self._gl_tables_ready():
            return []
        result = await self.db.execute(
            select(GlBillingBatch)
            .where(GlBillingBatch.organization_id == self.organization_id)
            .order_by(GlBillingBatch.received_at.desc())
        )
        return [GlBillingBatchResponse.model_validate(r) for r in result.scalars().all()]

    async def list_revenue_schedules(
        self,
        *,
        legal_entity_id: str | None,
        consolidated: bool,
    ) -> list[GlRevenueScheduleResponse]:
        if not await self._gl_tables_ready():
            return []
        stmt = select(GlRevenueRecognitionSchedule).where(
            GlRevenueRecognitionSchedule.organization_id == self.organization_id
        )
        if not consolidated and legal_entity_id:
            stmt = stmt.where(
                GlRevenueRecognitionSchedule.legal_entity_id == legal_entity_id
            )
        stmt = stmt.options(
            selectinload(GlRevenueRecognitionSchedule.lines)
        ).order_by(GlRevenueRecognitionSchedule.contract_name)
        result = await self.db.execute(stmt)
        rows = result.scalars().unique().all()
        out: list[GlRevenueScheduleResponse] = []
        for sch in rows:
            lines = sorted(sch.lines, key=lambda x: x.period_month)
            out.append(
                GlRevenueScheduleResponse(
                    id=sch.id,
                    legal_entity_id=sch.legal_entity_id,
                    contract_name=sch.contract_name,
                    currency=sch.currency,
                    total_contract_value=sch.total_contract_value,
                    recognition_method=GlRecognitionMethodEnum(sch.recognition_method.value),
                    lines=[
                        GlRevenueWaterfallPoint(
                            period_month=ln.period_month,
                            deferred_opening=ln.deferred_opening,
                            recognized_in_period=ln.recognized_in_period,
                            deferred_closing=ln.deferred_closing,
                        )
                        for ln in lines
                    ],
                )
            )
        return out

    async def trial_balance(
        self,
        *,
        legal_entity_id: str | None,
        consolidated: bool,
        posting_period_id: str | None,
    ) -> list[GlTrialBalanceRowResponse]:
        """Aggregate posted lines per account; includes ``account_type`` and signed ``net_balance``."""
        if not await self._gl_tables_ready():
            return []
        if posting_period_id:
            await self._period(posting_period_id)

        je_cond = [
            GlJournalEntry.organization_id == self.organization_id,
            GlJournalEntry.status == GlJournalStatus.POSTED,
        ]
        if not consolidated and legal_entity_id:
            je_cond.append(GlJournalEntry.legal_entity_id == legal_entity_id)
        if posting_period_id:
            je_cond.append(GlJournalEntry.posting_period_id == posting_period_id)

        stmt = (
            select(
                GlJournalLine.account_id,
                func.coalesce(func.sum(GlJournalLine.debit), 0),
                func.coalesce(func.sum(GlJournalLine.credit), 0),
            )
            .join(GlJournalEntry, GlJournalLine.journal_entry_id == GlJournalEntry.id)
            .where(and_(*je_cond))
            .group_by(GlJournalLine.account_id)
        )
        result = await self.db.execute(stmt)
        tuples = result.all()
        if not tuples:
            return []

        acc_result = await self.db.execute(
            select(GlAccount).where(
                GlAccount.organization_id == self.organization_id,
                GlAccount.id.in_([t[0] for t in tuples]),
                GlAccount.deleted_at.is_(None),
            )
        )
        accounts = {a.id: a for a in acc_result.scalars().all()}
        built: list[tuple[str, GlTrialBalanceRowResponse]] = []
        for aid, td, tc in tuples:
            a = accounts.get(aid)
            if not a:
                continue
            net = _trial_balance_net_balance(a.normal_balance, td, tc)
            built.append(
                (
                    a.code,
                    GlTrialBalanceRowResponse(
                        account_id=aid,
                        account_code=a.code,
                        account_name=a.name,
                        account_type=GlAccountTypeEnum(a.account_type.value),
                        debit_total=td,
                        credit_total=tc,
                        net_balance=net,
                    ),
                )
            )
        built.sort(key=lambda x: x[0])
        return [b[1] for b in built]

    def fx_quote(self, from_currency: str, to_currency: str) -> GlFxQuoteResponse:
        r = _static_fx_rate(from_currency, to_currency)
        return GlFxQuoteResponse(
            from_currency=from_currency.upper(),
            to_currency=to_currency.upper(),
            rate=r,
        )

    async def list_recurring_templates(
        self,
        *,
        legal_entity_id: str | None,
        consolidated: bool,
    ) -> list[GlRecurringTemplateResponse]:
        if not await self._gl_tables_ready():
            return []
        stmt = select(GlRecurringEntryTemplate).where(
            GlRecurringEntryTemplate.organization_id == self.organization_id
        )
        if not consolidated and legal_entity_id:
            stmt = stmt.where(
                GlRecurringEntryTemplate.legal_entity_id == legal_entity_id
            )
        stmt = stmt.options(
            selectinload(GlRecurringEntryTemplate.template_lines)
        ).order_by(GlRecurringEntryTemplate.name)
        result = await self.db.execute(stmt)
        rows = result.scalars().unique().all()
        out: list[GlRecurringTemplateResponse] = []
        for t in rows:
            tls = sorted(t.template_lines, key=lambda x: x.line_order)
            out.append(
                GlRecurringTemplateResponse(
                    id=t.id,
                    legal_entity_id=t.legal_entity_id,
                    name=t.name,
                    memo=t.memo,
                    frequency=GlRecurringFrequencyEnum(t.frequency.value),
                    day_of_month=t.day_of_month,
                    is_active=t.is_active,
                    template_lines=[
                        GlRecurringTemplateLineResponse.model_validate(tl) for tl in tls
                    ],
                )
            )
        return out

    async def _validate_template_lines(self, lines: Sequence[GlRecurringTemplateLineInput]) -> None:
        for i, ln in enumerate(lines):
            if not _line_sides_valid(ln.debit, ln.credit):
                raise ValidationError(
                    "Each template line must have only debit or only credit.",
                    code="gl.template.invalid_line_sides",
                    fields={f"template_lines.{i}": "Invalid debit/credit combination"},
                )
        td = sum((x.debit for x in lines), Decimal("0"))
        tc = sum((x.credit for x in lines), Decimal("0"))
        if td != tc:
            raise ValidationError(
                "Template is not balanced.",
                code="gl.template.unbalanced",
                fields={"template_lines": f"Debits {td} != credits {tc}"},
            )
        if td == 0:
            raise ValidationError(
                "Template totals cannot be zero.",
                code="gl.template.zero_totals",
                fields={"template_lines": "At least one non-zero amount is required"},
            )
        acc_ids = {ln.account_id for ln in lines}
        result = await self.db.execute(
            select(GlAccount).where(
                GlAccount.organization_id == self.organization_id,
                GlAccount.id.in_(acc_ids),
                GlAccount.deleted_at.is_(None),
            )
        )
        found = {a.id for a in result.scalars().all()}
        for aid in acc_ids:
            if aid not in found:
                raise NotFoundError("Account not found", code="gl.account_not_found")

    async def create_recurring_template(
        self, body: GlRecurringTemplateCreateRequest
    ) -> GlRecurringTemplateResponse:
        await self._require_gl_for_write()
        await self._entity(body.legal_entity_id)
        await self._validate_template_lines(body.template_lines)
        t = GlRecurringEntryTemplate(
            organization_id=self.organization_id,
            legal_entity_id=body.legal_entity_id,
            name=body.name.strip(),
            memo=body.memo,
            frequency=GlRecurringFrequency(body.frequency.value),
            day_of_month=body.day_of_month,
            is_active=body.is_active,
        )
        self.db.add(t)
        await self.db.flush()
        for ln in body.template_lines:
            self.db.add(
                GlRecurringEntryTemplateLine(
                    organization_id=self.organization_id,
                    template_id=t.id,
                    account_id=ln.account_id,
                    description=ln.description,
                    debit=ln.debit,
                    credit=ln.credit,
                    line_order=ln.line_order,
                )
            )
        await self.db.commit()
        loaded = await self.db.scalar(
            select(GlRecurringEntryTemplate)
            .where(GlRecurringEntryTemplate.id == t.id)
            .options(selectinload(GlRecurringEntryTemplate.template_lines))
        )
        assert loaded is not None
        return self._recurring_to_response(loaded)

    async def update_recurring_template(
        self, template_id: str, body: GlRecurringTemplateUpdateRequest
    ) -> GlRecurringTemplateResponse:
        await self._require_gl_for_write()
        t = await self.db.scalar(
            select(GlRecurringEntryTemplate)
            .where(
                GlRecurringEntryTemplate.id == template_id,
                GlRecurringEntryTemplate.organization_id == self.organization_id,
            )
            .options(selectinload(GlRecurringEntryTemplate.template_lines))
        )
        if not t:
            raise NotFoundError("Template not found", code="gl.template_not_found")
        fs = body.model_fields_set
        if "name" in fs:
            _reject_explicit_null_for_required_field(
                "name",
                body.name,
                code="gl.template.name_required",
                message="Template name is required",
            )
            t.name = body.name.strip()  # type: ignore[union-attr]
        if "memo" in fs:
            t.memo = body.memo
        if "frequency" in fs:
            _reject_explicit_null_for_required_field(
                "frequency",
                body.frequency,
                code="gl.template.frequency_required",
                message="frequency is required",
            )
            t.frequency = GlRecurringFrequency(body.frequency.value)  # type: ignore[union-attr]
        if "day_of_month" in fs:
            _reject_explicit_null_for_required_field(
                "day_of_month",
                body.day_of_month,
                code="gl.template.day_required",
                message="day_of_month is required",
            )
            t.day_of_month = body.day_of_month  # type: ignore[assignment]
        if "is_active" in fs:
            _reject_explicit_null_for_required_field(
                "is_active",
                body.is_active,
                code="gl.template.is_active_required",
                message="is_active is required",
            )
            t.is_active = body.is_active  # type: ignore[assignment]
        if "template_lines" in fs:
            if body.template_lines is None:
                raise ValidationError(
                    "Template lines cannot be null; omit the field or send a full line list.",
                    code="gl.template.lines_required",
                    fields={"template_lines": "cannot be null"},
                )
            await self._validate_template_lines(body.template_lines)
            await self.db.execute(
                delete(GlRecurringEntryTemplateLine).where(
                    GlRecurringEntryTemplateLine.template_id == t.id
                )
            )
            await self.db.flush()
            for ln in body.template_lines:
                self.db.add(
                    GlRecurringEntryTemplateLine(
                        organization_id=self.organization_id,
                        template_id=t.id,
                        account_id=ln.account_id,
                        description=ln.description,
                        debit=ln.debit,
                        credit=ln.credit,
                        line_order=ln.line_order,
                    )
                )
        await self.db.commit()
        loaded = await self.db.scalar(
            select(GlRecurringEntryTemplate)
            .where(GlRecurringEntryTemplate.id == template_id)
            .options(selectinload(GlRecurringEntryTemplate.template_lines))
        )
        assert loaded is not None
        return self._recurring_to_response(loaded)

    async def generate_journal_from_recurring_template(
        self,
        template_id: str,
        body: GlRecurringTemplateGenerateJournalRequest | None,
    ) -> GlJournalEntryResponse:
        """Create a draft journal by copying template lines (scheduler / manual fire)."""
        await self._require_gl_for_write()
        opts = body or GlRecurringTemplateGenerateJournalRequest()
        t = await self.db.scalar(
            select(GlRecurringEntryTemplate)
            .where(
                GlRecurringEntryTemplate.id == template_id,
                GlRecurringEntryTemplate.organization_id == self.organization_id,
            )
            .options(selectinload(GlRecurringEntryTemplate.template_lines))
        )
        if not t:
            raise NotFoundError("Template not found", code="gl.template_not_found")
        if not t.is_active:
            raise ValidationError(
                "Cannot generate a journal from an inactive template.",
                code="gl.template.inactive",
                fields={"is_active": "false"},
            )
        tls = sorted(t.template_lines, key=lambda x: x.line_order)
        if not tls:
            raise ValidationError(
                "Template has no lines to post.",
                code="gl.template.empty",
                fields={"template_lines": "Add at least two balanced lines"},
            )
        entity = await self._entity(t.legal_entity_id)
        entry_d: date = opts.entry_date or datetime.now(timezone.utc).date()
        if opts.posting_period_id:
            await self._period(opts.posting_period_id)
        ccy = entity.functional_currency.strip().upper() or "EUR"
        lines = [
            GlJournalLineInput(
                account_id=tl.account_id,
                description=tl.description,
                debit=tl.debit,
                credit=tl.credit,
                line_order=tl.line_order,
                dimension_value_ids=[],
            )
            for tl in tls
        ]
        memo = (
            opts.memo
            if opts.memo is not None
            else f"Recurring template: {t.name}"
        )
        create_body = GlJournalEntryCreateRequest(
            legal_entity_id=t.legal_entity_id,
            posting_period_id=opts.posting_period_id,
            entry_date=entry_d,
            document_currency=ccy,
            base_currency=ccy,
            fx_rate_to_base=None,
            memo=memo,
            reference=opts.reference,
            lines=lines,
        )
        entry = await self.create_journal_entry(create_body)
        await self._append_audit(
            subject_type="recurring_template",
            subject_id=template_id,
            action="journal_generated",
            payload={"journal_entry_id": entry.id},
        )
        await self.db.commit()
        return entry

    def _recurring_to_response(
        self, t: GlRecurringEntryTemplate
    ) -> GlRecurringTemplateResponse:
        tls = sorted(t.template_lines, key=lambda x: x.line_order)
        return GlRecurringTemplateResponse(
            id=t.id,
            legal_entity_id=t.legal_entity_id,
            name=t.name,
            memo=t.memo,
            frequency=GlRecurringFrequencyEnum(t.frequency.value),
            day_of_month=t.day_of_month,
            is_active=t.is_active,
            template_lines=[
                GlRecurringTemplateLineResponse.model_validate(x) for x in tls
            ],
        )
