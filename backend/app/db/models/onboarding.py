"""Onboarding ORM models: sessions, verification, and invitation tokens."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


class OnboardingSession(Base):
    """Tracks a buyer's onboarding progress step-by-step."""

    __tablename__ = "onboarding_sessions"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    business_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id", ondelete="CASCADE"), index=True
    )

    # Lifecycle: draft → completed | expired
    status: Mapped[str] = mapped_column(String(50), default="draft")
    step: Mapped[str] = mapped_column(String(50), default="phone_started")

    # Phone verification
    phone_number_e164: Mapped[Optional[str]] = mapped_column(String(20))
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Email verification
    email_address: Mapped[Optional[str]] = mapped_column(String(255))
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # KYC data collected during onboarding
    onboarding_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=utcnow,
        nullable=True,
    )

    buyers: Mapped["Buyers"] = relationship(back_populates="onboarding_sessions")  # type: ignore[name-defined]

    __table_args__ = (
        Index("ix_onboarding_status", "status"),
        Index("ix_onboarding_step", "step"),
    )


class VerificationSession(Base):
    """Short-lived session for phone/email OTP verification."""

    __tablename__ = "verification_sessions"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    verification_id: Mapped[str] = mapped_column(String(100), unique=True)

    onboarding_session_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("onboarding_sessions.id", ondelete="CASCADE"), index=True
    )
    channel: Mapped[str] = mapped_column(String(20))   # "phone" or "email"
    target: Mapped[str] = mapped_column(String(255))    # phone number or email

    # OTP stored as SHA-256+pepper hash
    code_hash: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(default=0)
    max_attempts: Mapped[int] = mapped_column(default=5)

    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    last_sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index("ix_verification_sessions_onboarding_session_id", "onboarding_session_id"),
        Index("ix_verification_channel", "channel"),
    )


class OnboardingToken(Base):
    """Single-use invitation tokens for buyer onboarding links.

    The ``token`` column stores the SHA-256 hash of the raw token that is
    embedded in the invitation email link — never the raw token itself.
    """

    __tablename__ = "onboarding_tokens"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    buyer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )

    buyer: Mapped["Buyers"] = relationship("Buyers")  # type: ignore[name-defined]

    __table_args__ = (
        Index("ix_onboarding_tokens_token", "token"),
        Index("ix_onboarding_tokens_buyer_id", "buyer_id"),
        Index("ix_onboarding_tokens_expires_at", "expires_at"),
    )
