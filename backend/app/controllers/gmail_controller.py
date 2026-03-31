"""GmailController — HTTP bridge for OAuth, sync, ingestion preview, Pub/Sub."""

from __future__ import annotations

import asyncio
import base64
import json
import logging

from fastapi import HTTPException, Request
from google.auth.transport import requests as greq
from google.oauth2 import id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AppError, ValidationError
from app.models.gmail import (
    GmailAuthorizeResponse,
    GmailSyncResponse,
    IngestionPreviewResponse,
)
from app.services.gmail_oauth_service import GmailOAuthService
from app.services.gmail_sync_service import GmailSyncService
from app.services.ingestion_service import IngestionService

logger = logging.getLogger(__name__)


class GmailController:
    def __init__(
        self,
        oauth_service: GmailOAuthService,
        sync_service: GmailSyncService,
        db: AsyncSession,
    ) -> None:
        self._oauth = oauth_service
        self._sync = sync_service
        self._db = db

    def authorize_url(
        self, *, user_id: str, organization_id: str
    ) -> GmailAuthorizeResponse:
        try:
            url = self._oauth.build_authorization_url(
                user_id=user_id,
                organization_id=organization_id,
            )
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=e.detail) from e
        return GmailAuthorizeResponse(authorization_url=url)

    async def oauth_callback(self, *, code: str, state: str) -> dict[str, str]:
        try:
            conn = await self._oauth.complete_oauth(code=code, state=state)
        except AppError as e:
            raise HTTPException(status_code=e.status_code, detail=e.detail) from e
        except ValidationError as e:
            raise HTTPException(status_code=422, detail=e.detail) from e
        return {"status": "connected", "google_email": conn.google_email}

    async def sync_now(
        self,
        *,
        organization_id: str,
        google_email: str | None = None,
    ) -> GmailSyncResponse:
        try:
            out = await self._sync.sync_mailbox(
                organization_id=organization_id,
                google_email=google_email,
            )
        except AppError as e:
            raise HTTPException(status_code=e.status_code, detail=e.detail) from e
        return GmailSyncResponse(**out)

    async def preview_ingestion(
        self,
        *,
        organization_id: str,
        raw_text: str = "",
        attachment_base64: str | None = None,
        attachment_mime_type: str | None = None,
    ) -> IngestionPreviewResponse:
        try:
            svc = IngestionService(self._db, organization_id)
            result = await svc.run_ingestion(
                raw_text=raw_text,
                attachment_base64=attachment_base64,
                attachment_mime_type=attachment_mime_type,
                include_vector_hints=False,
                trigger="preview",
            )
        except AppError as e:
            raise HTTPException(status_code=e.status_code, detail=e.detail) from e
        return IngestionPreviewResponse(result=result)

    async def pubsub_push(self, request: Request) -> dict[str, str]:
        """Verify OIDC (when configured) and trigger sync for notified mailbox."""
        if settings.demo_mode:
            return {"status": "ignored_demo"}

        auth = request.headers.get("Authorization")
        aud = (settings.GMAIL_PUBSUB_VERIFICATION_AUDIENCE or "").strip()
        if aud:
            if not auth or not auth.startswith("Bearer "):
                raise HTTPException(status_code=401, detail="missing_pubsub_token")
            token = auth[7:].strip()
            if not token:
                raise HTTPException(status_code=401, detail="missing_pubsub_token")
            try:

                def _verify_pubsub_jwt() -> None:
                    # Synchronous HTTP to Google certs; run off the asyncio event loop.
                    id_token.verify_oauth2_token(
                        token, greq.Request(), audience=aud
                    )

                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, _verify_pubsub_jwt)
            except Exception as e:
                logger.warning("Pub/Sub OIDC verification failed: %s", e)
                raise HTTPException(
                    status_code=403, detail="invalid_pubsub_token"
                ) from e

        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="invalid_json")

        data_b64 = (body.get("message") or {}).get("data")
        if not data_b64:
            return {"status": "no_data"}

        try:
            inner = json.loads(base64.b64decode(data_b64).decode("utf-8"))
        except Exception as e:
            raise HTTPException(status_code=400, detail="invalid_pubsub_payload") from e

        email_address = (
            inner.get("emailAddress") or inner.get("email_address") or ""
        ).strip()
        history_id = inner.get("historyId")
        if history_id is not None:
            history_id = str(history_id)

        if not email_address:
            return {"status": "no_email"}

        await self._sync.sync_for_email_address(
            email_address=email_address,
            history_id=history_id,
        )
        return {"status": "ok"}
