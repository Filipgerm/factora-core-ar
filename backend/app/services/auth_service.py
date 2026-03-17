"""AuthService — seller authentication, password management, and session tokens.

This module is the authoritative home for auth business logic.  It is extracted
from the former monolithic ``user_service.py`` so that auth concerns are
clearly separated from buyer onboarding concerns.

``UserService`` in ``user_service.py`` inherits from ``AuthService`` and
``OnboardingService`` for backward compatibility until all callers are updated.
"""

from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Any, Dict, Optional
from urllib.parse import urljoin

from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security.hashing import (
    hash_password,
    hash_token,
    now_utc,
    verify_password,
)
from app.core.security.jwt import (
    REFRESH_TOKEN_TTL_DAYS,
    encode_access_token,
    generate_refresh_token,
    hash_jti,
)
from app.db.database_models import SellerSessions, Sellers
from app.models.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    ServiceResponse,
    SignUpRequest,
)
from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
    ValidationError,
    FactoraError,
)
from app.services.notification_service import NotificationService

FRONTEND_BASE_URL = settings.FRONTEND_BASE_URL

ACCESS_TOKEN_TTL_MINUTES = 30
REFRESH_TOKEN_TTL_DAYS = 7


def _validate_password(password: str) -> None:
    """Enforce minimum password complexity rules.

    Args:
        password: Plaintext password candidate.

    Raises:
        ValueError: If the password does not meet the complexity requirements.
    """
    import re

    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must include a lowercase letter.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must include an uppercase letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must include a digit.")


class AuthService:
    """Handles seller authentication and password management.

    All methods operate on the ``sellers`` and ``seller_sessions`` tables only.
    Onboarding logic lives in :class:`OnboardingService`.
    """

    def __init__(self, db: AsyncSession, *, code_pepper: str):
        """Initialise the service with a request-scoped database session.

        Args:
            db: An async SQLAlchemy session scoped to the current request.
            code_pepper: Server-side pepper for Argon2 hashing (from settings).
        """
        self.db = db
        self.code_pepper = code_pepper
        self.notification_service = NotificationService()

    async def sign_up(self, request: SignUpRequest) -> ServiceResponse:
        """
        Create a new seller with hashed password and unique email/username.
        """

        try:
            # Check for existing email to provide a cleaner error message
            exists = await self.db.execute(
                select(Sellers.id).where(Sellers.email == request.email)
            )
            if exists.scalar_one_or_none():
                raise ConflictError("Email already in use.")

            # Atomic Insert
            result = await self.db.execute(
                insert(Sellers)
                .values(
                    username=request.username,
                    email=request.email,
                    password_hash=hash_password(
                        request.password, pepper=self.code_pepper
                    ),
                    is_active=True,
                )
                .returning(Sellers.id, Sellers.username, Sellers.email)
            )
            created = result.first()
            await self.db.commit()

            # Elite Object Return
            return ServiceResponse(
                user_id=str(created.id), username=created.username, email=created.email
            )

        except IntegrityError:
            await self.db.rollback()
            raise ConflictError("Email or username already in use.")
        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during sign up: {str(e)}")

    async def login(
        self,
        request: LoginRequest,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> ServiceResponse:
        """Validate credentials and issue a JWT access token + opaque refresh token.

        The JWT access token has a 30-minute TTL and is never stored in the DB.
        The refresh token is opaque (``secrets.token_urlsafe``), has a 7-day TTL,
        and is persisted as its SHA-256 hash in ``seller_sessions``.

        Args:
        request: Validated ``LoginRequest`` containing ``username`` and  ``password``.
        user_agent: Optional ``User-Agent`` header value for session audit.
        ip_address: Optional real client IP for session audit.

        Returns:
        ``ServiceResponse`` with ``access_token`` (JWT), ``refresh_token``
        (opaque), and ``token_type="bearer"`` on success.

        """
        try:
            # 1. Fetch user to get the unique Argon2 salt/hash
            result = await self.db.execute(
                select(Sellers).where(Sellers.username == request.username)
            )
            seller: Optional[Sellers] = result.scalar_one_or_none()

            # Cryptographic verification
            if not seller or not verify_password(
                seller.password_hash, request.password, pepper=self.code_pepper
            ):
                raise AuthenticationError("Invalid username or password.")

            if not seller.is_active:
                raise AuthenticationError(
                    "Account is disabled. Please contact support."
                )

            # 2. Issue tokens
            access_token, jti = encode_access_token(seller.id)
            raw_refresh_token, refresh_hash = generate_refresh_token()
            now = now_utc()

            # 3. Create session
            session = SellerSessions(
                seller_id=seller.id,
                refresh_token_hash=refresh_hash,
                jti_hash=hash_jti(jti),
                expires_at=now + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
                created_at=now,
                last_used_at=now,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            self.db.add(session)

            # 4. Update last login
            await self.db.execute(
                update(Sellers).where(Sellers.id == seller.id).values(last_login_at=now)
            )
            await self.db.commit()

            return ServiceResponse(
                access_token=access_token,
                refresh_token=raw_refresh_token,
                token_type="bearer",
                user_id=str(seller.id),
                username=seller.username,
            )

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during login: {str(e)}")

    async def logout(self, refresh_token: str) -> None:
        """Revoke the seller's refresh token, ending the session.

        The JWT access token will expire naturally after 30 minutes. Passing
        the refresh token ensures that no new access tokens can be issued for
        this session.

        Args:
        refresh_token: The raw opaque refresh token previously issued at
        login.

        Returns:

        ``ServiceResponse`` indicating success or an invalid token.

        """
        try:
            token_hash = hash_token(refresh_token)

            # Atomic direct delete
            await self.db.execute(
                delete(SellerSessions).where(
                    SellerSessions.refresh_token_hash == token_hash
                )
            )
            await self.db.commit()

            return None

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during logout: {str(e)}")

    async def refresh_tokens(
        self,
        refresh_token: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> ServiceResponse:
        """Exchange a valid refresh token for a new JWT + rotated refresh token.

        Refresh token rotation: the old token is deleted and a new one is
        issued. If the same token is presented twice (replay attack), the
        second request finds no row and returns an error.

        Args:
        refresh_token: The raw opaque refresh token from the client.
        user_agent: Optional ``User-Agent`` for the updated session row.
        ip_address: Optional real client IP for the updated session row.

        Returns:
        ``ServiceResponse`` with new ``access_token`` and ``refresh_token``
        on success.

        """
        try:
            token_hash = hash_token(refresh_token)
            now = now_utc()

            # ATOMIC CONSUMPTION
            result = await self.db.execute(
                delete(SellerSessions)
                .where(
                    SellerSessions.refresh_token_hash == token_hash,
                    SellerSessions.expires_at > now,
                )
                .returning(
                    SellerSessions.seller_id,
                    SellerSessions.user_agent,
                    SellerSessions.ip_address,
                )
            )
            consumed_session = result.first()

            if not consumed_session:
                raise AuthenticationError("Invalid or expired refresh token.")

            seller_id, old_user_agent, old_ip_address = consumed_session

            # Verify seller is still active
            seller_result = await self.db.execute(
                select(Sellers).where(
                    Sellers.id == seller_id, Sellers.is_active.is_(True)
                )
            )
            seller: Optional[Sellers] = seller_result.scalar_one_or_none()

            if not seller:
                await self.db.commit()
                raise AuthenticationError("Account not found or disabled.")

            # Issue new tokens
            new_access_token, new_jti = encode_access_token(seller.id)
            new_raw_refresh, new_refresh_hash = generate_refresh_token()

            new_session = SellerSessions(
                seller_id=seller.id,
                refresh_token_hash=new_refresh_hash,
                jti_hash=hash_jti(new_jti),
                expires_at=now + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
                created_at=now,
                last_used_at=now,
                user_agent=user_agent or old_user_agent,
                ip_address=ip_address or old_ip_address,
            )
            self.db.add(new_session)
            await self.db.commit()

            return ServiceResponse(
                access_token=new_access_token,
                refresh_token=new_raw_refresh,
                token_type="bearer",
                user_id=str(seller.id),
                username=seller.username,
            )

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during token refresh: {str(e)}")

    async def forgot_password(self, request: ForgotPasswordRequest) -> ServiceResponse:
        """
        Generate a password reset token and email it if the account exists.
        Always return a generic success message to avoid user enumeration.

        """
        try:
            reset_token = secrets.token_urlsafe(32)
            hashed_token = hash_token(reset_token)
            expires_at = now_utc() + timedelta(minutes=30)

            # ATOMIC UPDATE: Skips the SELECT entirely.
            result = await self.db.execute(
                update(Sellers)
                .where(Sellers.email == request.email, Sellers.is_active.is_(True))
                .values(
                    password_reset_token=hashed_token,
                    password_reset_expires_at=expires_at,
                )
                .returning(Sellers.email)
            )
            updated_email = result.scalar_one_or_none()
            await self.db.commit()

            if updated_email:
                # SAFE URL CONCATENATION (No urljoin bug)
                base_url = settings.FRONTEND_BASE_URL.rstrip("/")
                reset_url = f"{base_url}/auth/reset-password?token={reset_token}"
                try:
                    await self.notification_service.send_password_reset_email(
                        email=updated_email, reset_url=reset_url
                    )
                except Exception as e:
                    print(f"ERROR sending password reset email: {e}")

            return ServiceResponse(
                message="If an account exists for the provided email, a password reset link has been sent."
            )

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during forgot password: {str(e)}")

    async def reset_password(self, request: ResetPasswordRequest) -> ServiceResponse:
        """
        Validate token + expiry, set new password, clear reset fields, revoke any existing session.
        Triggered after the user clicks the email link, lands on FE, and submits new password.

        """
        try:
            incoming_hash = hash_token(request.token)
            now = now_utc()
            new_hash = hash_password(request.new_password, pepper=self.code_pepper)

            # ATOMIC UPDATE
            result = await self.db.execute(
                update(Sellers)
                .where(
                    Sellers.password_reset_token == incoming_hash,
                    Sellers.password_reset_expires_at > now,
                    Sellers.is_active.is_(True),
                )
                .values(
                    password_hash=new_hash,
                    password_reset_token=None,
                    password_reset_expires_at=None,
                    updated_at=now,
                )
                .returning(Sellers.id, Sellers.username)
            )
            updated_seller = result.first()

            if not updated_seller:
                raise AuthenticationError("Invalid or expired reset token.")

            seller_id, username = updated_seller

            # Global Logout to secure the account
            await self.db.execute(
                delete(SellerSessions).where(SellerSessions.seller_id == seller_id)
            )
            await self.db.commit()

            return ServiceResponse(user_id=str(seller_id), username=username)

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during password reset: {str(e)}")

    async def change_password(
        self, seller_id: str, request: ChangePasswordRequest
    ) -> None:
        """Change the seller's password after verifying the current one.

        The caller must have already validated the JWT via ``require_auth`` so
        only a ``seller_id`` is received here — no raw token handling.
        All active sessions are revoked on success so the seller must re-login.

        Args:
            seller_id: The authenticated seller's primary key (from JWT ``sub``).
            request: ``ChangePasswordRequest`` containing ``current_password``,
                ``new_password``, and ``confirm_password``.

        Returns:
            None: Returns nothing on success (translates to 204 No Content).
            Raises exceptions on failure.
        """
        try:
            result = await self.db.execute(
                select(Sellers).where(
                    Sellers.id == seller_id, Sellers.is_active.is_(True)
                )
            )
            seller: Optional[Sellers] = result.scalar_one_or_none()

            if not seller:
                raise AuthenticationError("Account not found or disabled.")

            if not verify_password(
                seller.password_hash, request.current_password, pepper=self.code_pepper
            ):
                raise AuthenticationError("Current password is incorrect.")

            if verify_password(
                seller.password_hash, request.new_password, pepper=self.code_pepper
            ):
                raise ValidationError("New password must be different from current.")

            new_hash = hash_password(request.new_password, pepper=self.code_pepper)

            await self.db.execute(
                update(Sellers)
                .where(Sellers.id == seller.id)
                .values(password_hash=new_hash, updated_at=now_utc())
            )

            # Global Logout
            await self.db.execute(
                delete(SellerSessions).where(SellerSessions.seller_id == seller.id)
            )
            await self.db.commit()

            return None  # 204 No Content

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during password change: {str(e)}")
