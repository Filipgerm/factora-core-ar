"""Buyer ORM models: Buyers, SellerBuyers junction, Document, Alerts."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


class Document(Base):
    """File/document uploaded to Supabase storage."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    bucket: Mapped[str] = mapped_column(String)
    path: Mapped[str] = mapped_column(String)
    original_name: Mapped[str] = mapped_column(String)
    content_type: Mapped[Optional[str]] = mapped_column(String)
    size: Mapped[int] = mapped_column(Integer)
    public_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    _metadata: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )


class SellerBuyers(Base):
    """Junction table for the many-to-many relationship between sellers and buyers."""

    __tablename__ = "seller_buyers"

    seller_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sellers.id"), primary_key=True
    )
    buyer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id"), primary_key=True
    )


class Buyers(Base):
    """Business buyer — KYC data + contact info.  No password (auth via onboarding flow)."""

    __tablename__ = "buyers"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    is_onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)

    # Business KYC data collected during onboarding
    business_country: Mapped[Optional[str]] = mapped_column(String(100))
    business_info: Mapped[Optional[dict]] = mapped_column(JSONB)
    shareholders: Mapped[Optional[dict]] = mapped_column(JSONB)

    # Contact
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    country_code: Mapped[Optional[str]] = mapped_column(String(10))
    email: Mapped[Optional[str]] = mapped_column(String(255))

    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=utcnow,
        nullable=True,
    )

    sellers: Mapped[List["Sellers"]] = relationship(  # type: ignore[name-defined]
        secondary="seller_buyers", back_populates="buyers"
    )
    onboarding_sessions: Mapped[List["OnboardingSession"]] = relationship(  # type: ignore[name-defined]
        back_populates="buyers", cascade="all, delete-orphan"
    )
    alerts: Mapped[List["Alerts"]] = relationship(
        back_populates="buyers", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("email", name="uq_buyers_email"),
        Index("ix_buyer_email", "email"),
        Index("ix_buyer_phone", "phone_number"),
    )


# ---------------------------
# Alerts
# ---------------------------


class AlertSeverity(str, enum.Enum):
    high = "high"
    normal = "normal"
    low = "low"


class Alerts(Base):
    """Dynamic financial health alerts for buyer businesses."""

    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    business_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    type: Mapped[str] = mapped_column(String)
    severity_level: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alert_severity", native_enum=True)
    )
    trigger_source: Mapped[str] = mapped_column(String)

    buyers: Mapped[Buyers] = relationship(back_populates="alerts")

    __table_args__ = (
        Index("ix_alerts_business_id", "business_id"),
        Index("ix_alerts_type", "type"),
        Index("ix_alerts_severity_level", "severity_level"),
    )
