"""General ledger ORM — legal entities, CoA, periods, journals, dimensions, IFRS 15 schedules.

Scope: Organization-scoped accounting structures and journal activity.
Contract: All tables carry ``organization_id``; services must filter every query.
"""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


class GlAccountType(str, enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class GlNormalBalance(str, enum.Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class GlSubledgerKind(str, enum.Enum):
    NONE = "none"
    AR = "ar"
    AP = "ap"


class GlPeriodStatus(str, enum.Enum):
    OPEN = "open"
    SOFT_CLOSE = "soft_close"
    HARD_CLOSE = "hard_close"


class GlJournalStatus(str, enum.Enum):
    DRAFT = "draft"
    POSTED = "posted"


class GlRecurringFrequency(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


class GlRecognitionMethod(str, enum.Enum):
    """How contract revenue is allocated into ``GlRevenueRecognitionScheduleLine`` rows."""

    STRAIGHT_LINE = "straight_line"
    MILESTONE = "milestone"
    USAGE_BASED = "usage_based"


def _enum_values(e: type[enum.Enum]) -> list[str]:
    return [x.value for x in e]


class GlLegalEntity(Base):
    __tablename__ = "gl_legal_entities"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    functional_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_gl_legal_entities_org_code"),
        Index("ix_gl_legal_entities_org_primary", "organization_id", "is_primary"),
    )


class GlDimension(Base):
    __tablename__ = "gl_dimensions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    values: Mapped[list["GlDimensionValue"]] = relationship(
        "GlDimensionValue",
        back_populates="dimension",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "key", name="uq_gl_dimensions_org_key"),
    )


class GlDimensionValue(Base):
    __tablename__ = "gl_dimension_values"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    dimension_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_dimensions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dimension: Mapped["GlDimension"] = relationship("GlDimension", back_populates="values")

    __table_args__ = (
        UniqueConstraint(
            "dimension_id", "code", name="uq_gl_dimension_values_dim_code"
        ),
        Index("ix_gl_dimension_values_org_dim", "organization_id", "dimension_id"),
    )


class GlAccount(Base):
    __tablename__ = "gl_accounts"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_account_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[GlAccountType] = mapped_column(
        Enum(
            GlAccountType,
            name="glaccounttype",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    normal_balance: Mapped[GlNormalBalance] = mapped_column(
        Enum(
            GlNormalBalance,
            name="glnormalbalance",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    subledger_kind: Mapped[GlSubledgerKind] = mapped_column(
        Enum(
            GlSubledgerKind,
            name="glsubledgerkind",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=GlSubledgerKind.NONE,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_control_account: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_gl_accounts_org_code"),
        Index("ix_gl_accounts_org_parent", "organization_id", "parent_account_id"),
    )


class GlAccountingPeriod(Base):
    __tablename__ = "gl_accounting_periods"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    label: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[GlPeriodStatus] = mapped_column(
        Enum(
            GlPeriodStatus,
            name="glperiodstatus",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=GlPeriodStatus.OPEN,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "period_start", name="uq_gl_accounting_periods_org_start"
        ),
        Index("ix_gl_accounting_periods_org_status", "organization_id", "status"),
    )


class GlJournalEntry(Base):
    __tablename__ = "gl_journal_entries"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    legal_entity_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_legal_entities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    posting_period_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_accounting_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[GlJournalStatus] = mapped_column(
        Enum(
            GlJournalStatus,
            name="gljournalstatus",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=GlJournalStatus.DRAFT,
    )
    document_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    fx_rate_to_base: Mapped[Decimal | None] = mapped_column(Numeric(18, 8), nullable=True)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source_batch_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    reversed_from_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_journal_entries.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    lines: Mapped[list["GlJournalLine"]] = relationship(
        "GlJournalLine",
        back_populates="journal_entry",
        cascade="all, delete-orphan",
        order_by="GlJournalLine.line_order",  # noqa: SLF001
    )

    __table_args__ = (
        Index("ix_gl_journal_entries_org_entity_status", "organization_id", "legal_entity_id", "status"),
    )


class GlJournalLine(Base):
    __tablename__ = "gl_journal_lines"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    journal_entry_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_journal_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    debit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    credit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    line_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    journal_entry: Mapped["GlJournalEntry"] = relationship(
        "GlJournalEntry", back_populates="lines"
    )
    dimension_tags: Mapped[list["GlJournalLineDimensionTag"]] = relationship(
        "GlJournalLineDimensionTag",
        back_populates="journal_line",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_gl_journal_lines_org_account", "organization_id", "account_id"),
        CheckConstraint(
            "debit >= 0 AND credit >= 0 AND NOT (debit = 0 AND credit = 0) "
            "AND NOT (debit > 0 AND credit > 0)",
            name="ck_gl_journal_lines_debit_credit_line",
        ),
    )


class GlJournalLineDimensionTag(Base):
    __tablename__ = "gl_journal_line_dimension_tags"

    journal_line_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_journal_lines.id", ondelete="CASCADE"),
        primary_key=True,
    )
    dimension_value_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_dimension_values.id", ondelete="CASCADE"),
        primary_key=True,
    )

    journal_line: Mapped["GlJournalLine"] = relationship(
        "GlJournalLine", back_populates="dimension_tags"
    )


class GlBillingBatch(Base):
    __tablename__ = "gl_billing_batches"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    legal_entity_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_legal_entities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    external_batch_id: Mapped[str] = mapped_column(String(128), nullable=False)
    source_system: Mapped[str] = mapped_column(String(64), nullable=False)
    event_count: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "external_batch_id",
            "source_system",
            name="uq_gl_billing_batches_org_ext_src",
        ),
        Index("ix_gl_billing_batches_org_received", "organization_id", "received_at"),
    )


class GlRevenueRecognitionSchedule(Base):
    __tablename__ = "gl_revenue_recognition_schedules"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    legal_entity_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_legal_entities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    contract_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("contracts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    performance_obligation_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("performance_obligations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    contract_name: Mapped[str] = mapped_column(String(255), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    total_contract_value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    recognition_method: Mapped[GlRecognitionMethod] = mapped_column(
        Enum(
            GlRecognitionMethod,
            name="glrecognitionmethod",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=GlRecognitionMethod.STRAIGHT_LINE,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    lines: Mapped[list["GlRevenueRecognitionScheduleLine"]] = relationship(
        "GlRevenueRecognitionScheduleLine",
        back_populates="schedule",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_gl_rev_sched_org_contract",
            "organization_id",
            "contract_id",
        ),
        Index(
            "ix_gl_rev_sched_org_po",
            "organization_id",
            "performance_obligation_id",
        ),
    )


class GlRevenueRecognitionScheduleLine(Base):
    __tablename__ = "gl_revenue_recognition_schedule_lines"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    schedule_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_revenue_recognition_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_month: Mapped[date] = mapped_column(Date, nullable=False)
    deferred_opening: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    recognized_in_period: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    deferred_closing: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)

    schedule: Mapped["GlRevenueRecognitionSchedule"] = relationship(
        "GlRevenueRecognitionSchedule", back_populates="lines"
    )

    __table_args__ = (
        UniqueConstraint(
            "schedule_id",
            "period_month",
            name="uq_gl_rev_sched_lines_sched_month",
        ),
    )


class GlRecurringEntryTemplate(Base):
    __tablename__ = "gl_recurring_entry_templates"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    legal_entity_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_legal_entities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    memo: Mapped[str | None] = mapped_column(Text, nullable=True)
    frequency: Mapped[GlRecurringFrequency] = mapped_column(
        Enum(
            GlRecurringFrequency,
            name="glrecurringfrequency",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    day_of_month: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    template_lines: Mapped[list["GlRecurringEntryTemplateLine"]] = relationship(
        "GlRecurringEntryTemplateLine",
        back_populates="template",
        cascade="all, delete-orphan",
    )


class GlRecurringEntryTemplateLine(Base):
    __tablename__ = "gl_recurring_entry_template_lines"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_recurring_entry_templates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    account_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    debit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    credit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("0"))
    line_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    template: Mapped["GlRecurringEntryTemplate"] = relationship(
        "GlRecurringEntryTemplate", back_populates="template_lines"
    )

    __table_args__ = (
        CheckConstraint(
            "debit >= 0 AND credit >= 0 AND NOT (debit = 0 AND credit = 0) "
            "AND NOT (debit > 0 AND credit > 0)",
            name="ck_gl_recurring_template_lines_debit_credit_line",
        ),
    )


class GlAuditEvent(Base):
    __tablename__ = "gl_audit_events"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    subject_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, index=True
    )

    __table_args__ = (Index("ix_gl_audit_events_org_subject", "organization_id", "subject_type", "subject_id"),)
