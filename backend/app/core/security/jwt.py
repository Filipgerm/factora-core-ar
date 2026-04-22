"""JWT utilities for Factora user authentication.

Access token payload:
  - ``sub``             — user UUID string
  - ``role``            — UserRole enum value (e.g. "owner")
  - ``organization_id`` — organization UUID string, or None pre-setup
  - ``jti``             — UUID4 hex for forced revocation
  - ``iat`` / ``exp``   — standard timestamps

Refresh token: opaque ``secrets.token_urlsafe(48)``, 7-day TTL.
Its SHA-256 hash is stored in ``user_sessions.token_hash``.

When ``ENVIRONMENT=demo`` (``settings.demo_mode``), access tokens use a longer TTL
(``ACCESS_TOKEN_TTL_MINUTES_DEMO``) so idle demo sessions rarely hit expiry; production
and development keep the short default for tighter revocation windows.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import timedelta
from typing import Any

import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError

from app.core.config import settings
from app.core.exceptions import AuthError
from app.core.security.hashing import now_utc

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ACCESS_TOKEN_TTL_MINUTES: int = 30
ACCESS_TOKEN_TTL_MINUTES_DEMO: int = 8 * 60  # 8h — demo UX; refresh still caps at 7d
REFRESH_TOKEN_TTL_DAYS: int = 7

_ALGORITHM = "HS256"


def _access_token_ttl_minutes() -> int:
    """Return access-token lifetime; extended in demo only."""
    if settings.demo_mode:
        return ACCESS_TOKEN_TTL_MINUTES_DEMO
    return ACCESS_TOKEN_TTL_MINUTES


# ---------------------------------------------------------------------------
# Access token
# ---------------------------------------------------------------------------


def encode_access_token(
    user_id: str,
    *,
    role: str,
    organization_id: str | None,
) -> tuple[str, str]:
    """Create a signed JWT access token for the given user.

    Args:
        user_id: The user's UUID string.
        role: The user's RBAC role (e.g. ``"owner"``).
        organization_id: The user's organization UUID, or ``None`` before setup.

    Returns:
        A tuple of ``(raw_jwt_string, jti_hex)`` where ``jti_hex`` is stored
        as ``SHA-256(jti_hex)`` in ``user_sessions.jti_hash`` to enable forced
        revocation before the access-token TTL expires (30 min, or longer in demo).
    """
    now = now_utc()
    jti = uuid.uuid4().hex
    expires_at = now + timedelta(minutes=_access_token_ttl_minutes())
    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "organization_id": organization_id,
        "iat": now,
        "exp": expires_at,
        "jti": jti,
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=_ALGORITHM)
    return token, jti


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Returns:
        Validated payload dict with at least ``sub``, ``role``,
        ``organization_id``, and ``jti``.

    Raises:
        AuthError: If the token is expired, malformed, or has an invalid signature.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[_ALGORITHM],
            options={"require": ["sub", "exp", "iat", "jti"]},
        )
        return payload
    except ExpiredSignatureError:
        raise AuthError("Access token has expired", code="auth.token_expired")
    except InvalidTokenError as exc:
        raise AuthError(f"Invalid access token: {exc}", code="auth.token_invalid")


def get_token_expires_at(token: str) -> Any:
    """Return the ``exp`` datetime from a decoded token payload."""
    from datetime import datetime, timezone

    payload = decode_access_token(token)
    return datetime.fromtimestamp(payload["exp"], tz=timezone.utc)


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------


def generate_refresh_token() -> tuple[str, str]:
    """Generate a cryptographically random opaque refresh token.

    Returns:
        ``(raw_token, sha256_hex)`` — raw is sent to client, hash stored in DB.
    """
    raw = secrets.token_urlsafe(48)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return raw, digest


def hash_jti(jti: str) -> str:
    """Return SHA-256 hex of a JWT ``jti`` claim value."""
    return hashlib.sha256(jti.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Gmail OAuth CSRF state (short-lived HS256 JWT)
# ---------------------------------------------------------------------------

GMAIL_OAUTH_STATE_TTL_MINUTES: int = 15


def encode_gmail_oauth_state(*, user_id: str, organization_id: str) -> str:
    """Return a JWT used as ``state`` for Google Gmail OAuth redirect."""
    now = now_utc()
    expires_at = now + timedelta(minutes=GMAIL_OAUTH_STATE_TTL_MINUTES)
    payload: dict[str, Any] = {
        "typ": "gmail_oauth",
        "sub": user_id,
        "organization_id": organization_id,
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=_ALGORITHM)


def decode_gmail_oauth_state(token: str) -> dict[str, Any]:
    """Decode and validate Gmail OAuth ``state`` JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[_ALGORITHM],
            options={"require": ["sub", "exp", "iat", "typ", "organization_id"]},
        )
    except ExpiredSignatureError:
        raise AuthError(
            "Gmail OAuth state has expired", code="auth.gmail_state_expired"
        )
    except InvalidTokenError as exc:
        raise AuthError(
            f"Invalid Gmail OAuth state: {exc}", code="auth.gmail_state_invalid"
        )
    if payload.get("typ") != "gmail_oauth":
        raise AuthError(
            "Invalid Gmail OAuth state type", code="auth.gmail_state_invalid"
        )
    return payload


# ---------------------------------------------------------------------------
# Stripe Connect OAuth CSRF state (short-lived HS256 JWT)
# ---------------------------------------------------------------------------

STRIPE_CONNECT_OAUTH_STATE_TTL_MINUTES: int = 15


def encode_stripe_connect_state(*, user_id: str, organization_id: str) -> str:
    """Return a JWT used as ``state`` for Stripe Connect OAuth redirect."""
    now = now_utc()
    expires_at = now + timedelta(minutes=STRIPE_CONNECT_OAUTH_STATE_TTL_MINUTES)
    payload: dict[str, Any] = {
        "typ": "stripe_connect_oauth",
        "sub": user_id,
        "organization_id": organization_id,
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=_ALGORITHM)


def decode_stripe_connect_state(token: str) -> dict[str, Any]:
    """Decode and validate Stripe Connect OAuth ``state`` JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[_ALGORITHM],
            options={"require": ["sub", "exp", "iat", "typ", "organization_id"]},
        )
    except ExpiredSignatureError:
        raise AuthError(
            "Stripe Connect OAuth state has expired",
            code="auth.stripe_state_expired",
        )
    except InvalidTokenError as exc:
        raise AuthError(
            f"Invalid Stripe Connect OAuth state: {exc}",
            code="auth.stripe_state_invalid",
        )
    if payload.get("typ") != "stripe_connect_oauth":
        raise AuthError(
            "Invalid Stripe Connect OAuth state type",
            code="auth.stripe_state_invalid",
        )
    return payload


# ---------------------------------------------------------------------------
# HubSpot OAuth CSRF state (short-lived HS256 JWT)
# ---------------------------------------------------------------------------

HUBSPOT_OAUTH_STATE_TTL_MINUTES: int = 15


def encode_hubspot_oauth_state(*, user_id: str, organization_id: str) -> str:
    """Return a JWT used as ``state`` for HubSpot OAuth redirect."""
    now = now_utc()
    expires_at = now + timedelta(minutes=HUBSPOT_OAUTH_STATE_TTL_MINUTES)
    payload: dict[str, Any] = {
        "typ": "hubspot_oauth",
        "sub": user_id,
        "organization_id": organization_id,
        "iat": now,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=_ALGORITHM)


def decode_hubspot_oauth_state(token: str) -> dict[str, Any]:
    """Decode and validate HubSpot OAuth ``state`` JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[_ALGORITHM],
            options={"require": ["sub", "exp", "iat", "typ", "organization_id"]},
        )
    except ExpiredSignatureError:
        raise AuthError(
            "HubSpot OAuth state has expired",
            code="auth.hubspot_state_expired",
        )
    except InvalidTokenError as exc:
        raise AuthError(
            f"Invalid HubSpot OAuth state: {exc}",
            code="auth.hubspot_state_invalid",
        )
    if payload.get("typ") != "hubspot_oauth":
        raise AuthError(
            "Invalid HubSpot OAuth state type",
            code="auth.hubspot_state_invalid",
        )
    return payload
