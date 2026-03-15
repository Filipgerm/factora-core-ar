"""Shared pytest fixtures for UserService unit tests.

All tests use mocked SQLAlchemy AsyncSession objects to avoid any real
database dependency.  The session mock is built with unittest.mock.AsyncMock
so that every awaited call returns a controllable value.

Environment variables are populated with dummy values at the very top of this
module so that ``app.config.Settings`` can be instantiated without a real
``.env`` file during unit tests.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Inject dummy env vars BEFORE any app module is imported.
# app.config.Settings is instantiated at module-load time, so every required
# field must be present in os.environ before the first `import app.*` line.
# ---------------------------------------------------------------------------
import os

_TEST_ENV = {
    "SUPABASE_URI": "postgresql+asyncpg://test:test@localhost/testdb",
    "SUPABASE_URI_SHARED_POOLER": "postgresql+asyncpg://test:test@localhost/testdb",
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_SECRET_KEY": "test-secret-key",
    "ALEMBIC_DATABASE_URL": "postgresql://test:test@localhost/testdb",
    "SUPABASE_BUCKET": "test-bucket",
    "GEMH_API_KEY": "test-gemh-key",
    "BREVO_API_KEY": "test-brevo-key",
    "BREVO_SMTP_KEY": "test-brevo-smtp-key",
    "BREVO_SENDER_EMAIL": "noreply@test.com",
    "BREVO_SENDER_NAME": "Test Sender",
    "AADE_USERNAME": "test-aade-user",
    "AADE_SUBSCRIPTION_KEY": "test-aade-key",
    "NGROK_DEV_BASE_URL": "https://test.ngrok.io",
    "SALTEDGE_APP_ID": "test-saltedge-app-id",
    "SALTEDGE_SECRET": "test-saltedge-secret",
    "CODE_PEPPER": "test_pepper_123456",
    "JWT_SECRET_KEY": "test-jwt-secret-key-for-unit-tests-only-not-for-production",
    "CORS_ORIGINS": "",
    "ALLOWED_HOSTS": "*",
}

for _key, _val in _TEST_ENV.items():
    os.environ.setdefault(_key, _val)

# ---------------------------------------------------------------------------
# Standard imports (app modules may now be safely imported)
# ---------------------------------------------------------------------------
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.services.user_service import UserService, hash_password, hash_token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_db_session() -> AsyncMock:
    """Return a minimal AsyncMock that behaves like an AsyncSession.

    ``db.execute`` is an :class:`AsyncMock` (it is awaited in the service),
    but its *return value* must be a plain :class:`MagicMock` so that
    synchronous result methods like ``scalar_one_or_none()`` and
    ``scalars().all()`` return real values rather than coroutines.

    Returns:
        An :class:`AsyncMock` with ``execute``, ``commit``, ``rollback``,
        ``add``, and ``refresh`` stubbed out.
    """
    db = AsyncMock()
    # The object returned after `await db.execute(...)` must be a plain
    # MagicMock so its sync helper methods work correctly.
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalar_one.return_value = 0
    result.scalars.return_value.all.return_value = []
    db.execute.return_value = result
    return db


def make_seller(
    *,
    id: str = "seller_1",
    username: str = "testuser",
    password: str = "S3cr3tPass!",
    pepper: str = "test_pepper_123456",
    is_active: bool = True,
    access_token_raw: str | None = None,
    access_token_expires_at: datetime | None = None,
) -> MagicMock:
    """Create a mock Sellers ORM instance suitable for login/auth tests.

    Args:
        id: Seller primary key.
        username: Seller username.
        password: Plaintext password (will be hashed via ``hash_password``).
        pepper: The pepper used to hash the password.
        is_active: Whether the account is active.
        access_token_raw: If provided, the raw token; stored hash is derived.
        access_token_expires_at: Optional token expiry datetime.

    Returns:
        A :class:`MagicMock` with the expected Sellers attributes.
    """
    seller = MagicMock()
    seller.id = id
    seller.username = username
    seller.password_hash = hash_password(password, pepper=pepper)
    seller.is_active = is_active
    seller.last_access_token = hash_token(access_token_raw) if access_token_raw else None
    seller.access_token_expires_at = access_token_expires_at
    return seller


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PEPPER = "test_pepper_123456"


@pytest.fixture
def db() -> AsyncMock:
    """Provide a fresh mocked AsyncSession for each test."""
    return make_db_session()


@pytest.fixture
def svc(db: AsyncMock) -> UserService:
    """Provide a UserService wired to a mocked database session.

    Args:
        db: Mocked AsyncSession from the :func:`db` fixture.

    Returns:
        A :class:`UserService` instance ready for unit testing.
    """
    return UserService(db=db, code_pepper=PEPPER)
