"""AADE / myDATA ORM models: document storage and normalized invoices."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    BigInteger,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


class InvoiceDirection(str, enum.Enum):
    """Invoice direction: received (issued to me) or transmitted (issued by me)."""

    RECEIVED = "received"
    TRANSMITTED = "transmitted"


class AadeDocumentModel(Base):
    """Raw AADE myDATA document response (XML + JSON) linked to a buyer."""

    __tablename__ = "aade_documents"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    buyer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id", ondelete="CASCADE"), index=True, nullable=False
    )
    raw_xml: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    query_params: Mapped[dict] = mapped_column(JSONB, default=dict)
    continuation_token: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=text("now()"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=text("now()"), onupdate=func.now())

    buyer: Mapped["Buyers"] = relationship("Buyers")  # type: ignore[name-defined]
    invoices: Mapped[List["AadeInvoiceModel"]] = relationship("AadeInvoiceModel", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_aade_documents_buyer_id", "buyer_id"),
        Index("ix_aade_documents_fetched_at", "fetched_at"),
    )

    def __repr__(self) -> str:
        return f"<AadeDocument(id={self.id}, buyer_id={self.buyer_id}, fetched_at={self.fetched_at})>"


class AadeInvoiceModel(Base):
    """Normalized invoice extracted from an AADE document for efficient querying."""

    __tablename__ = "aade_invoices"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    document_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("aade_documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    direction: Mapped[InvoiceDirection] = mapped_column(
        Enum(InvoiceDirection, name="invoice_direction", native_enum=True),
        nullable=False,
        default=InvoiceDirection.RECEIVED,
    )
    uid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    mark: Mapped[Optional[int]] = mapped_column(BigInteger, unique=True, nullable=True)
    authentication_code: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    issuer_vat: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    issuer_country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    issuer_branch: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    counterpart_vat: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    counterpart_country: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    counterpart_branch: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    series: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    aa: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    invoice_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    currency: Mapped[Optional[str]] = mapped_column(String(3), nullable=True)
    total_net_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    total_vat_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    total_gross_value: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    normalized_data: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, server_default=text("now()"), onupdate=func.now())

    document: Mapped[AadeDocumentModel] = relationship("AadeDocumentModel", back_populates="invoices")

    __table_args__ = (
        Index("ix_aade_invoices_document_id", "document_id"),
        Index("ix_aade_invoices_issuer_vat", "issuer_vat"),
        Index("ix_aade_invoices_counterpart_vat", "counterpart_vat"),
        Index("ix_aade_invoices_issue_date", "issue_date"),
        Index("ix_aade_invoices_invoice_type", "invoice_type"),
    )

    def __repr__(self) -> str:
        return f"<AadeInvoice(id={self.id}, mark={self.mark}, direction={self.direction})>"
