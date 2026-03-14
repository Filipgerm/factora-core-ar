from pydantic import BaseModel, EmailStr, Field, field_validator, ValidationInfo
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class ServiceResponse(BaseModel):
    """Standard service response envelope"""

    success: bool
    message: Optional[str] = None

    # Optional fields used across flows; keep them optional so the same model fits all endpoints.
    onboarding_session_id: Optional[str] = None  # mentioned in your signup docstring
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user_id: Optional[str] = None
    username: Optional[str] = None


class PhoneVerificationRequest(BaseModel):
    """Request model for phone number verification"""

    country_code: str
    phone_number: str = Field(
        ...,
        min_length=7,
        max_length=15,
        description="Phone number without country code",
    )
    onboarding_session_id: Optional[str] = None

    @property
    def full_phone_number(self) -> str:
        """Returns the full phone number with country code"""
        # CountryCode enum stores (dial_code, flag). Support both tuple and string for safety.
        return f"{self.country_code}{self.phone_number}"


class PhoneVerificationResponse(BaseModel):
    """Response model for phone verification"""

    success: bool
    message: str
    verification_id: Optional[str] = None
    onboarding_session_id: Optional[str] = None


class PhoneVerificationCodeRequest(BaseModel):
    """Request model for phone verification code submission"""

    verification_id: str
    code: str = Field(
        ..., min_length=4, max_length=4, description="4-digit SMS verification code"
    )
    onboarding_session_id: Optional[str] = None


class PhoneVerificationCodeResponse(BaseModel):
    success: bool
    message: str
    onboarding_session_id: Optional[str] = None


class EmailVerificationRequest(BaseModel):
    """Request model for email verification"""

    email: EmailStr
    onboarding_session_id: Optional[str] = None


class EmailVerificationResponse(BaseModel):
    """Response model for email verification"""

    success: bool
    message: str
    verification_id: Optional[str] = None
    onboarding_session_id: Optional[str] = None


class EmailVerificationCodeRequest(BaseModel):
    """Request model for email verification code submission"""

    verification_id: str
    code: str = Field(
        ..., min_length=6, max_length=6, description="6-digit email verification code"
    )
    onboarding_session_id: Optional[str] = None


class EmailVerificationCodeResponse(BaseModel):
    """Response model for email verification"""

    success: bool
    message: str
    onboarding_session_id: Optional[str] = None


class BusinessCountryRequest(BaseModel):
    """Request model for business country selection"""

    country: str
    onboarding_session_id: Optional[str] = None


class BusinessInfoRequest(BaseModel):
    """Request model for business information"""

    company_name: str
    company_vat: str
    company_gemi_number: str
    company_type: str
    company_zip: str
    company_municipality: str
    company_city: str
    company_street: str
    company_street_number: str
    company_phone: str
    company_email: EmailStr
    company_objective: str
    company_status: str
    company_gemi_office: str
    onboarding_session_id: Optional[str] = None


class ShareholderInfo(BaseModel):
    """Shareholder information"""

    id: Optional[str] = None  # return this to the client; stable across saves
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None


class ShareholderInfoRequest(BaseModel):
    """Request model for shareholder information"""

    onboarding_session_id: Optional[str] = None
    shareholders: list[ShareholderInfo]


class OnboardingUser(BaseModel):
    """Complete user model for onboarding"""

    phone_number: str
    country_code: str
    email: EmailStr
    business_country: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_onboarding_complete: bool = False


class SignUpRequest(BaseModel):
    """SignUp model"""

    username: str = Field(
        ..., min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_.-]+$"
    )
    email: EmailStr
    password: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    """Login model"""

    username: str = Field(
        ..., min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_.-]+$"
    )
    password: str = Field(..., min_length=8)


class ForgotPasswordRequest(BaseModel):
    """Initiate password reset using email only (mandatory)."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Complete password reset using the emailed token."""

    token: str = Field(..., min_length=10)  # token extracted by FE from the reset link
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v, info: ValidationInfo):
        # Access previously validated fields through info.data
        new_password = info.data.get("new_password")
        if new_password and v != new_password:
            raise ValueError("Passwords do not match")
        return v


class ChangePasswordRequest(BaseModel):
    """Change password for an authenticated user."""

    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info: ValidationInfo) -> str:
        new_password = info.data.get("new_password")  # fields validated before this one
        if new_password and v != new_password:
            raise ValueError("Passwords do not match")
        return v


class SendOnboardingLinkRequest(BaseModel):
    """Request model for sending onboarding link to buyer"""

    email: EmailStr
    seller_id: str
