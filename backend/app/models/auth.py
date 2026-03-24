"""Pydantic request and response schemas for authentication endpoints.

Naming convention:
  - ``*Request``  — inbound payload validated on the route
  - ``*Response`` — outbound payload returned to the caller
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class TokenResponse(BaseModel):
    """JWT access-token envelope returned on successful authentication."""

    access_token: str
    token_type: str = "bearer"
    expires_at: datetime


class UserProfileResponse(BaseModel):
    """Authenticated user's identity and role."""

    user_id: UUID
    username: str
    email: EmailStr
    role: str
    organization_id: UUID | None = None
    email_verified: bool = False
    phone_verified: bool = False


class AuthPublicResponse(TokenResponse, UserProfileResponse):
    """Token + profile returned in JSON on login, refresh, or Google OAuth.

    The refresh token is never included in the response body; it is issued only
    as an ``httpOnly`` cookie (see ``app.core.security.cookies``).
    """

    model_config = {"from_attributes": True}


class AuthResponse(AuthPublicResponse):
    """Internal DTO including raw ``refresh_token`` for cookie attachment in routes."""

    refresh_token: str

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Generic success message for operations that don't return data."""

    message: str


class VerificationInitResponse(BaseModel):
    """Returned when a phone or email verification code has been sent."""

    verification_id: str
    message: str


# ---------------------------------------------------------------------------
# Request schemas — Auth
# ---------------------------------------------------------------------------


class SignUpRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    """Google Sign-In / Sign-Up.  The ``id_token`` is the JWT issued by Google."""

    id_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


# ---------------------------------------------------------------------------
# Request schemas — Verification
# ---------------------------------------------------------------------------


class PhoneVerificationRequest(BaseModel):
    phone_number: str = Field(..., description="E.164 format, e.g. +306912345678")


class PhoneVerificationCodeRequest(BaseModel):
    verification_id: str
    code: str = Field(..., min_length=4, max_length=8)


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerificationCodeRequest(BaseModel):
    verification_id: str
    code: str = Field(..., min_length=4, max_length=8)


# ---------------------------------------------------------------------------
# Token refresh / logout
# ---------------------------------------------------------------------------


class RefreshTokenRequest(BaseModel):
    """Optional body token for logout/refresh; cookie is used when omitted."""

    refresh_token: str | None = None
