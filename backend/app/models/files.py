"""Pydantic schemas for file upload API responses."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FileUploadResponse(BaseModel):
    """Response after storing an uploaded file in Supabase + ``documents`` row."""

    document_id: str
    bucket: str
    path: str
    original_name: str
    content_type: str | None
    size: int
    public_url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
