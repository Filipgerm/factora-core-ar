"""Stripe Connect OAuth account-connection records (multi-tenant).

One ``StripeAccountConnection`` per (organization, connected Stripe account).
Soft-disconnect via ``disconnected_at``; the row is preserved so historical
events tied to that account stay auditable.

Security
--------
* ``stripe_account_id`` (acct_xxx) is public-safe and stored as plaintext.
* ``refresh_token_encrypted`` holds a Fernet ciphertext using
  ``GMAIL_TOKEN_ENCRYPTION_KEY`` (re-used as the at-rest encryption key
  for OAuth tokens across integrations). Only required for **Express** /
  **Custom** Connect flows; **Standard** mode stores only the account id.
* Callers passing the account to the Stripe SDK **must** use the Stripe
  ``stripe_account`` per-request option so the platform key never leaks
  the tenant's data.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models._utils import utcnow


class StripeAccountConnection(Base):
    """A tenant's Stripe Connect linkage."""

    __tablename__ = "stripe_account_connections"

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
    created_by_user_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    stripe_account_id: Mapped[str] = mapped_column(String(64), nullable=False)
    scope: Mapped[str] = mapped_column(
        String(32), nullable=False, default="read_write"
    )
    token_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    livemode: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )

    # Optional — only populated for Express/Custom flows.
    refresh_token_encrypted: Mapped[str | None] = mapped_column(
        String(2048), nullable=True
    )

    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    disconnected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_webhook_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "stripe_account_id",
            name="uq_stripe_acct_org_stripe_account",
        ),
        Index(
            "ix_stripe_acct_org_active",
            "organization_id",
            postgresql_where=text("disconnected_at IS NULL"),
        ),
    )
