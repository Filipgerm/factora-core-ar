"""Pydantic schemas for generative AI endpoints."""
from __future__ import annotations

from pydantic import BaseModel, Field


class ChatStreamRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
