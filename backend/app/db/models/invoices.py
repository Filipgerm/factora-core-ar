"""Unified invoice ORM — manual, AADE, OCR, and CSV sources in one table.

``external_id`` stores marks, Stripe ids, or import keys for idempotent upserts.
``counterparty_display_name`` denormalizes the customer/vendor label when no
``counterparty_id`` is linked yet.
"""
from __future__ import annotations

import enum
import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


class InvoiceSource(str, enum.Enum):
    MANUAL = "manual"
    AADE = "aade"
    OCR_PDF = "ocr_pdf"
    CSV_IMPORT = "csv_import"


class Invoice(Base):
    """Organization-scoped invoice across all ingestion channels."""

    __tablename__ = "invoices"

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
    source: Mapped[InvoiceSource] = mapped_column(
        Enum(
            InvoiceSource,
            name="invoicesource",
            create_type=True,
            values_callable=lambda obj: [e.value for e in obj],
        ),
        nullable=False,
        index=True,
    )
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    counterparty_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("counterparties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    counterparty_display_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")
    issue_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )
    deleted_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    organization: Mapped[object] = relationship("Organization")
    counterparty: Mapped[object | None] = relationship("Counterparty")

    __table_args__ = (
        Index("ix_invoices_issue_date", "issue_date"),
        Index("ix_invoices_deleted_at", "deleted_at"),
        Index(
            "ix_invoices_org_source_external",
            "organization_id",
            "source",
            "external_id",
        ),
    )
