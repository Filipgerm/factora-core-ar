"""Authentication routes.

All endpoints live under the ``/v1/auth`` prefix (applied at mount time).

Token lifecycle:
  - Access token:  JWT, 30-minute TTL, sent in ``Authorization: Bearer`` header
  - Refresh token: opaque 48-byte random string, 7-day TTL, rotated on each use

Google OAuth:
  - ``POST /google`` — accepts a Google ``id_token`` and returns ``AuthResponse``

OTP Verification:
  - ``POST /verify/email``          — send 6-digit OTP to the user's email
  - ``POST /verify/email/confirm``  — confirm the OTP code
  - ``POST /verify/phone``          — send 6-digit OTP via SMS
  - ``POST /verify/phone/confirm``  — confirm the OTP code
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.dependencies import AuthSvc, AuthUser, require_auth
from app.models.auth import (
    AuthResponse,
    ChangePasswordRequest,
    EmailVerificationCodeRequest,
    EmailVerificationRequest,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    PhoneVerificationCodeRequest,
    PhoneVerificationRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    SignUpRequest,
    UserProfileResponse,
    VerificationInitResponse,
)

router = APIRouter(tags=["Auth"])


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


@router.post(
    "/signup",
    response_model=UserProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def sign_up(
    req: SignUpRequest,
    auth_service: AuthSvc,
) -> UserProfileResponse:
    """Create a new user account with email and password.

    Returns a ``UserProfileResponse`` (no tokens).  The user must call
    ``POST /login`` next to obtain tokens.
    """
    return await auth_service.sign_up(req)


# ---------------------------------------------------------------------------
# Login / logout / refresh
# ---------------------------------------------------------------------------


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate with email and password",
)
async def login(
    req: LoginRequest,
    request: Request,
    auth_service: AuthSvc,
) -> AuthResponse:
    """Validate credentials and issue JWT access token + opaque refresh token."""
    return await auth_service.login(
        req,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke refresh token and end session",
)
async def logout(
    req: RefreshTokenRequest,
    auth_service: AuthSvc,
) -> MessageResponse:
    """Revoke the provided refresh token.  The access token expires naturally."""
    await auth_service.logout(req.refresh_token)
    return MessageResponse(message="Logged out successfully.")


@router.post(
    "/refresh",
    response_model=AuthResponse,
    summary="Rotate refresh token and issue new access token",
)
async def refresh_tokens(
    req: RefreshTokenRequest,
    request: Request,
    auth_service: AuthSvc,
) -> AuthResponse:
    """Exchange a valid refresh token for a new JWT + rotated refresh token."""
    return await auth_service.refresh_tokens(
        req.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------


@router.post(
    "/google",
    response_model=AuthResponse,
    summary="Sign in or sign up via Google ID token",
)
async def google_auth(
    req: GoogleAuthRequest,
    request: Request,
    auth_service: AuthSvc,
) -> AuthResponse:
    """Verify a Google ID token and create or authenticate the user.

    The ``id_token`` must be obtained from Google Sign-In on the frontend.
    """
    return await auth_service.sign_up_with_google(
        req.id_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


# ---------------------------------------------------------------------------
# Password management
# ---------------------------------------------------------------------------


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset email",
)
async def forgot_password(
    req: ForgotPasswordRequest,
    auth_service: AuthSvc,
) -> MessageResponse:
    """Send a password-reset link to the provided email if an account exists.

    Always returns a generic success message to prevent user enumeration.
    """
    return await auth_service.forgot_password(req)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Complete password reset with one-time token",
)
async def reset_password(
    req: ResetPasswordRequest,
    auth_service: AuthSvc,
) -> MessageResponse:
    """Set a new password using the token from the reset email link."""
    return await auth_service.reset_password(req)


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password (requires authentication)",
)
async def change_password(
    req: ChangePasswordRequest,
    user: AuthUser,
    auth_service: AuthSvc,
) -> MessageResponse:
    """Change the authenticated user's password.  All sessions are revoked."""
    await auth_service.change_password(user["sub"], req)
    return MessageResponse(message="Password changed successfully. Please log in again.")


# ---------------------------------------------------------------------------
# Email verification
# ---------------------------------------------------------------------------


@router.post(
    "/verify/email",
    response_model=VerificationInitResponse,
    summary="Send email verification OTP",
)
async def initiate_email_verification(
    user: AuthUser,
    auth_service: AuthSvc,
) -> VerificationInitResponse:
    """Send a 6-digit OTP to the authenticated user's registered email address."""
    return await auth_service.initiate_email_verification(user["sub"])


@router.post(
    "/verify/email/confirm",
    response_model=MessageResponse,
    summary="Confirm email OTP code",
)
async def confirm_email_verification(
    req: EmailVerificationCodeRequest,
    user: AuthUser,
    auth_service: AuthSvc,
) -> MessageResponse:
    """Verify the OTP code sent to the user's email."""
    return await auth_service.confirm_email_verification(
        user["sub"], req.verification_id, req.code
    )


# ---------------------------------------------------------------------------
# Phone verification
# ---------------------------------------------------------------------------


@router.post(
    "/verify/phone",
    response_model=VerificationInitResponse,
    summary="Send phone verification OTP via SMS",
)
async def initiate_phone_verification(
    req: PhoneVerificationRequest,
    user: AuthUser,
    auth_service: AuthSvc,
) -> VerificationInitResponse:
    """Send a 6-digit OTP SMS to the provided phone number."""
    return await auth_service.initiate_phone_verification(user["sub"], req.phone_number)


@router.post(
    "/verify/phone/confirm",
    response_model=MessageResponse,
    summary="Confirm phone OTP code",
)
async def confirm_phone_verification(
    req: PhoneVerificationCodeRequest,
    user: AuthUser,
    auth_service: AuthSvc,
) -> MessageResponse:
    """Verify the OTP code sent to the user's phone number."""
    return await auth_service.confirm_phone_verification(
        user["sub"], req.verification_id, req.code
    )
