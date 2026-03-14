"""Unit tests for UserService authentication logic.

Tests use a mocked SQLAlchemy AsyncSession (no real database).
Each test section covers a distinct area of the auth surface.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.user_service import (
    UserService,
    hash_password,
    verify_password,
    hash_token,
    now_utc,
)
from app.models.user import LoginRequest, SignUpRequest, ChangePasswordRequest

from app.tests.conftest import PEPPER, make_db_session, make_seller


# ---------------------------------------------------------------------------
# hash_password / verify_password
# ---------------------------------------------------------------------------


class TestPasswordHashing:
    """verify_password must correctly compare against Argon2 stored hashes."""

    def test_verify_correct_password(self):
        stored = hash_password("correct_pass", pepper=PEPPER)
        assert verify_password(stored, "correct_pass", pepper=PEPPER) is True

    def test_verify_wrong_password(self):
        stored = hash_password("correct_pass", pepper=PEPPER)
        assert verify_password(stored, "wrong_pass", pepper=PEPPER) is False

    def test_verify_without_pepper(self):
        stored = hash_password("pass", pepper=None)
        assert verify_password(stored, "pass", pepper=None) is True

    def test_verify_pepper_mismatch(self):
        stored = hash_password("pass", pepper="pepper_a")
        assert verify_password(stored, "pass", pepper="pepper_b") is False

    def test_two_hashes_of_same_password_are_unequal(self):
        """Argon2 uses random salts — two hash() calls must produce different strings."""
        h1 = hash_password("same_pass", pepper=PEPPER)
        h2 = hash_password("same_pass", pepper=PEPPER)
        assert h1 != h2

    def test_verify_handles_invalid_hash_gracefully(self):
        """Passing garbage as stored_hash must return False, not raise."""
        assert verify_password("not_a_valid_argon2_hash", "pass") is False


# ---------------------------------------------------------------------------
# hash_token
# ---------------------------------------------------------------------------


class TestHashToken:
    """hash_token must return a deterministic 64-char SHA-256 hex digest."""

    def test_known_digest(self):
        import hashlib
        raw = "my_raw_token"
        expected = hashlib.sha256(raw.encode()).hexdigest()
        assert hash_token(raw) == expected

    def test_returns_64_hex_chars(self):
        result = hash_token("any_token")
        assert len(result) == 64
        assert all(c in "0123456789abcdef" for c in result)

    def test_same_input_same_output(self):
        assert hash_token("tok") == hash_token("tok")

    def test_different_inputs_different_outputs(self):
        assert hash_token("tok_a") != hash_token("tok_b")


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------


class TestLogin:
    """UserService.login must verify password via ph.verify(), not hash comparison."""

    @pytest.mark.asyncio
    async def test_login_happy_path(self, svc: UserService, db: AsyncMock):
        """Login with correct credentials returns success and a raw access token."""
        seller = make_seller(username="alice", password="GoodPass1!", pepper=PEPPER)
        db.execute.return_value.scalar_one_or_none.return_value = seller

        req = LoginRequest(username="alice", password="GoodPass1!")
        result = await svc.login(req)

        assert result.success is True
        assert result.access_token is not None
        assert result.username == "alice"
        # The DB update must store the HASH of the token, not the raw token
        call_args = db.execute.call_args_list
        # find the update statement call — last execute before commit
        db.commit.assert_awaited()

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, svc: UserService, db: AsyncMock):
        """Login with incorrect password returns success=False without enumeration."""
        seller = make_seller(username="alice", password="GoodPass1!", pepper=PEPPER)
        db.execute.return_value.scalar_one_or_none.return_value = seller

        req = LoginRequest(username="alice", password="WrongPass!")
        result = await svc.login(req)

        assert result.success is False
        assert "Invalid username or password" in result.message
        db.commit.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_login_unknown_user(self, svc: UserService, db: AsyncMock):
        """Login with non-existent username returns success=False."""
        db.execute.return_value.scalar_one_or_none.return_value = None

        req = LoginRequest(username="ghost", password="SomePass!")
        result = await svc.login(req)

        assert result.success is False
        assert "Invalid username or password" in result.message

    @pytest.mark.asyncio
    async def test_login_stores_token_hash_not_raw(self, svc: UserService, db: AsyncMock):
        """The raw bearer token returned to the client must NOT equal what is stored.

        We verify this by inspecting the SQLAlchemy Update statement that was
        passed to ``db.execute`` — specifically the ``last_access_token`` bind
        parameter must equal ``hash_token(raw_token)``, not the raw token.
        """
        seller = make_seller(username="bob", password="Pass1234!", pepper=PEPPER)
        db.execute.return_value.scalar_one_or_none.return_value = seller

        req = LoginRequest(username="bob", password="Pass1234!")
        result = await svc.login(req)

        assert result.success is True
        raw_token = result.access_token
        expected_hash = hash_token(raw_token)

        # db.execute is called twice: first SELECT, then UPDATE.
        # Extract the UPDATE statement (second call) and inspect its params.
        assert db.execute.call_count == 2
        update_stmt = db.execute.call_args_list[1].args[0]

        # Compile the statement to extract bind params
        compiled = update_stmt.compile(compile_kwargs={"literal_binds": False})
        params = compiled.params

        assert params.get("last_access_token") == expected_hash, (
            "Stored token hash must be SHA-256 of the raw token, not the raw token"
        )
        assert params.get("last_access_token") != raw_token, (
            "Raw bearer token must never be persisted"
        )


# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------


class TestLogout:
    """UserService.logout must look up users by token hash."""

    @pytest.mark.asyncio
    async def test_logout_happy_path(self, svc: UserService, db: AsyncMock):
        """Logout with a valid token clears the stored hash."""
        raw_token = "my_valid_raw_token"
        seller = make_seller(access_token_raw=raw_token)
        db.execute.return_value.scalar_one_or_none.return_value = seller

        result = await svc.logout(raw_token)

        assert result.success is True
        db.commit.assert_awaited()

    @pytest.mark.asyncio
    async def test_logout_invalid_token(self, svc: UserService, db: AsyncMock):
        """Logout with an unrecognised token returns success=False."""
        db.execute.return_value.scalar_one_or_none.return_value = None

        result = await svc.logout("unknown_token")

        assert result.success is False
        db.commit.assert_not_awaited()


# ---------------------------------------------------------------------------
# change_password
# ---------------------------------------------------------------------------


class TestChangePassword:
    """change_password must verify the current password before updating."""

    @pytest.mark.asyncio
    async def test_change_password_happy_path(self, svc: UserService, db: AsyncMock):
        """Correct current password + valid new password succeeds."""
        raw_token = "session_token_xyz"
        seller = make_seller(
            password="OldPass123!",
            pepper=PEPPER,
            access_token_raw=raw_token,
            access_token_expires_at=now_utc() + timedelta(hours=1),
        )
        db.execute.return_value.scalar_one_or_none.return_value = seller

        req = ChangePasswordRequest(
            current_password="OldPass123!", new_password="NewPass456!", confirm_password="NewPass456!"
        )
        result = await svc.change_password(raw_token, req)

        assert result.success is True
        db.commit.assert_awaited()

    @pytest.mark.asyncio
    async def test_change_password_wrong_current(self, svc: UserService, db: AsyncMock):
        """Incorrect current password returns success=False."""
        raw_token = "session_token_xyz"
        seller = make_seller(
            password="OldPass123!",
            pepper=PEPPER,
            access_token_raw=raw_token,
            access_token_expires_at=now_utc() + timedelta(hours=1),
        )
        db.execute.return_value.scalar_one_or_none.return_value = seller

        req = ChangePasswordRequest(
            current_password="WrongOldPass!", new_password="NewPass456!", confirm_password="NewPass456!"
        )
        result = await svc.change_password(raw_token, req)

        assert result.success is False
        assert "Current password is incorrect" in result.message
        db.commit.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_change_password_reuse_rejected(self, svc: UserService, db: AsyncMock):
        """New password identical to current password is rejected."""
        raw_token = "session_token_xyz"
        seller = make_seller(
            password="SamePass123!",
            pepper=PEPPER,
            access_token_raw=raw_token,
            access_token_expires_at=now_utc() + timedelta(hours=1),
        )
        db.execute.return_value.scalar_one_or_none.return_value = seller

        req = ChangePasswordRequest(
            current_password="SamePass123!", new_password="SamePass123!", confirm_password="SamePass123!"
        )
        result = await svc.change_password(raw_token, req)

        assert result.success is False
        assert "different from the current" in result.message

    @pytest.mark.asyncio
    async def test_change_password_expired_session(self, svc: UserService, db: AsyncMock):
        """Expired access token returns success=False before checking passwords."""
        raw_token = "expired_token"
        seller = make_seller(
            password="OldPass123!",
            pepper=PEPPER,
            access_token_raw=raw_token,
            access_token_expires_at=now_utc() - timedelta(hours=1),
        )
        db.execute.return_value.scalar_one_or_none.return_value = seller

        req = ChangePasswordRequest(
            current_password="OldPass123!", new_password="NewPass456!", confirm_password="NewPass456!"
        )
        result = await svc.change_password(raw_token, req)

        assert result.success is False
        assert "expired" in result.message.lower()


# ---------------------------------------------------------------------------
# sign_up
# ---------------------------------------------------------------------------


class TestSignUp:
    """UserService.sign_up basic validation guard tests."""

    @pytest.mark.asyncio
    async def test_signup_duplicate_username(self, svc: UserService, db: AsyncMock):
        """Signing up with an existing username returns success=False."""
        existing = make_seller(username="taken")
        # First execute (username check) finds a match
        db.execute.return_value.scalar_one_or_none.return_value = existing

        req = SignUpRequest(
            username="taken",
            password="UniquePass1!",
            email="taken@example.com",
        )
        result = await svc.sign_up(req)

        assert result.success is False
