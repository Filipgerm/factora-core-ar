"""File/document metadata ORM model.

Tracks files uploaded to Supabase storage so they can be referenced by path
and retrieved later.
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import DateTime, Integer, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models._utils import utcnow


class Document(Base):
    """Metadata row for a file stored in Supabase Storage."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    bucket: Mapped[str] = mapped_column(String, nullable=False)
    path: Mapped[str] = mapped_column(String, nullable=False)
    original_name: Mapped[str] = mapped_column(String, nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    public_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    _metadata: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
