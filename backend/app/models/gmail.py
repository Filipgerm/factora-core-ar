"""Pydantic schemas for Gmail integration and Pub/Sub webhook."""

from __future__ import annotations

from pydantic import BaseModel, Field


class GmailAuthorizeResponse(BaseModel):
    """URL to open in browser for Google consent."""

    authorization_url: str


class GmailOAuthCallbackQuery(BaseModel):
    """Query params on OAuth redirect."""

    code: str
    state: str


class GmailSyncResponse(BaseModel):
    """Result of a manual or webhook-triggered sync."""

    ingested: int = Field(ge=0, description="Number of messages newly ingested as invoices")
    skipped: int = Field(ge=0, description="Messages skipped (already processed or no attachment)")
    errors: list[str] = Field(default_factory=list)
    mailbox: str


class IngestionPreviewResponse(BaseModel):
    """Agent output without persisting an invoice."""

    result: dict


class PubSubPushBody(BaseModel):
    """Minimal Google Pub/Sub push envelope."""

    message: dict = Field(default_factory=dict)
    subscription: str | None = None
