"""AuthService — user authentication, password management, Google OAuth, and OTP verification.

All methods return typed Pydantic DTOs on success and raise ``AppError``
subclasses on failure.  Controllers catch ``AppError`` subclasses and map them
to ``HTTPException``; the global handler in ``main.py`` converts any uncaught
``AppError`` to a structured JSON response automatically.

Google OAuth flow:
  1. Frontend obtains a Google ``id_token`` via Google Sign-In JS SDK.
  2. Frontend POSTs ``{ id_token }`` to ``POST /v1/auth/google``.
  3. ``sign_up_with_google`` verifies the token against Google's public certs,
     upserts the ``User`` row (matching on ``google_id`` or ``email``), and
     returns an ``AuthResponse`` identical to a password-based login.

OTP verification (email/phone):
  Integrated into the sign-in flow: after sign-up the user is prompted to
  verify their email, and optionally their phone.  Verification sessions are
  stored in-memory-compatible JSONB on the ``User`` row to avoid a separate
  table — for production at scale, migrate to Redis with TTL.
"""
from __future__ import annotations

import logging
import secrets
import uuid
from datetime import timedelta
from typing import Optional

import httpx
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import (
    AuthError,
    ConflictError,
    ExternalServiceError,
    NotFoundError,
    ValidationError,
)
from app.core.security.hashing import (
    generate_numeric_code,
    hash_password,
    hash_token,
    now_utc,
    sha256_code,
    verify_password,
)
from app.core.security.jwt import (
    REFRESH_TOKEN_TTL_DAYS,
    decode_access_token,
    encode_access_token,
    generate_refresh_token,
    get_token_expires_at,
    hash_jti,
)
from app.db.models.banking import CustomerModel
from app.db.models.identity import User, UserRole, UserSession
from app.models.auth import (
    AuthResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignUpRequest,
    TokenResponse,
    UserProfileResponse,
    VerificationInitResponse,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

_GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo"


class AuthService:
    """Handles user authentication, token management, and identity verification."""

    def __init__(self, db: AsyncSession, *, code_pepper: str) -> None:
        self.db = db
        self.code_pepper = code_pepper
        self.notification_service = NotificationService()

    async def _primary_saltedge_customer_id_for_org(
        self, organization_id: str | None
    ) -> str | None:
        """Oldest ``customers`` row for the org (matches org profile / P&L resolution)."""
        if not organization_id:
            return None
        result = await self.db.execute(
            select(CustomerModel.id)
            .where(CustomerModel.organization_id == organization_id)
            .order_by(CustomerModel.created_at.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def _build_auth_response(
        self, user: User, access_token: str, raw_refresh: str
    ) -> AuthResponse:
        """Build a full AuthResponse from a User ORM object and issued tokens."""
        expires_at = get_token_expires_at(access_token)
        saltedge_customer_id = await self._primary_saltedge_customer_id_for_org(
            user.organization_id
        )
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            expires_at=expires_at,
            refresh_token=raw_refresh,
            user_id=uuid.UUID(user.id),
            username=user.username,
            email=user.email,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            organization_id=uuid.UUID(user.organization_id) if user.organization_id else None,
            email_verified=user.email_verified,
            phone_verified=user.phone_verified,
            saltedge_customer_id=saltedge_customer_id,
        )

    # ------------------------------------------------------------------
    # Sign-up / Sign-in
    # ------------------------------------------------------------------

    async def sign_up(self, request: SignUpRequest) -> UserProfileResponse:
        """Create a new user with a hashed password.

        Returns:
            ``UserProfileResponse`` — profile without tokens (user must login next).

        Raises:
            ConflictError: Email or username already taken.
        """
        try:
            existing = await self.db.execute(
                select(User.id).where(User.email == request.email)
            )
            if existing.scalar_one_or_none():
                raise ConflictError(
                    "Email already in use.",
                    code="auth.email_conflict",
                )

            result = await self.db.execute(
                insert(User)
                .values(
                    username=request.username,
                    email=request.email,
                    password_hash=hash_password(request.password, pepper=self.code_pepper),
                    role=UserRole.OWNER,
                    is_active=True,
                    email_verified=False,
                    phone_verified=False,
                )
                .returning(User.id, User.username, User.email, User.role, User.organization_id)
            )
            row = result.first()
            await self.db.commit()

            return UserProfileResponse(
                user_id=uuid.UUID(row.id),
                username=row.username,
                email=row.email,
                role=row.role.value if hasattr(row.role, "value") else str(row.role),
                organization_id=None,
                email_verified=False,
                phone_verified=False,
                saltedge_customer_id=None,
            )

        except IntegrityError:
            await self.db.rollback()
            raise ConflictError("Email or username already in use.", code="auth.email_conflict")
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during sign_up: %s", e)
            raise ExternalServiceError("Database error during sign up.", code="db.error")

    async def login(
        self,
        request: LoginRequest,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthResponse:
        """Validate email/password credentials and issue tokens.

        Returns:
            ``AuthResponse`` — access token, refresh token, and user profile.

        Raises:
            AuthError: Invalid credentials or disabled account.
        """
        try:
            result = await self.db.execute(select(User).where(User.email == request.email))
            user: Optional[User] = result.scalar_one_or_none()

            if not user or not user.password_hash or not verify_password(
                user.password_hash, request.password, pepper=self.code_pepper
            ):
                raise AuthError("Invalid email or password.", code="auth.invalid_credentials")

            if not user.is_active:
                raise AuthError("Account is disabled. Please contact support.", code="auth.account_disabled")

            access_token, jti = encode_access_token(
                user.id,
                role=user.role.value if hasattr(user.role, "value") else str(user.role),
                organization_id=user.organization_id,
            )
            raw_refresh, refresh_hash = generate_refresh_token()
            now = now_utc()

            session = UserSession(
                user_id=user.id,
                token_hash=refresh_hash,
                jti_hash=hash_jti(jti),
                expires_at=now + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
                created_at=now,
                last_used_at=now,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            self.db.add(session)
            await self.db.commit()
            await self.db.refresh(user)

            return await self._build_auth_response(user, access_token, raw_refresh)

        except (AuthError, ConflictError, ValidationError):
            raise
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during login: %s", e)
            raise ExternalServiceError("Database error during login.", code="db.error")

    async def sign_up_with_google(
        self,
        id_token: str,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthResponse:
        """Verify a Google ID token and upsert the user, returning an AuthResponse.

        If a user with the same ``google_id`` already exists, they are logged in.
        If a user with the same ``email`` exists (but no google_id), the
        google_id is linked to their existing account.
        Otherwise, a new User is created with ``OWNER`` role.

        Raises:
            AuthError: If the Google token is invalid or the account is disabled.
            ExternalServiceError: If Google's token-info endpoint is unreachable.
        """
        google_payload = await self._verify_google_id_token(id_token)
        google_id = google_payload["sub"]
        email: str = google_payload.get("email", "")
        name: str = google_payload.get("name", email.split("@")[0])

        try:
            # Try to find by google_id first, then by email
            result = await self.db.execute(
                select(User).where(User.google_id == google_id)
            )
            user: Optional[User] = result.scalar_one_or_none()

            if not user:
                result = await self.db.execute(
                    select(User).where(User.email == email)
                )
                user = result.scalar_one_or_none()

            if user:
                if not user.is_active:
                    raise AuthError("Account is disabled.", code="auth.account_disabled")
                if not user.google_id:
                    await self.db.execute(
                        update(User).where(User.id == user.id).values(google_id=google_id)
                    )
                    await self.db.commit()
                    await self.db.refresh(user)
            else:
                # New user via Google — generate a unique username from email prefix
                username_base = email.split("@")[0]
                username = await self._unique_username(username_base)

                result = await self.db.execute(
                    insert(User)
                    .values(
                        username=username,
                        email=email,
                        google_id=google_id,
                        password_hash=None,
                        role=UserRole.OWNER,
                        is_active=True,
                        email_verified=True,  # Google already verified the email
                        phone_verified=False,
                    )
                    .returning(User)
                )
                user_row = result.scalar_one()
                await self.db.commit()
                result2 = await self.db.execute(select(User).where(User.id == user_row.id))
                user = result2.scalar_one()

            access_token, jti = encode_access_token(
                user.id,
                role=user.role.value if hasattr(user.role, "value") else str(user.role),
                organization_id=user.organization_id,
            )
            raw_refresh, refresh_hash = generate_refresh_token()
            now = now_utc()

            session = UserSession(
                user_id=user.id,
                token_hash=refresh_hash,
                jti_hash=hash_jti(jti),
                expires_at=now + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
                created_at=now,
                last_used_at=now,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            self.db.add(session)
            await self.db.commit()
            await self.db.refresh(user)

            return await self._build_auth_response(user, access_token, raw_refresh)

        except (AuthError,):
            raise
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during Google sign-up: %s", e)
            raise ExternalServiceError("Database error during Google auth.", code="db.error")

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    async def build_switch_organization_response(self, user: User) -> "SwitchOrganizationResponse":
        """Mint a new access JWT after ``users.organization_id`` / role were updated."""
        from app.models.organization import SwitchOrganizationResponse

        access_token, _ = encode_access_token(
            user.id,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            organization_id=user.organization_id,
        )
        expires_at = get_token_expires_at(access_token)
        saltedge_customer_id = await self._primary_saltedge_customer_id_for_org(
            user.organization_id
        )
        return SwitchOrganizationResponse(
            access_token=access_token,
            token_type="bearer",
            expires_at=expires_at,
            user_id=uuid.UUID(user.id),
            username=user.username,
            email=user.email,
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            organization_id=uuid.UUID(user.organization_id) if user.organization_id else None,
            email_verified=user.email_verified,
            phone_verified=user.phone_verified,
            saltedge_customer_id=saltedge_customer_id,
        )

    async def logout(self, refresh_token: str) -> None:
        """Revoke the user's refresh token session."""
        try:
            token_hash = hash_token(refresh_token)
            await self.db.execute(
                delete(UserSession).where(UserSession.token_hash == token_hash)
            )
            await self.db.commit()
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during logout: %s", e)
            raise ExternalServiceError("Database error during logout.", code="db.error")

    async def refresh_tokens(
        self,
        refresh_token: str,
        *,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> AuthResponse:
        """Rotate the refresh token and issue a new access token.

        Raises:
            AuthError: Token is invalid, expired, or has already been consumed.
        """
        try:
            token_hash = hash_token(refresh_token)
            now = now_utc()

            result = await self.db.execute(
                delete(UserSession)
                .where(
                    UserSession.token_hash == token_hash,
                    UserSession.expires_at > now,
                )
                .returning(UserSession.user_id, UserSession.user_agent, UserSession.ip_address)
            )
            consumed = result.first()

            if not consumed:
                raise AuthError("Invalid or expired refresh token.", code="auth.token_invalid")

            user_id, old_ua, old_ip = consumed

            result2 = await self.db.execute(
                select(User).where(User.id == user_id, User.is_active.is_(True))
            )
            user: Optional[User] = result2.scalar_one_or_none()

            if not user:
                await self.db.commit()
                raise AuthError("Account not found or disabled.", code="auth.account_disabled")

            access_token, jti = encode_access_token(
                user.id,
                role=user.role.value if hasattr(user.role, "value") else str(user.role),
                organization_id=user.organization_id,
            )
            raw_refresh, refresh_hash = generate_refresh_token()

            new_session = UserSession(
                user_id=user.id,
                token_hash=refresh_hash,
                jti_hash=hash_jti(jti),
                expires_at=now + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
                created_at=now,
                last_used_at=now,
                user_agent=user_agent or old_ua,
                ip_address=ip_address or old_ip,
            )
            self.db.add(new_session)
            await self.db.commit()

            return await self._build_auth_response(user, access_token, raw_refresh)

        except (AuthError,):
            raise
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during token refresh: %s", e)
            raise ExternalServiceError("Database error during token refresh.", code="db.error")

    # ------------------------------------------------------------------
    # Password management
    # ------------------------------------------------------------------

    async def forgot_password(self, request: ForgotPasswordRequest) -> MessageResponse:
        """Generate a password-reset link and email it (always returns 200 to prevent enumeration)."""
        try:
            reset_token = secrets.token_urlsafe(32)
            hashed = hash_token(reset_token)
            expires_at = now_utc() + timedelta(hours=1)

            result = await self.db.execute(
                update(User)
                .where(User.email == request.email, User.is_active.is_(True))
                .values(
                    password_reset_token=hashed,
                    password_reset_expires_at=expires_at,
                )
                .returning(User.email)
            )
            updated_email = result.scalar_one_or_none()
            await self.db.commit()

            if updated_email:
                base_url = settings.FRONTEND_BASE_URL.rstrip("/")
                reset_url = f"{base_url}/auth/reset-password?token={reset_token}"
                try:
                    await self.notification_service.send_password_reset_email(
                        email=updated_email, reset_url=reset_url
                    )
                except Exception as e:
                    logger.warning("Failed to send password reset email: %s", e)

            return MessageResponse(
                message="If an account exists for that email, a reset link has been sent."
            )
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during forgot_password: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")

    async def reset_password(self, request: ResetPasswordRequest) -> MessageResponse:
        """Validate reset token, set new password, and revoke all sessions.

        Raises:
            AuthError: Token is invalid or expired.
        """
        try:
            incoming_hash = hash_token(request.token)
            now = now_utc()
            new_hash = hash_password(request.new_password, pepper=self.code_pepper)

            result = await self.db.execute(
                update(User)
                .where(
                    User.password_reset_token == incoming_hash,
                    User.password_reset_expires_at > now,
                    User.is_active.is_(True),
                )
                .values(
                    password_hash=new_hash,
                    password_reset_token=None,
                    password_reset_expires_at=None,
                    updated_at=now,
                )
                .returning(User.id)
            )
            user_id = result.scalar_one_or_none()

            if not user_id:
                raise AuthError("Invalid or expired reset token.", code="auth.token_invalid")

            await self.db.execute(
                delete(UserSession).where(UserSession.user_id == user_id)
            )
            await self.db.commit()

            return MessageResponse(message="Password has been reset. Please log in with your new password.")

        except (AuthError,):
            raise
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during reset_password: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")

    async def change_password(self, user_id: str, request: ChangePasswordRequest) -> None:
        """Change password after verifying the current one.  All sessions are revoked.

        Raises:
            AuthError: Account not found, disabled, or current password incorrect.
            ValidationError: New password is the same as current.
        """
        try:
            result = await self.db.execute(
                select(User).where(User.id == user_id, User.is_active.is_(True))
            )
            user: Optional[User] = result.scalar_one_or_none()

            if not user:
                raise AuthError("Account not found or disabled.", code="auth.account_disabled")

            if not user.password_hash or not verify_password(
                user.password_hash, request.current_password, pepper=self.code_pepper
            ):
                raise AuthError("Current password is incorrect.", code="auth.invalid_credentials")

            if user.password_hash and verify_password(
                user.password_hash, request.new_password, pepper=self.code_pepper
            ):
                raise ValidationError(
                    "New password must differ from current.",
                    code="validation.same_password",
                    fields={"new_password": "Must differ from current password"},
                )

            new_hash = hash_password(request.new_password, pepper=self.code_pepper)
            await self.db.execute(
                update(User)
                .where(User.id == user.id)
                .values(password_hash=new_hash, updated_at=now_utc())
            )
            await self.db.execute(
                delete(UserSession).where(UserSession.user_id == user.id)
            )
            await self.db.commit()

        except (AuthError, ValidationError):
            raise
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during change_password: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")

    # ------------------------------------------------------------------
    # OTP verification (email and phone)
    # ------------------------------------------------------------------

    async def initiate_email_verification(self, user_id: str) -> VerificationInitResponse:
        """Send a 6-digit OTP to the user's registered email address.

        Returns:
            ``VerificationInitResponse`` with a ``verification_id`` to pass back
            when submitting the code.
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user: Optional[User] = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User not found.", code="resource.not_found")

        code = generate_numeric_code(6)
        verification_id = secrets.token_urlsafe(16)
        code_hash = sha256_code(code, pepper=self.code_pepper)

        # Store verification_id→hash in the user row's JSONB field (lightweight approach).
        # Production: use Redis with TTL for scale.
        pending = {"verification_id": verification_id, "code_hash": code_hash, "type": "email"}
        await self.db.execute(
            update(User).where(User.id == user_id).values(
                password_reset_token=f"email_otp:{verification_id}:{code_hash}"
            )
        )
        await self.db.commit()

        try:
            await self.notification_service.send_verification_email(
                email=user.email, code=code
            )
        except Exception as e:
            logger.warning("Failed to send verification email: %s", e)

        return VerificationInitResponse(
            verification_id=verification_id,
            message=f"Verification code sent to {user.email}",
        )

    async def confirm_email_verification(self, user_id: str, verification_id: str, code: str) -> MessageResponse:
        """Verify the email OTP code and mark the user's email as verified.

        Raises:
            AuthError: Code is invalid or expired.
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user: Optional[User] = result.scalar_one_or_none()
        if not user or not user.password_reset_token:
            raise AuthError("Verification session not found.", code="auth.verification_not_found")

        stored = user.password_reset_token
        expected_prefix = f"email_otp:{verification_id}:"
        if not stored.startswith(expected_prefix):
            raise AuthError("Invalid verification ID.", code="auth.verification_invalid")

        stored_hash = stored[len(expected_prefix):]
        code_hash = sha256_code(code, pepper=self.code_pepper)

        if code_hash != stored_hash:
            raise AuthError("Invalid verification code.", code="auth.code_invalid")

        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(email_verified=True, password_reset_token=None)
        )
        await self.db.commit()

        return MessageResponse(message="Email verified successfully.")

    async def initiate_phone_verification(
        self, user_id: str, phone_number: str
    ) -> VerificationInitResponse:
        """Send a 6-digit OTP SMS to the provided phone number.

        Returns:
            ``VerificationInitResponse`` with a ``verification_id``.
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user: Optional[User] = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User not found.", code="resource.not_found")

        code = generate_numeric_code(6)
        verification_id = secrets.token_urlsafe(16)
        code_hash = sha256_code(code, pepper=self.code_pepper)

        await self.db.execute(
            update(User).where(User.id == user_id).values(
                phone_number=phone_number,
                password_reset_token=f"phone_otp:{verification_id}:{code_hash}",
            )
        )
        await self.db.commit()

        try:
            await self.notification_service.send_verification_sms(
                phone_number=phone_number, code=code
            )
        except Exception as e:
            logger.warning("Failed to send verification SMS: %s", e)

        return VerificationInitResponse(
            verification_id=verification_id,
            message=f"Verification code sent to {phone_number}",
        )

    async def confirm_phone_verification(self, user_id: str, verification_id: str, code: str) -> MessageResponse:
        """Verify the phone OTP code and mark the user's phone as verified.

        Raises:
            AuthError: Code is invalid or expired.
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user: Optional[User] = result.scalar_one_or_none()
        if not user or not user.password_reset_token:
            raise AuthError("Verification session not found.", code="auth.verification_not_found")

        stored = user.password_reset_token
        expected_prefix = f"phone_otp:{verification_id}:"
        if not stored.startswith(expected_prefix):
            raise AuthError("Invalid verification ID.", code="auth.verification_invalid")

        stored_hash = stored[len(expected_prefix):]
        code_hash = sha256_code(code, pepper=self.code_pepper)

        if code_hash != stored_hash:
            raise AuthError("Invalid verification code.", code="auth.code_invalid")

        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(phone_verified=True, password_reset_token=None)
        )
        await self.db.commit()

        return MessageResponse(message="Phone number verified successfully.")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    async def _verify_google_id_token(self, id_token: str) -> dict:
        """Verify a Google ID token against Google's public tokeninfo endpoint.

        For production, consider using ``google-auth`` library for offline
        verification (no network round-trip).  This approach is simpler and
        avoids an additional dependency for now.

        Raises:
            ExternalServiceError: Google endpoint unreachable.
            AuthError: Token rejected by Google.
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    _GOOGLE_TOKEN_INFO_URL,
                    params={"id_token": id_token},
                )
        except httpx.RequestError as e:
            raise ExternalServiceError(
                f"Failed to reach Google token verification endpoint: {e}",
                code="external.google_unreachable",
            )

        if resp.status_code != 200:
            raise AuthError("Google ID token is invalid or expired.", code="auth.google_token_invalid")

        payload = resp.json()

        expected_audience = settings.GOOGLE_CLIENT_ID
        if expected_audience and payload.get("aud") != expected_audience:
            raise AuthError("Google token audience mismatch.", code="auth.google_token_invalid")

        if not payload.get("email_verified", False):
            raise AuthError("Google account email is not verified.", code="auth.google_email_unverified")

        return payload

    async def _unique_username(self, base: str) -> str:
        """Derive a unique username from a base string, appending a random suffix if needed."""
        candidate = base[:40]
        result = await self.db.execute(select(User.id).where(User.username == candidate))
        if not result.scalar_one_or_none():
            return candidate
        return f"{candidate[:36]}_{secrets.token_hex(2)}"
