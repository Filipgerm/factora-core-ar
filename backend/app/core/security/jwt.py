"""JWT utilities for Factora seller authentication.

This module is the single place where JWTs are created and validated.
It uses PyJWT with HS256 signing.

Token lifecycle:
  - Access token: stateless JWT, 30-minute TTL.  Never stored in the DB.
  - Refresh token: opaque ``secrets.token_urlsafe``, 7-day TTL.  Its SHA-256
    hash is stored in ``seller_sessions``.

The ``jti`` claim (UUID4 hex) is embedded in the access token so that an
issued JWT can be force-revoked (e.g. on password change) by storing its
SHA-256 hash in ``seller_sessions.jti_hash`` before the 30-min TTL expires.
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
from app.core.exceptions import AuthenticationError
from app.core.security.hashing import now_utc

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ACCESS_TOKEN_TTL_MINUTES: int = 30
REFRESH_TOKEN_TTL_DAYS: int = 7

_ALGORITHM = "HS256"


# ---------------------------------------------------------------------------
# Access token
# ---------------------------------------------------------------------------


def encode_access_token(seller_id: str) -> tuple[str, str]:
    """Create a signed JWT access token for the given seller.

    Args:
        seller_id: The seller's primary key (UUID hex).

    Returns:
        A tuple of ``(raw_jwt_string, jti_hex)`` where ``jti_hex`` is the
        UUID4 string embedded in the token's ``jti`` claim.  The caller
        may store ``SHA-256(jti_hex)`` in ``seller_sessions.jti_hash`` to
        enable forced revocation.
    """
    now = now_utc()
    jti = uuid.uuid4().hex
    payload: dict[str, Any] = {
        "sub": seller_id,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES),
        "jti": jti,
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=_ALGORITHM)
    return token, jti


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token.

    Args:
        token: The raw JWT string received from the ``Authorization`` header.

    Returns:
        The validated payload dict containing at least ``sub`` and ``jti``.

    Raises:
        AuthenticationError: If the token is expired, malformed, or has an
            invalid signature.
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
        raise AuthenticationError("Access token has expired")
    except InvalidTokenError as exc:
        raise AuthenticationError(f"Invalid access token: {exc}")


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------


def generate_refresh_token() -> tuple[str, str]:
    """Generate a cryptographically random opaque refresh token.

    Returns:
        A tuple of ``(raw_token, sha256_hex)`` where ``raw_token`` is
        returned to the client and ``sha256_hex`` is stored in the DB.
    """
    raw = secrets.token_urlsafe(48)
    digest = hashlib.sha256(raw.encode()).hexdigest()
    return raw, digest


def hash_jti(jti: str) -> str:
    """Return SHA-256 hex of a JWT ``jti`` claim value.

    Args:
        jti: The raw ``jti`` string from the JWT payload.

    Returns:
        64-character lowercase hex digest.
    """
    return hashlib.sha256(jti.encode()).hexdigest()
