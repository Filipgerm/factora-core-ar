"""Pydantic schemas for generative AI endpoints."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ChatStreamRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)


class AIFeedbackRequest(BaseModel):
    """Human correction for AI-suggested labels (e.g. category) stored in pgvector."""

    content_text: str = Field(..., min_length=1, max_length=16_000)
    suggested_label: str = Field(..., min_length=1, max_length=256)
    corrected_label: str = Field(..., min_length=1, max_length=256)
    source: str = Field(default="ui", max_length=64)


class AIFeedbackResponse(BaseModel):
    embedding_id: str
    message: str = "Feedback stored."
