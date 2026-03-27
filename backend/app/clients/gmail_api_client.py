"""GmailApiClient — OAuth token refresh and Gmail REST v1 over httpx.

**Scope:** Thin async HTTP to Google OAuth and ``gmail.googleapis.com``. No DB.

**Contract:** Callers supply decrypted refresh tokens; this module never persists secrets.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


class GmailApiClient:
    """Minimal Gmail REST client."""

    def __init__(self, timeout: float = 60.0) -> None:
        self._timeout = timeout

    async def refresh_access_token(self, *, refresh_token: str) -> dict[str, Any]:
        """Exchange refresh token for access_token JSON."""
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise RuntimeError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured")
        data = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.post(GOOGLE_TOKEN_URL, data=data)
            r.raise_for_status()
            return r.json()

    async def get_profile(self, *, access_token: str) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{GMAIL_API_BASE}/profile",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            r.raise_for_status()
            return r.json()

    async def list_messages(
        self,
        *,
        access_token: str,
        q: str | None = None,
        max_results: int = 25,
        page_token: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, str | int] = {"maxResults": max_results}
        if q:
            params["q"] = q
        if page_token:
            params["pageToken"] = page_token
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{GMAIL_API_BASE}/messages",
                headers={"Authorization": f"Bearer {access_token}"},
                params=params,
            )
            r.raise_for_status()
            return r.json()

    async def get_message(
        self,
        *,
        access_token: str,
        message_id: str,
        fmt: str = "full",
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{GMAIL_API_BASE}/messages/{message_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"format": fmt},
            )
            r.raise_for_status()
            return r.json()

    async def get_attachment(
        self,
        *,
        access_token: str,
        message_id: str,
        attachment_id: str,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{GMAIL_API_BASE}/messages/{message_id}/attachments/{attachment_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            r.raise_for_status()
            return r.json()

    async def list_history(
        self,
        *,
        access_token: str,
        start_history_id: str,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.get(
                f"{GMAIL_API_BASE}/history",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"startHistoryId": start_history_id},
            )
            if r.status_code == 404:
                return {"history": [], "historyId": start_history_id}
            r.raise_for_status()
            return r.json()

    async def exchange_authorization_code(self, *, code: str, redirect_uri: str) -> dict[str, Any]:
        """OAuth2 authorization_code → tokens (includes refresh_token when granted)."""
        if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
            raise RuntimeError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured")
        data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            r = await client.post(GOOGLE_TOKEN_URL, data=data)
            r.raise_for_status()
            return r.json()
