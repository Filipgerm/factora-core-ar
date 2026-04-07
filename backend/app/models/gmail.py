"""Pydantic schemas for Gmail integration and Pub/Sub webhook."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class GmailAuthorizeResponse(BaseModel):
    """URL to open in browser for Google consent."""

    authorization_url: str


class GmailOAuthCallbackQuery(BaseModel):
    """Query params on OAuth redirect."""

    code: str
    state: str


GmailSyncOutcome = Literal[
    "ingested",
    "queued",
    "queued_pending",
    "skipped_already_processed",
    "skipped_duplicate_invoice",
    "ingestion_failed",
    "error",
]


class GmailSyncMessageDetail(BaseModel):
    """Per-message result for observability (no raw LLM dumps — structured fields only)."""

    gmail_message_id: str
    subject: str = ""
    outcome: GmailSyncOutcome
    celery_task_id: str | None = None
    error: str | None = None
    invoice_id: str | None = None
    confidence: float | None = None
    requires_human_review: bool | None = None
    extraction_summary: str | None = None
    vendor: str | None = None


class GmailSyncResponse(BaseModel):
    """Result of a manual or webhook-triggered sync."""

    queued: int = Field(
        default=0,
        ge=0,
        description="Messages enqueued to Celery for worker ingest + invoice creation",
    )
    ingested: int = Field(
        default=0,
        ge=0,
        description="Deprecated alias for ``queued``; API sets both to the same value",
    )
    skipped: int = Field(ge=0, description="Messages skipped (already processed or no attachment)")
    errors: list[str] = Field(default_factory=list)
    mailbox: str
    messages: list[GmailSyncMessageDetail] = Field(
        default_factory=list,
        description="Per-message outcomes for this sync run (audit / debugging)",
    )


class IngestionPreviewResponse(BaseModel):
    """Agent output without persisting an invoice.

    The ``result`` dict includes structured fields (vendor, amount, confidence,
    ``extracted``, optional ``embedding``). Use this endpoint for debugging —
    production sync responses return a trimmed per-message summary without raw LLM text.
    """

    result: dict


class PubSubPushBody(BaseModel):
    """Minimal Google Pub/Sub push envelope."""

    message: dict = Field(default_factory=dict)
    subscription: str | None = None
