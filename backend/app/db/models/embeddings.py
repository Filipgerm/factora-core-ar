"""pgvector-backed embedding rows for per-organization RAG."""
from __future__ import annotations

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OrganizationEmbedding(Base):
    """Vector embedding of text scoped to a single organization (tenant isolation)."""

    __tablename__ = "organization_embeddings"

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
    # Optional FK to the counterparty this embedding relates to.
    # Enables vendor-scoped similarity search and recurring-invoice detection
    # without full-text scanning. Nullable so non-invoice embeddings are unaffected.
    counterparty_id: Mapped[str | None] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("counterparties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    content_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)
    embedding_metadata: Mapped[dict] = mapped_column(
        "embedding_metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    counterparty: Mapped[object | None] = relationship("Counterparty")

    __table_args__ = (
        Index("ix_org_embeddings_org_created", "organization_id", "created_at"),
        Index("ix_org_embeddings_counterparty", "counterparty_id"),
    )
