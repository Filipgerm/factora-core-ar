"""Fernet field-level encryption for OAuth refresh tokens and similar secrets.

**Scope:** Encrypt/decrypt short UTF-8 strings using ``GMAIL_TOKEN_ENCRYPTION_KEY``.

**Contract:** ``encrypt_secret`` / ``decrypt_secret`` raise ``ValueError`` when the key
is missing or invalid. Callers must never log plaintext.
"""

from __future__ import annotations

from app.config import settings


def _fernet():
    from cryptography.fernet import Fernet

    key = (settings.GMAIL_TOKEN_ENCRYPTION_KEY or "").strip()
    if not key:
        raise ValueError(
            "GMAIL_TOKEN_ENCRYPTION_KEY is not configured (generate with "
            "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\")"
        )
    return Fernet(key.encode("utf-8"))


def encrypt_secret(plain: str) -> str:
    """Return urlsafe base64 ciphertext (ascii str)."""
    if not plain:
        raise ValueError("Cannot encrypt empty secret")
    f = _fernet()
    return f.encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt_secret(token: str) -> str:
    """Decrypt ciphertext produced by ``encrypt_secret``."""
    if not token:
        raise ValueError("Cannot decrypt empty token")
    f = _fernet()
    return f.decrypt(token.encode("ascii")).decode("utf-8")
