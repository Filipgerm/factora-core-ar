"""Contracts domain ORM — IFRS 15 five-step model (Identify → POs → Price → Allocate → Recognize).

Scope
-----
Organization-scoped contracts used for automated revenue recognition. A ``Contract``
represents the customer-facing agreement (master subscription, statement of work,
fixed-price engagement, etc.) and is decomposed into one or more
``PerformanceObligation`` rows — the distinct deliverables the customer gets.

Each PO has a **standalone selling price** (SSP) and an **allocated transaction
price** (ATP). The ratio of SSP → ATP performs IFRS 15 relative-standalone-selling-price
allocation when a contract bundles unequal goods/services.

``ContractAllocation`` links a revenue-emitting *source row* (Stripe invoice line,
unified invoice, manual journal memo) to the ``PerformanceObligation`` whose
revenue it represents. This mapping is the single source of truth for
"which cash event satisfies which obligation" and is consumed by the revrec
scheduler to emit ``GlRevenueRecognitionScheduleLine`` entries.

``ContractDocument`` links supporting documents (PDF contract, order form,
amendment, SOW) stored via the unified ``invoices`` table or object storage.

``ContractModification`` captures amendment history (IFRS 15.20–21 accounting —
prospective vs cumulative catch-up).

Contract
Contract Invariants
-------------------
* ``total_transaction_price`` ≈ Σ ``performance_obligations.allocated_transaction_price``
  (enforced at the service layer; tolerance tracked via ``allocation_variance``).
* Every ``ContractAllocation.amount`` + currency must match the source row's
  currency (FX-normalized upstream).
* Recognition is emitted per PO, not per contract — each PO owns its own
  ``recognition_method`` + ``GlRevenueRecognitionSchedule``.
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


def _enum_values(e: type[enum.Enum]) -> list[str]:
    return [x.value for x in e]


class ContractStatus(str, enum.Enum):
    """Lifecycle of a contract; drives which POs are active for recognition."""

    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELED = "canceled"
    TERMINATED = "terminated"


class ContractSource(str, enum.Enum):
    """Where the contract originated — traces pull/push ingestion."""

    MANUAL = "manual"
    STRIPE_SUBSCRIPTION = "stripe_subscription"
    STRIPE_SUBSCRIPTION_SCHEDULE = "stripe_subscription_schedule"
    HUBSPOT_DEAL = "hubspot_deal"
    OCR_PDF = "ocr_pdf"
    IMPORT_CSV = "import_csv"


class PerformanceObligationKind(str, enum.Enum):
    """Per IFRS 15 — distinguishes point-in-time vs over-time recognition drivers."""

    POINT_IN_TIME = "point_in_time"
    OVER_TIME_STRAIGHT_LINE = "over_time_straight_line"
    OVER_TIME_MILESTONE = "over_time_milestone"
    OVER_TIME_USAGE_BASED = "over_time_usage_based"


class AllocationMethod(str, enum.Enum):
    """How each PO's ``allocated_transaction_price`` was derived from the total.

    * ``RELATIVE_SSP`` — IFRS 15 default: allocate pro-rata to standalone selling price.
    * ``RESIDUAL`` — used when a PO has highly variable standalone pricing.
    * ``EQUAL_SPLIT`` — convenience for MVP bundles with one PO type.
    * ``EXPLICIT`` — user-specified override (must still satisfy the invariant).
    """

    RELATIVE_SSP = "relative_ssp"
    RESIDUAL = "residual"
    EQUAL_SPLIT = "equal_split"
    EXPLICIT = "explicit"


class ContractAllocationSource(str, enum.Enum):
    """Which upstream row triggered this revenue allocation."""

    STRIPE_INVOICE_LINE_ITEM = "stripe_invoice_line_item"
    STRIPE_SUBSCRIPTION_ITEM = "stripe_subscription_item"
    STRIPE_METER_EVENT_SUMMARY = "stripe_meter_event_summary"
    INVOICE = "invoice"
    MANUAL = "manual"


class ContractModificationType(str, enum.Enum):
    """IFRS 15.20–21 modification types."""

    SEPARATE_CONTRACT = "separate_contract"
    TERMINATION_AND_NEW = "termination_and_new"
    CUMULATIVE_CATCHUP = "cumulative_catchup"


class Contract(Base):
    """A customer agreement that produces revenue over one or more POs."""

    __tablename__ = "contracts"

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
    counterparty_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("counterparties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    external_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)

    source: Mapped[ContractSource] = mapped_column(
        Enum(
            ContractSource,
            name="contractsource",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=ContractSource.MANUAL,
    )
    status: Mapped[ContractStatus] = mapped_column(
        Enum(
            ContractStatus,
            name="contractstatus",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=ContractStatus.DRAFT,
    )

    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_schedule_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hubspot_deal_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    total_transaction_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False, default=Decimal("0")
    )
    allocation_variance: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False, default=Decimal("0")
    )

    service_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    service_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    effective_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    terminated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    payment_terms_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    billing_frequency: Mapped[str | None] = mapped_column(String(32), nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    performance_obligations: Mapped[list["PerformanceObligation"]] = relationship(
        "PerformanceObligation",
        back_populates="contract",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list["ContractDocument"]] = relationship(
        "ContractDocument",
        back_populates="contract",
        cascade="all, delete-orphan",
    )
    modifications: Mapped[list["ContractModification"]] = relationship(
        "ContractModification",
        back_populates="contract",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_contracts_org_status", "organization_id", "status"),
        Index("ix_contracts_org_counterparty", "organization_id", "counterparty_id"),
        UniqueConstraint(
            "organization_id",
            "source",
            "external_reference",
            name="uq_contracts_org_source_external",
        ),
        Index(
            "ix_contracts_stripe_subscription",
            "organization_id",
            "stripe_subscription_id",
        ),
    )


class PerformanceObligation(Base):
    """A distinct deliverable inside a contract — revenue is recognized against a PO."""

    __tablename__ = "performance_obligations"

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
    contract_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    kind: Mapped[PerformanceObligationKind] = mapped_column(
        Enum(
            PerformanceObligationKind,
            name="performanceobligationkind",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    allocation_method: Mapped[AllocationMethod] = mapped_column(
        Enum(
            AllocationMethod,
            name="allocationmethod",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
        default=AllocationMethod.RELATIVE_SSP,
    )

    standalone_selling_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False, default=Decimal("0")
    )
    allocated_transaction_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False, default=Decimal("0")
    )
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")

    service_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    service_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    total_units: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    unit_of_measure: Mapped[str | None] = mapped_column(String(64), nullable=True)

    stripe_price_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_product_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_item_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_meter_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    revenue_account_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    deferred_account_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("gl_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )

    is_cancelable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    contract: Mapped["Contract"] = relationship("Contract", back_populates="performance_obligations")
    allocations: Mapped[list["ContractAllocation"]] = relationship(
        "ContractAllocation",
        back_populates="performance_obligation",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "ix_performance_obligations_contract_seq",
            "contract_id",
            "sequence",
        ),
        Index(
            "ix_performance_obligations_org_stripe_price",
            "organization_id",
            "stripe_price_id",
        ),
        Index(
            "ix_performance_obligations_org_stripe_sub_item",
            "organization_id",
            "stripe_subscription_item_id",
        ),
        CheckConstraint(
            "allocated_transaction_price >= 0 AND standalone_selling_price >= 0",
            name="ck_performance_obligations_non_negative_prices",
        ),
    )


class ContractAllocation(Base):
    """Per-event allocation: 'this invoice line contributes X to this PO'."""

    __tablename__ = "contract_allocations"

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
    contract_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    performance_obligation_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("performance_obligations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    source_type: Mapped[ContractAllocationSource] = mapped_column(
        Enum(
            ContractAllocationSource,
            name="contractallocationsource",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    invoice_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    units: Mapped[Decimal | None] = mapped_column(Numeric(18, 6), nullable=True)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)

    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    performance_obligation: Mapped["PerformanceObligation"] = relationship(
        "PerformanceObligation", back_populates="allocations"
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "source_type",
            "source_id",
            "performance_obligation_id",
            name="uq_contract_allocations_org_source_po",
        ),
        Index(
            "ix_contract_allocations_po_date",
            "performance_obligation_id",
            "event_date",
        ),
        Index(
            "ix_contract_allocations_invoice",
            "invoice_id",
        ),
    )


class ContractDocument(Base):
    """Attached document (PDF, DOCX, email) providing evidence for the contract."""

    __tablename__ = "contract_documents"

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
    contract_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    invoice_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
    )

    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    uploaded_by_user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    contract: Mapped["Contract"] = relationship("Contract", back_populates="documents")

    __table_args__ = (
        Index("ix_contract_documents_contract_kind", "contract_id", "kind"),
    )


class ContractModification(Base):
    """Amendment event — captures IFRS 15.20–21 treatment choice and deltas."""

    __tablename__ = "contract_modifications"

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
    contract_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    modification_type: Mapped[ContractModificationType] = mapped_column(
        Enum(
            ContractModificationType,
            name="contractmodificationtype",
            create_type=True,
            values_callable=_enum_values,
        ),
        nullable=False,
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    delta_transaction_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4), nullable=False, default=Decimal("0")
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )

    contract: Mapped["Contract"] = relationship("Contract", back_populates="modifications")

    __table_args__ = (
        Index("ix_contract_modifications_contract_date", "contract_id", "effective_date"),
    )
