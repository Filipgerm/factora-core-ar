"""GmailOAuthService — build authorize URL and complete OAuth for mailbox connect.

**Scope:** Encrypt refresh tokens; upsert ``GmailMailboxConnection``.

**Contract:** Raises ``AuthError``, ``ValidationError``, ``ExternalServiceError`` as appropriate.
"""

from __future__ import annotations

import logging
from urllib.parse import urlencode

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.gmail_api_client import GmailApiClient
from app.config import settings
from app.core.exceptions import ExternalServiceError, ValidationError
from app.core.security.field_encryption import encrypt_secret
from app.core.security.jwt import decode_gmail_oauth_state, encode_gmail_oauth_state
from app.db.models.gmail import GmailMailboxConnection

logger = logging.getLogger(__name__)

GMAIL_SCOPES_READONLY = "https://www.googleapis.com/auth/gmail.readonly"


class GmailOAuthService:
    """Google OAuth for Gmail API (offline refresh token)."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._api = GmailApiClient()

    def build_authorization_url(self, *, user_id: str, organization_id: str) -> str:
        """Return browser URL to start Gmail consent."""
        if not settings.GOOGLE_CLIENT_ID:
            raise ValidationError(
                "Google OAuth is not configured.",
                code="config.google_oauth_missing",
                fields={"GOOGLE_CLIENT_ID": "Required"},
            )
        redirect = (settings.GOOGLE_GMAIL_REDIRECT_URI or "").strip()
        if not redirect:
            raise ValidationError(
                "GOOGLE_GMAIL_REDIRECT_URI is not configured.",
                code="config.gmail_redirect_missing",
                fields={"GOOGLE_GMAIL_REDIRECT_URI": "Set to backend callback URL"},
            )
        state = encode_gmail_oauth_state(user_id=user_id, organization_id=organization_id)
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect,
            "response_type": "code",
            "scope": GMAIL_SCOPES_READONLY,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        }
        return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)

    async def complete_oauth(self, *, code: str, state: str) -> GmailMailboxConnection:
        """Exchange code, persist encrypted refresh token and mailbox email."""
        payload = decode_gmail_oauth_state(state)
        user_id = str(payload["sub"])
        organization_id = str(payload["organization_id"])

        redirect = (settings.GOOGLE_GMAIL_REDIRECT_URI or "").strip()
        if not redirect:
            raise ValidationError(
                "GOOGLE_GMAIL_REDIRECT_URI is not configured.",
                code="config.gmail_redirect_missing",
                fields={},
            )

        try:
            tokens = await self._api.exchange_authorization_code(
                code=code,
                redirect_uri=redirect,
            )
        except Exception as e:
            logger.error("Gmail OAuth token exchange failed: %s", e)
            raise ExternalServiceError(
                "Failed to exchange Gmail authorization code.",
                code="external.gmail_oauth",
            ) from e

        refresh = tokens.get("refresh_token")
        if not refresh:
            raise ValidationError(
                "Google did not return a refresh token. Try revoking app access and reconnect with prompt=consent.",
                code="validation.gmail_no_refresh",
                fields={"refresh_token": "missing"},
            )

        access = tokens.get("access_token", "")
        if not access:
            raise ExternalServiceError(
                "Token response missing access_token.",
                code="external.gmail_oauth",
            )

        try:
            profile = await self._api.get_profile(access_token=access)
        except Exception as e:
            logger.error("Gmail profile fetch failed: %s", e)
            raise ExternalServiceError(
                "Failed to read Gmail profile.",
                code="external.gmail_profile",
            ) from e

        google_email = (profile.get("emailAddress") or "").strip().lower()
        if not google_email:
            raise ExternalServiceError(
                "Gmail profile missing emailAddress.",
                code="external.gmail_profile",
            )

        try:
            enc_refresh = encrypt_secret(refresh)
        except ValueError as e:
            raise ValidationError(
                str(e),
                code="config.gmail_encryption",
                fields={"GMAIL_TOKEN_ENCRYPTION_KEY": "required"},
            ) from e

        existing = await self._db.scalar(
            select(GmailMailboxConnection).where(
                GmailMailboxConnection.organization_id == organization_id,
                GmailMailboxConnection.google_email == google_email,
            )
        )
        if existing:
            existing.encrypted_refresh_token = enc_refresh
            existing.user_id = user_id
            existing.scopes = GMAIL_SCOPES_READONLY
            conn = existing
        else:
            conn = GmailMailboxConnection(
                organization_id=organization_id,
                user_id=user_id,
                google_email=google_email,
                encrypted_refresh_token=enc_refresh,
                scopes=GMAIL_SCOPES_READONLY,
            )
            self._db.add(conn)

        try:
            await self._db.commit()
            await self._db.refresh(conn)
        except Exception as e:
            await self._db.rollback()
            logger.error("Failed to save Gmail connection: %s", e)
            raise ExternalServiceError("Failed to save Gmail connection.", code="db.error") from e

        return conn
