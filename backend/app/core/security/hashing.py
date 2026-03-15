"""Cryptographic hashing utilities for Factora.

This module centralises all low-level hashing primitives so they can be
imported without pulling in the full service layer.

Password hashing uses Argon2id via ``argon2-cffi``.
Token / OTP hashing uses SHA-256 (``hashlib``).
"""
from __future__ import annotations

import hashlib
import string
import secrets
from datetime import datetime, timezone

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# ---------------------------------------------------------------------------
# Shared Argon2 hasher instance — tune cost parameters here once.
# ---------------------------------------------------------------------------
_ph = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=2)


# ---------------------------------------------------------------------------
# Time helpers
# ---------------------------------------------------------------------------


def now_utc() -> datetime:
    """Return the current UTC datetime with timezone info.

    Returns:
        A timezone-aware ``datetime`` in UTC.
    """
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Password hashing (Argon2id)
# ---------------------------------------------------------------------------


def hash_password(password: str, *, pepper: str | None = None) -> str:
    """Return an Argon2id hash string suitable for storage in the DB.

    Optionally mixes in a server-side pepper kept in a secrets manager.
    Never call this for verification — use ``verify_password`` instead.

    Args:
        password: The plaintext password to hash.
        pepper: Optional server-side secret prepended before hashing.

    Returns:
        An Argon2id hash string.
    """
    pwd = f"{pepper}{password}" if pepper else password
    return _ph.hash(pwd)


def verify_password(
    stored_hash: str, password: str, *, pepper: str | None = None
) -> bool:
    """Verify a plaintext password against an Argon2id stored hash.

    Handles salt extraction internally via the Argon2 library; safe against
    timing attacks.  Returns ``False`` (never raises) on mismatch so callers
    can use a simple boolean check.

    Args:
        stored_hash: The Argon2id hash retrieved from the database.
        password: The plaintext password supplied by the user.
        pepper: Optional server-side secret that was mixed in at hash time.

    Returns:
        ``True`` if the password matches, ``False`` otherwise.
    """
    pwd = f"{pepper}{password}" if pepper else password
    try:
        return _ph.verify(stored_hash, pwd)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


# ---------------------------------------------------------------------------
# Token hashing (SHA-256)
# ---------------------------------------------------------------------------


def hash_token(raw_token: str) -> str:
    """Return a SHA-256 hex digest of *raw_token* for safe DB storage.

    The raw token is returned to the client; only its hash is persisted so
    that a database read cannot be used to forge a valid session.

    Args:
        raw_token: The raw opaque token string (e.g. from ``secrets.token_urlsafe``).

    Returns:
        A 64-character lowercase hex string.
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()


def sha256_code(code: str, *, pepper: str) -> str:
    """Hash a short numeric OTP code with a server-side pepper.

    Args:
        code: The plaintext OTP code (e.g. ``"4821"``).
        pepper: Server-side secret mixed in to prevent rainbow-table attacks.

    Returns:
        A 64-character lowercase hex string.
    """
    h = hashlib.sha256()
    h.update(f"{pepper}:{code}".encode("utf-8"))
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Token generation
# ---------------------------------------------------------------------------


def generate_token(nbytes: int = 32) -> str:
    """Generate a cryptographically random URL-safe token.

    Args:
        nbytes: Number of random bytes (default 32 → ~43 URL-safe chars).

    Returns:
        A URL-safe base64-encoded string of *nbytes* random bytes.
    """
    return secrets.token_urlsafe(nbytes)


def generate_numeric_code(length: int = 6) -> str:
    """Generate a random numeric OTP code.

    Args:
        length: Number of digits (default 6).

    Returns:
        A string of *length* decimal digits.
    """
    return "".join(secrets.choice(string.digits) for _ in range(length))
