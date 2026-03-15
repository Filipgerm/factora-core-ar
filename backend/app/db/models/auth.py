"""Authentication ORM models: Sellers and SellerSessions.

Sellers holds the seller's credentials and contact info.
SellerSessions holds one refresh-token row per active session (JWT auth).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models._utils import utcnow


# ---------------------------
# SELLERS: credentials + contact in one place
# ---------------------------
class Sellers(Base):
    """Seller account — credentials and contact details."""

    __tablename__ = "sellers"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)

    # Credentials
    username: Mapped[Optional[str]] = mapped_column(String(30))
    password_hash: Mapped[Optional[str]] = mapped_column(String(128))

    # Contact
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(10))
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # last_access_token / access_token_expires_at removed — see seller_sessions.

    # Password reset (one-time token, stored as SHA-256 hash)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(255))
    password_reset_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    # Timestamps
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=utcnow,
        nullable=True,
    )


# ---------------------------
# SellerSessions: JWT refresh-token store (one row per active session)
# ---------------------------
class SellerSessions(Base):
    """Stores one refresh-token per seller session for JWT-based auth.

    The JWT access token (30-min TTL) is stateless and never stored here.
    The refresh token (7-day TTL) is stored as its SHA-256 hash.
    """

    __tablename__ = "seller_sessions"

    id: Mapped[str] = mapped_column(
        primary_key=True, default=lambda: uuid.uuid4().hex
    )
    seller_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sellers.id", ondelete="CASCADE"), index=True
    )

    # SHA-256 of the opaque refresh token returned to the client
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # SHA-256 of the JWT jti claim — for forced revocation before TTL expires
    jti_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    __table_args__ = (
        Index("ix_seller_sessions_expires_at", "expires_at"),
    )
