"""Unit tests for Gmail OAuth stack: encryption, API client, sync, Pub/Sub controller."""

from __future__ import annotations

import base64
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from app.clients.gmail_api_client import GmailApiClient
from app.controllers.gmail_controller import GmailController
from app.core.exceptions import NotFoundError
from app.core.security.field_encryption import decrypt_secret, encrypt_secret
from app.services.gmail_sync_service import GmailSyncService


def test_field_encryption_round_trip() -> None:
    plain = "1//refresh-token-example"
    ct = encrypt_secret(plain)
    assert ct != plain
    assert decrypt_secret(ct) == plain


def test_field_encryption_rejects_empty_plain() -> None:
    with pytest.raises(ValueError, match="empty"):
        encrypt_secret("")


def test_field_encryption_rejects_empty_cipher() -> None:
    with pytest.raises(ValueError, match="empty"):
        decrypt_secret("")


@pytest.mark.asyncio
async def test_gmail_api_client_refresh_access_token_httpx() -> None:
    mock_resp = MagicMock()
    mock_resp.raise_for_status = MagicMock()
    mock_resp.json = MagicMock(return_value={"access_token": "atok", "expires_in": 3600})

    inner = AsyncMock()
    inner.post = AsyncMock(return_value=mock_resp)

    mock_cm = MagicMock()
    mock_cm.__aenter__ = AsyncMock(return_value=inner)
    mock_cm.__aexit__ = AsyncMock(return_value=None)

    with patch("app.clients.gmail_api_client.httpx.AsyncClient", return_value=mock_cm):
        client = GmailApiClient()
        out = await client.refresh_access_token(refresh_token="rtok")

    assert out["access_token"] == "atok"
    inner.post.assert_awaited_once()


@pytest.mark.asyncio
async def test_gmail_sync_mailbox_raises_when_not_connected() -> None:
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)
    svc = GmailSyncService(db)
    with pytest.raises(NotFoundError, match="Gmail"):
        await svc.sync_mailbox(organization_id=str(uuid.uuid4()))


@pytest.mark.asyncio
async def test_pubsub_push_decodes_envelope_and_calls_sync() -> None:
    payload = {"emailAddress": "acct@example.com", "historyId": "42"}
    data_b64 = base64.b64encode(json.dumps(payload).encode("utf-8")).decode("ascii")

    req = MagicMock(spec=Request)
    req.headers = {}
    req.json = AsyncMock(return_value={"message": {"data": data_b64}})

    sync = MagicMock()
    sync.sync_for_email_address = AsyncMock(
        return_value={
            "queued": 0,
            "ingested": 0,
            "skipped": 0,
            "errors": [],
            "mailbox": "acct@example.com",
            "messages": [],
        }
    )

    ctl = GmailController(
        oauth_service=MagicMock(),
        sync_service=sync,
        db=AsyncMock(),
    )

    with patch("app.controllers.gmail_controller.settings") as st:
        st.demo_mode = False
        st.GMAIL_PUBSUB_VERIFICATION_AUDIENCE = ""
        out = await ctl.pubsub_push(req)

    assert isinstance(out, JSONResponse)
    assert out.status_code == 202
    body = json.loads(out.body.decode())
    assert body["mailbox"] == "acct@example.com"
    sync.sync_for_email_address.assert_awaited_once_with(
        email_address="acct@example.com",
        history_id="42",
    )


@pytest.mark.asyncio
async def test_pubsub_push_401_when_audience_configured_without_bearer() -> None:
    """If OIDC audience is set, missing or non-Bearer Authorization must not bypass verify."""
    req = MagicMock(spec=Request)
    req.headers = {}

    ctl = GmailController(
        oauth_service=MagicMock(),
        sync_service=MagicMock(),
        db=AsyncMock(),
    )

    with patch("app.controllers.gmail_controller.settings") as st:
        st.demo_mode = False
        st.GMAIL_PUBSUB_VERIFICATION_AUDIENCE = "https://pubsub.googleapis.com/myproject"
        with pytest.raises(HTTPException) as exc:
            await ctl.pubsub_push(req)
    assert exc.value.status_code == 401
    assert exc.value.detail == "missing_pubsub_token"


@pytest.mark.asyncio
async def test_pubsub_push_401_when_audience_configured_non_bearer_scheme() -> None:
    req = MagicMock(spec=Request)
    req.headers = {"Authorization": "Basic abc"}

    ctl = GmailController(
        oauth_service=MagicMock(),
        sync_service=MagicMock(),
        db=AsyncMock(),
    )

    with patch("app.controllers.gmail_controller.settings") as st:
        st.demo_mode = False
        st.GMAIL_PUBSUB_VERIFICATION_AUDIENCE = "https://pubsub.googleapis.com/myproject"
        with pytest.raises(HTTPException) as exc:
            await ctl.pubsub_push(req)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_pubsub_push_demo_short_circuit() -> None:
    req = MagicMock(spec=Request)
    ctl = GmailController(
        oauth_service=MagicMock(),
        sync_service=MagicMock(),
        db=AsyncMock(),
    )
    with patch("app.controllers.gmail_controller.settings") as st:
        st.demo_mode = True
        out = await ctl.pubsub_push(req)
    assert isinstance(out, JSONResponse)
    assert json.loads(out.body.decode())["status"] == "ignored_demo"
