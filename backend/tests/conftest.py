"""Shared pytest fixtures for backend unit tests.

All tests use mocked SQLAlchemy AsyncSession objects to avoid any real
database dependency.  Environment variables are populated with dummy values
before any app module is imported.
"""
from __future__ import annotations

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
    "FRONTEND_BASE_URL": "https://test.factora.example.com",
    "SALTEDGE_APP_ID": "test-saltedge-app-id",
    "SALTEDGE_SECRET": "test-saltedge-secret",
    "CODE_PEPPER": "test_pepper_123456",
    "JWT_SECRET_KEY": "test-jwt-secret-key-for-unit-tests-only-not-for-production",
    "GOOGLE_CLIENT_ID": "test-google-client-id",
    "GOOGLE_CLIENT_SECRET": "test-google-client-secret",
    "CORS_ORIGINS": "",
    "ALLOWED_HOSTS": "*",
    "LLM_PROVIDER": "gemini",
    "GEMINI_API_KEY": "",
    "GEMINI_CHAT_MODEL": "gemini-2.0-flash",
    "GEMINI_EMBEDDING_MODEL": "text-embedding-004",
    "OPENAI_API_KEY": "",
    "OPENAI_CHAT_MODEL": "gpt-4o-mini",
    "OPENAI_EMBEDDING_MODEL": "text-embedding-3-small",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_CHAT_MODEL": "claude-sonnet-4-20250514",
    "EMBEDDING_PROVIDER": "gemini",
    "EMBEDDING_DIMENSIONS": "768",
    "GMAIL_TOKEN_ENCRYPTION_KEY": "A9vX3IGNQkJjNzKE9waY8LUEglgN4RYr-jhT-cyUWZA=",
    "GOOGLE_GMAIL_REDIRECT_URI": "https://test.factora.example.com/v1/integrations/gmail/callback",
    "GMAIL_PUBSUB_VERIFICATION_AUDIENCE": "",
    "STRIPE_SECRET_KEY": "",
    "STRIPE_WEBHOOK_SECRET": "",
    "STRIPE_API_VERSION": "2026-02-25.clover",
}

for _key, _val in _TEST_ENV.items():
    os.environ.setdefault(_key, _val)

from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.security.hashing import hash_password, hash_token


def make_db_session() -> AsyncMock:
    """Return a minimal AsyncMock that behaves like an AsyncSession."""
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalar_one.return_value = 0
    result.scalars.return_value.all.return_value = []
    result.first.return_value = None
    db.execute.return_value = result
    return db


PEPPER = "test_pepper_123456"


@pytest.fixture
def db() -> AsyncMock:
    """Provide a fresh mocked AsyncSession for each test."""
    return make_db_session()


@pytest.fixture
def auth_service(db: AsyncMock):
    """Provide an AuthService wired to a mocked database session."""
    from app.services.auth_service import AuthService
    return AuthService(db=db, code_pepper=PEPPER)
