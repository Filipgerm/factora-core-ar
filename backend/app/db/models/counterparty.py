"""Counterparty domain ORM model.

Replaces the old ``Buyers`` + ``SellerBuyers`` tables with a single
``Counterparty`` entity scoped to an ``Organization`` (multi-tenant).

A counterparty can be a CUSTOMER, VENDOR, or both (BOTH).  All address fields
are stored at the top level for easy querying rather than nested in JSONB.
``registry_data`` holds raw national registry JSON (e.g. GEMI) when available.
"""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


class CounterpartyType(str, enum.Enum):
    CUSTOMER = "customer"
    VENDOR = "vendor"
    BOTH = "both"


class Counterparty(Base):
    """An external business entity (customer, supplier, or both).

    ``deleted_at`` implements soft-delete; queries must filter
    ``WHERE deleted_at IS NULL`` to exclude archived counterparties.
    """

    __tablename__ = "counterparties"

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
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    vat_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    country: Mapped[str | None] = mapped_column(
        String(2), nullable=True, comment="ISO 3166-1 alpha-2"
    )

    # Address fields — flat for easy filtering / autocomplete
    address_street: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address_city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address_postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address_region: Mapped[str | None] = mapped_column(String(100), nullable=True)

    type: Mapped[CounterpartyType] = mapped_column(
        Enum(CounterpartyType, name="counterpartytype", create_type=True),
        nullable=False,
        default=CounterpartyType.CUSTOMER,
    )

    contact_info: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    default_category_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), nullable=True
    )
    registry_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

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

    __table_args__ = (
        Index("ix_counterparties_organization_id", "organization_id"),
        Index("ix_counterparties_vat_number", "vat_number"),
        Index("ix_counterparties_deleted_at", "deleted_at"),
        Index(
            "ix_counterparties_org_active",
            "organization_id",
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )
