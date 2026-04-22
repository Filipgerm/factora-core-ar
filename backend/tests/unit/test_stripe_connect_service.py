"""StripeConnectService — OAuth state + code exchange + row persistence.

The service must:

* Refuse to build an authorize URL when the Connect client id or redirect
  URI is missing (raise ``ValidationError`` with a config code).
* Forward code + state through to ``StripeClient`` and persist a
  ``StripeAccountConnection`` row, encrypting any refresh token with
  ``GMAIL_TOKEN_ENCRYPTION_KEY``.
* Reject tampered / mistyped state JWTs via ``decode_stripe_connect_state``.
"""

from __future__ import annotations

import uuid
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ValidationError
from app.core.security.jwt import (
    decode_stripe_connect_state,
    encode_stripe_connect_state,
)
from app.services.stripe_connect_service import StripeConnectService


def _fake_client(
    *, configured: bool = True, tokens: dict[str, Any] | None = None
) -> MagicMock:
    client = MagicMock()
    client.is_configured.return_value = configured
    client.build_connect_authorize_url.return_value = (
        "https://connect.stripe.com/oauth/authorize?stub=1"
    )
    client.exchange_connect_authorization_code.return_value = tokens or {
        "stripe_user_id": "acct_test_1",
        "access_token": "sk_live_x",
        "refresh_token": None,
        "livemode": True,
        "scope": "read_write",
        "token_type": "bearer",
    }
    client.deauthorize_connected_account.return_value = {"stripe_user_id": "acct_test_1"}
    return client


def test_state_jwt_roundtrip() -> None:
    user_id = str(uuid.uuid4())
    org_id = str(uuid.uuid4())
    tok = encode_stripe_connect_state(user_id=user_id, organization_id=org_id)
    decoded = decode_stripe_connect_state(tok)
    assert decoded["sub"] == user_id
    assert decoded["organization_id"] == org_id
    assert decoded["typ"] == "stripe_connect_oauth"


def test_decode_state_rejects_gmail_state() -> None:
    from app.core.exceptions import AuthError
    from app.core.security.jwt import encode_gmail_oauth_state

    gmail_tok = encode_gmail_oauth_state(
        user_id=str(uuid.uuid4()), organization_id=str(uuid.uuid4())
    )
    with pytest.raises(AuthError):
        decode_stripe_connect_state(gmail_tok)


@pytest.mark.asyncio
async def test_build_authorization_url_requires_client_id() -> None:
    db = AsyncMock()
    svc = StripeConnectService(db, _fake_client())
    with patch("app.services.stripe_connect_service.settings") as s:
        s.STRIPE_CONNECT_CLIENT_ID = ""
        s.STRIPE_CONNECT_REDIRECT_URI = "https://x.example/cb"
        s.STRIPE_CONNECT_SCOPE = "read_write"
        with pytest.raises(ValidationError):
            svc.build_authorization_url(
                user_id=str(uuid.uuid4()), organization_id=str(uuid.uuid4())
            )


@pytest.mark.asyncio
async def test_build_authorization_url_requires_redirect() -> None:
    db = AsyncMock()
    svc = StripeConnectService(db, _fake_client())
    with patch("app.services.stripe_connect_service.settings") as s:
        s.STRIPE_CONNECT_CLIENT_ID = "ca_test"
        s.STRIPE_CONNECT_REDIRECT_URI = ""
        s.STRIPE_CONNECT_SCOPE = "read_write"
        with pytest.raises(ValidationError):
            svc.build_authorization_url(
                user_id=str(uuid.uuid4()), organization_id=str(uuid.uuid4())
            )


@pytest.mark.asyncio
async def test_build_authorization_url_delegates_to_client() -> None:
    db = AsyncMock()
    client = _fake_client()
    svc = StripeConnectService(db, client)
    with patch("app.services.stripe_connect_service.settings") as s:
        s.STRIPE_CONNECT_CLIENT_ID = "ca_test"
        s.STRIPE_CONNECT_REDIRECT_URI = "https://x.example/cb"
        s.STRIPE_CONNECT_SCOPE = "read_write"
        url = svc.build_authorization_url(
            user_id=str(uuid.uuid4()), organization_id=str(uuid.uuid4())
        )
    assert url.startswith("https://connect.stripe.com/oauth/authorize")
    client.build_connect_authorize_url.assert_called_once()
    kwargs = client.build_connect_authorize_url.call_args.kwargs
    assert kwargs["client_id"] == "ca_test"
    assert kwargs["redirect_uri"] == "https://x.example/cb"
    assert isinstance(kwargs["state"], str) and kwargs["state"]


@pytest.mark.asyncio
async def test_complete_oauth_persists_new_connection_standard_flow() -> None:
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    state = encode_stripe_connect_state(user_id=user_id, organization_id=org_id)

    db = AsyncMock()
    no_row = MagicMock()
    no_row.scalar_one_or_none.return_value = None
    db.scalar = AsyncMock(return_value=None)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    added: list[Any] = []
    db.add = MagicMock(side_effect=added.append)

    client = _fake_client(
        tokens={
            "stripe_user_id": "acct_new",
            "scope": "read_write",
            "livemode": False,
            "token_type": "bearer",
            "refresh_token": None,
        }
    )
    svc = StripeConnectService(db, client)
    conn = await svc.complete_oauth(code="auth_code_x", state=state)
    assert conn.stripe_account_id == "acct_new"
    assert conn.organization_id == org_id
    assert conn.created_by_user_id == user_id
    assert conn.livemode is False
    assert conn.refresh_token_encrypted is None
    assert added and added[0] is conn
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_complete_oauth_encrypts_refresh_token_when_present() -> None:
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    state = encode_stripe_connect_state(user_id=user_id, organization_id=org_id)

    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    added: list[Any] = []
    db.add = MagicMock(side_effect=added.append)

    client = _fake_client(
        tokens={
            "stripe_user_id": "acct_express",
            "refresh_token": "rt_super_secret",
            "scope": "read_write",
            "livemode": True,
        }
    )
    svc = StripeConnectService(db, client)
    conn = await svc.complete_oauth(code="c", state=state)
    assert conn.refresh_token_encrypted
    assert conn.refresh_token_encrypted != "rt_super_secret"


@pytest.mark.asyncio
async def test_complete_oauth_updates_existing_connection() -> None:
    org_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    state = encode_stripe_connect_state(user_id=user_id, organization_id=org_id)

    existing = MagicMock()
    existing.disconnected_at = "not-None"
    existing.livemode = False
    existing.scope = "read_only"
    existing.refresh_token_encrypted = None

    db = AsyncMock()
    db.scalar = AsyncMock(return_value=existing)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    client = _fake_client(
        tokens={
            "stripe_user_id": "acct_reconnect",
            "refresh_token": None,
            "scope": "read_write",
            "livemode": True,
        }
    )
    svc = StripeConnectService(db, client)
    conn = await svc.complete_oauth(code="c", state=state)

    assert conn is existing
    assert existing.disconnected_at is None
    assert existing.livemode is True
    assert existing.scope == "read_write"
    db.add.assert_not_called()
