"""Gmail OAuth, manual sync, ingestion preview, and Pub/Sub push."""

from __future__ import annotations

import base64

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from app.controllers.gmail_controller import GmailController
from app.db.models.identity import UserRole
from app.dependencies import (
    AuthUser,
    CurrentOrgId,
    GmailCtrl,
    require_auth,
    require_role,
)

router = APIRouter()

# Ingestion preview multipart: cap attachment size (aligned with ingestion agent limits).
MAX_INGESTION_PREVIEW_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MiB


@router.get(
    "/integrations/gmail/authorize",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def gmail_authorize(
    user: AuthUser,
    org_id: CurrentOrgId,
    ctl: GmailCtrl,
):
    """Return Google OAuth URL to connect Gmail (read-only scope)."""
    uid = str(user.get("sub") or "").strip()
    if not uid:
        raise HTTPException(
            status_code=401,
            detail="Access token is missing a subject (sub) claim.",
        )
    return ctl.authorize_url(user_id=uid, organization_id=org_id)


@router.get("/integrations/gmail/callback")
async def gmail_oauth_callback(
    code: str,
    state: str,
    ctl: GmailCtrl,
):
    """OAuth redirect target; exchanges code and stores encrypted refresh token."""
    return await ctl.oauth_callback(code=code, state=state)


@router.post(
    "/integrations/gmail/sync",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def gmail_sync(
    org_id: CurrentOrgId,
    ctl: GmailCtrl,
    google_email: str | None = None,
):
    """Manually pull recent Gmail messages and ingest (dev / backfill)."""
    return await ctl.sync_now(organization_id=org_id, google_email=google_email)


@router.post(
    "/integrations/ingestion/preview",
    dependencies=[Depends(require_auth)],
)
async def ingestion_preview(
    org_id: CurrentOrgId,
    ctl: GmailCtrl,
    raw_text: str = Form(""),
    text: str = Form(
        "",
        description="Alias for raw_text (e.g. curl -F 'text=...').",
    ),
    file: UploadFile | None = File(None),
):
    """Run ingestion agent on text and/or uploaded file; does not create an invoice."""
    b64: str | None = None
    mime: str | None = None
    if file is not None and file.filename:
        chunks = []
        total_size = 0
        while chunk := await file.read(64 * 1024):
            total_size += len(chunk)
            if total_size > MAX_INGESTION_PREVIEW_UPLOAD_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum size of {MAX_INGESTION_PREVIEW_UPLOAD_BYTES // (1024 * 1024)} MiB.",
                )
            chunks.append(chunk)
        data = b"".join(chunks)
        b64 = base64.b64encode(data).decode("ascii")
        mime = file.content_type or "application/octet-stream"
    body = (raw_text.strip() or text.strip())
    return await ctl.preview_ingestion(
        organization_id=org_id,
        raw_text=body,
        attachment_base64=b64,
        attachment_mime_type=mime,
    )


pubsub_router = APIRouter()


@pubsub_router.post("/webhooks/gmail/pubsub")
async def gmail_pubsub_push(request: Request, ctl: GmailCtrl):
    """Google Pub/Sub push endpoint for Gmail watch notifications."""
    return await ctl.pubsub_push(request)
