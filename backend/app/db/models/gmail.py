"""Gmail OAuth mailbox connections and ingest idempotency rows.

**Scope:** Persist encrypted refresh tokens and per-message dedupe for Gmail sync.

**Contract:** All rows are scoped by ``organization_id``; never store plaintext tokens.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


class GmailMailboxConnection(Base):
    """One connected Gmail account per organization (multi-tenant)."""

    __tablename__ = "gmail_mailbox_connections"

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    google_email: Mapped[str] = mapped_column(String(320), nullable=False)
    encrypted_refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    scopes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    history_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    watch_expiration: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    organization: Mapped[object] = relationship("Organization")
    user: Mapped[object] = relationship("User")

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "google_email",
            name="uq_gmail_mailbox_org_email",
        ),
        Index("ix_gmail_mailbox_google_email", "google_email"),
    )


class GmailProcessedMessage(Base):
    """Idempotency: one row per Gmail message id ingested per org."""

    __tablename__ = "gmail_processed_messages"

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    gmail_message_id: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "gmail_message_id",
            name="uq_gmail_processed_org_message",
        ),
        Index(
            "ix_gmail_processed_org_created",
            "organization_id",
            "created_at",
        ),
    )
