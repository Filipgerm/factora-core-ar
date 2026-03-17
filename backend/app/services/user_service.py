"""UserService — buyer onboarding flow (phone/email OTP, KYC, finalization).

Auth methods (login, logout, sign_up, refresh_tokens, forgot_password,
reset_password, change_password) are inherited from
:class:`~app.services.auth_service.AuthService`.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Optional, Dict, Any, Literal
import hashlib, secrets, string, re

from app.models.user import (
    ServiceResponse,
    PhoneVerificationRequest,
    PhoneVerificationResponse,
    PhoneVerificationCodeRequest,
    PhoneVerificationCodeResponse,
    EmailVerificationRequest,
    EmailVerificationResponse,
    EmailVerificationCodeRequest,
    EmailVerificationCodeResponse,
    BusinessCountryRequest,
    OnboardingUser,
    ShareholderInfoRequest,
    BusinessInfoRequest,
    SendOnboardingLinkRequest,
)
from app.services.notification_service import NotificationService
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    null,
    select,
    update,
    delete,
    insert,
    DateTime,
    func,
    literal,
    cast,
)
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database_models import (
    OnboardingSession,
    VerificationSession,
    Sellers,
    Buyers,
    SellerBuyers,
    OnboardingToken,
)
import phonenumbers
from phonenumbers.phonenumberutil import NumberParseException
from app.config import settings
from app.core.security.jwt import (
    encode_access_token,
    generate_refresh_token,
    hash_jti,
    REFRESH_TOKEN_TTL_DAYS,
)
from app.core.security.hashing import hash_token, sha256_code, now_utc

FRONTEND_BASE_URL = settings.FRONTEND_BASE_URL


Channel = Literal["phone", "email"]

from app.services.auth_service import AuthService  # noqa: E402


class UserService(AuthService):
    """Unified service for seller auth and buyer onboarding.

    Auth methods (login, logout, sign_up, etc.) are inherited from
    :class:`AuthService`.  Onboarding methods live directly in this class.
    This class is the primary injection target for :class:`UserController`.
    """

    def __init__(self, db: AsyncSession, *, code_pepper: str):
        super().__init__(db, code_pepper=code_pepper)

    async def _generate_code(self, length: int = 4) -> str:
        """Generate a random numeric verification code"""
        return "".join(secrets.choice(string.digits) for _ in range(length))

    async def _normalize_e164(self, raw: str) -> str:
        """Normalize a raw phone string to E.164 or raise ValueError."""
        try:
            pn = phonenumbers.parse(raw, None)
            if not (
                phonenumbers.is_possible_number(pn) and phonenumbers.is_valid_number(pn)
            ):
                raise ValueError("invalid phone")
            return phonenumbers.format_number(pn, phonenumbers.PhoneNumberFormat.E164)
        except NumberParseException:
            raise ValueError("invalid phone")

    async def ensure_onboarding_session(
        self,
        *,
        phone_number: Optional[str] = None,
        existing_session_id: Optional[str] = None,
        buyer_id: Optional[str] = None,
    ) -> str:
        """
        Ensure there is an onboarding session id.
        If provided, return the existing one; else create a fresh draft session.
        linked to the provided buyer_id.
        """
        now = now_utc()
        if existing_session_id:
            # Touch the session so it doesn't look stale
            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == existing_session_id)
                .values(updated_at=now)
            )
            await self.db.commit()
            return existing_session_id

        # Case 2: Create new onboarding session linked to the buyer
        if not buyer_id:
            raise ValueError("buyer_id is required to start onboarding session")

        session_id = secrets.token_urlsafe(16)
        new_session = OnboardingSession(
            id=session_id,
            business_id=buyer_id,  # ✅ link session to the buyer
            status="draft",
            step="phone_started",
            phone_number_e164=phone_number,
            phone_verified=False,
            phone_verified_at=None,
            email_address=None,
            email_verified=False,
            email_verified_at=None,
            onboarding_data={},  # can make it None if nullable
            created_at=now,
            updated_at=now,
        )

        self.db.add(new_session)
        await self.db.commit()

        return session_id

    async def _create_verification_session(
        self,
        *,
        onboarding_session_id: str,
        channel: Channel,
        target: str,
        code: str,
        expires_in_minutes: int,
    ) -> str:
        """Create a verification doc linked to the onboarding session."""
        verification_id = secrets.token_urlsafe(24)
        now = now_utc()

        verification_session = VerificationSession(
            verification_id=verification_id,
            onboarding_session_id=onboarding_session_id,
            channel=channel,
            target=target,
            code_hash=sha256_code(code, pepper=self.code_pepper),
            attempts=0,
            max_attempts=5,
            sent_at=now,
            last_sent_at=now,
            expires_at=now + timedelta(minutes=expires_in_minutes),
            used_at=None,
        )
        self.db.add(verification_session)
        await self.db.commit()
        return verification_id

    # -------------------
    # Phone verification flow
    # -------------------

    async def send_onboarding_link(
        self, request: SendOnboardingLinkRequest
    ) -> Dict[str, Any]:
        """
        Send onboarding link to buyer email
        """
        try:
            # Check if seller exists
            seller_result = await self.db.execute(
                select(Sellers).where(Sellers.id == request.seller_id)
            )
            seller = seller_result.scalar_one_or_none()
            if not seller:
                return ServiceResponse(
                    success=False,
                    message="Seller not found",
                )

            # Check if buyer with this email already exists
            existing_buyer_result = await self.db.execute(
                select(Buyers).where(Buyers.email == request.email)
            )
            existing_buyer = existing_buyer_result.scalar_one_or_none()

            if existing_buyer:
                # Link to existing buyer
                buyer_id = existing_buyer.id
            else:
                # Create new buyer record
                buyer_id = secrets.token_urlsafe(16)
                now = now_utc()
                new_buyer = Buyers(
                    id=buyer_id,
                    email=request.email,
                    is_onboarding_complete=False,
                    created_at=now,
                    updated_at=now,
                )
                self.db.add(new_buyer)

            # Check if seller-buyer relationship already exists
            existing_relationship = await self.db.execute(
                select(SellerBuyers).where(
                    SellerBuyers.seller_id == request.seller_id,
                    SellerBuyers.buyer_id == buyer_id,
                )
            )

            if not existing_relationship.scalar_one_or_none():
                # Only create relationship if it doesn't exist
                seller_buyer_link = SellerBuyers(
                    seller_id=request.seller_id, buyer_id=buyer_id
                )
                self.db.add(seller_buyer_link)

            await self.db.commit()

            # Generate secure onboarding token (expires in 48 hours).
            # The raw token is embedded in the emailed URL so the buyer can click
            # it.  Only its SHA-256 hash is stored in the DB so a database breach
            # cannot expose a usable invitation token.
            raw_token = secrets.token_urlsafe(32)
            expires_at = now_utc() + timedelta(hours=48)

            onboarding_token = OnboardingToken(
                token=hash_token(raw_token),
                buyer_id=buyer_id,
                expires_at=expires_at,
                used_at=None,
                created_at=now_utc(),
            )
            self.db.add(onboarding_token)
            await self.db.commit()

            # Build the invitation URL using the raw (unhashed) token so the
            # recipient can supply it back.  FRONTEND_BASE_URL is the canonical
            # frontend origin for all environments.
            onboarding_url = f"{FRONTEND_BASE_URL}/onboarding?token={raw_token}"

            # Send email with link
            email_sent = await self.notification_service.send_onboarding_email(
                request.email, onboarding_url
            )
            if not email_sent:
                return ServiceResponse(
                    success=False,
                    message="Failed to send onboarding email",
                )

            return ServiceResponse(
                success=True,
                message="Onboarding link sent successfully",
            )
        except Exception as e:
            await self.db.rollback()
            return ServiceResponse(
                success=False,
                message=f"Failed to send onboarding link: {str(e)}",
            )

    async def start_onboarding_session(self, token: str) -> Dict[str, Any]:
        """Start an onboarding session by validating an invitation token.

        The raw token arriving from the query string is hashed before the DB
        lookup so that only the SHA-256 digest is compared — the plaintext is
        never used as a search key.

        Args:
            token: The raw invitation token from the buyer's email link.

        Returns:
            ServiceResponse with ``onboarding_session_id`` on success.
        """
        try:
            now = now_utc()
            token_hash = hash_token(token)

            # Validate token using its hash — never store or compare raw tokens.
            result = await self.db.execute(
                select(OnboardingToken).where(
                    OnboardingToken.token == token_hash,
                    OnboardingToken.used_at.is_(None),
                    OnboardingToken.expires_at > now,
                )
            )
            onboarding_token = result.scalar_one_or_none()
            if not onboarding_token:
                return ServiceResponse(
                    success=False,
                    message="Invalid or expired onboarding token",
                )

            buyer_id = onboarding_token.buyer_id

            # Check if buyer exists
            buyer_result = await self.db.execute(
                select(Buyers).where(Buyers.id == buyer_id)
            )
            buyer = buyer_result.scalar_one_or_none()
            if not buyer:
                return ServiceResponse(
                    success=False,
                    message="Buyer not found",
                )

            # Mark token as used (single-use enforcement)
            await self.db.execute(
                update(OnboardingToken)
                .where(OnboardingToken.token == token_hash)
                .values(used_at=now)
            )

            session_id = await self.ensure_onboarding_session(
                phone_number=None, existing_session_id=None, buyer_id=buyer_id
            )

            await self.db.commit()

            return ServiceResponse(
                success=True,
                message="Onboarding session started",
                onboarding_session_id=session_id,
            )
        except Exception as e:
            await self.db.rollback()
            return ServiceResponse(
                success=False,
                message=f"Failed to start onboarding session: {str(e)}",
            )

    async def get_onboarding_session_state(self, session_id: str) -> Dict[str, Any]:
        """Return the current step and verification flags for an onboarding session.

        Called by the frontend on page load when a session_id is stored in
        localStorage so the buyer can resume from where they left off.

        Args:
            session_id: The onboarding session primary key.

        Returns:
            ServiceResponse with ``step``, ``phone_verified``, and
            ``email_verified`` populated on success.
        """
        try:
            result = await self.db.execute(
                select(OnboardingSession).where(OnboardingSession.id == session_id)
            )
            session: Optional[OnboardingSession] = result.scalar_one_or_none()
            if not session:
                return ServiceResponse(
                    success=False,
                    message="Onboarding session not found.",
                )
            return ServiceResponse(
                success=True,
                message="Session state retrieved.",
                onboarding_session_id=session_id,
                step=session.step,
                phone_verified=session.phone_verified,
                email_verified=session.email_verified,
                status=session.status,
            )
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Failed to retrieve session state: {str(e)}",
            )

    async def verify_phone_number(
        self, request: PhoneVerificationRequest
    ) -> PhoneVerificationResponse:
        """
        Initiate phone number verification by sending SMS
        Optionally accepts request.onboarding_session_id to reuse a session; otherwise creates one.
        """
        verification_id = None
        try:

            # Validate phone number format and Normalize to E.164
            try:
                parsed_number = phonenumbers.parse(request.full_phone_number, None)
                if not phonenumbers.is_possible_number(
                    parsed_number
                ) or not phonenumbers.is_valid_number(parsed_number):
                    return PhoneVerificationResponse(
                        success=False, message="Invalid phone number format"
                    )
                phone_e164 = phonenumbers.format_number(
                    parsed_number, phonenumbers.PhoneNumberFormat.E164
                )
            except NumberParseException:
                return PhoneVerificationResponse(
                    success=False, message="Invalid phone number format"
                )

            if not request.onboarding_session_id:
                return PhoneVerificationResponse(
                    success=False, message="Onboarding session id is required"
                )

            # Ensure session exists
            session_exists = await self.db.execute(
                select(OnboardingSession.id).where(
                    OnboardingSession.id == request.onboarding_session_id
                )
            )

            if not session_exists.scalar_one_or_none():
                return PhoneVerificationResponse(
                    success=False, message="Invalid onboarding session ID"
                )

            # Generate 4-digit verification code
            code = await self._generate_code(4)

            # Create verification session
            verification_id = await self._create_verification_session(
                onboarding_session_id=request.onboarding_session_id,
                channel="phone",
                target=phone_e164,
                code=code,
                expires_in_minutes=3,
            )

            # Send SMS with verification code
            sms_sent = await self.notification_service.send_verification_sms(
                phone=phone_e164, code=code
            )
            if not sms_sent:
                return PhoneVerificationResponse(
                    success=False, message="Failed to send verification code"
                )

            # Update onboarding session step and store the phone number
            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == request.onboarding_session_id)
                .values(
                    step="phone_code_sent",
                    phone_number_e164=phone_e164,
                    updated_at=now_utc(),
                )
            )
            await self.db.commit()

            return PhoneVerificationResponse(
                success=True,
                message="Verification code sent successfully",
                verification_id=verification_id,
                onboarding_session_id=request.onboarding_session_id,
            )

        except Exception as e:
            return PhoneVerificationResponse(
                success=False,
                message=f"Failed to send verification code: {str(e)},",
                verification_id=verification_id,
                onboarding_session_id=request.onboarding_session_id,
            )

    async def verify_phone_code(
        self, request: PhoneVerificationCodeRequest
    ) -> PhoneVerificationCodeResponse:
        """Verify the phone verification code"""
        try:
            # Find verification session
            now = now_utc()

            result = await self.db.execute(
                select(VerificationSession).where(
                    VerificationSession.verification_id == request.verification_id,
                    VerificationSession.channel == "phone",
                )
            )
            sess = result.scalar_one_or_none()

            if (
                not sess
                or sess.used_at is not None
                or not sess.expires_at
                or sess.expires_at <= now
            ):
                return PhoneVerificationCodeResponse(
                    success=False, message="Invalid or expired verification code"
                )

            # Abuse control: attempts
            if sess.attempts >= sess.max_attempts:
                return PhoneVerificationCodeResponse(
                    success=False,
                    message="Too many attempts. Please request a new code",
                )

            # Constant-time compare between stored hash and submitted hash
            submitted_hash = sha256_code(request.code, pepper=self.code_pepper)
            is_ok = secrets.compare_digest(submitted_hash, sess.code_hash)

            # Atomically increment attempts
            await self.db.execute(
                update(VerificationSession)
                .where(VerificationSession.verification_id == request.verification_id)
                .values(attempts=sess.attempts + 1)
            )

            if not is_ok:
                await self.db.commit()
                return PhoneVerificationCodeResponse(
                    success=False, message="Incorrect verification code"
                )

            # Mark verification session as used (if still valid)
            updated = await self.db.execute(
                update(VerificationSession)
                .where(
                    VerificationSession.verification_id == request.verification_id,
                    VerificationSession.used_at.is_(None),
                    VerificationSession.expires_at > now,
                )
                .values(used_at=now)
            )

            if updated.rowcount == 0:
                return PhoneVerificationCodeResponse(
                    success=False, message="Code already used or expired"
                )

            # Verify corresponding onboarding session
            session_id = sess.onboarding_session_id
            session_exists = await self.db.execute(
                select(OnboardingSession.id).where(OnboardingSession.id == session_id)
            )
            if not session_exists.scalar_one_or_none():
                await self.db.commit()
                return PhoneVerificationCodeResponse(
                    success=False, message="Onboarding session not found"
                )

            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == session_id)
                .values(
                    phone_verified=True,
                    phone_verified_at=now,
                    updated_at=now,
                    step="phone_verified",
                )
            )
            await self.db.commit()

            return PhoneVerificationCodeResponse(
                success=True,
                message="Phone number verified successfully",
                onboarding_session_id=session_id,
            )

        except Exception as e:
            await self.db.rollback()
            return PhoneVerificationCodeResponse(
                success=False, message=f"Verification failed: {str(e)}"
            )

    async def verify_email(
        self, request: EmailVerificationRequest
    ) -> EmailVerificationResponse:
        """
        Initiate email verification by sending verification code
        (requires an existing onboarding_session_id , created during phone step)
        """
        try:
            # 1) resolve the session
            if request.onboarding_session_id:
                result = await self.db.execute(
                    select(OnboardingSession).where(
                        OnboardingSession.id == request.onboarding_session_id
                    )
                )
                session = result.scalar_one_or_none()
                if not session:
                    return EmailVerificationResponse(
                        success=False, message="Session not found"
                    )
                if not session.phone_verified:
                    return EmailVerificationResponse(
                        success=False, message="Phone not verified"
                    )
                session_id = session.id

            else:
                # Fallback (legacy): find latest draft by phone
                phone_e164 = await self._normalize_e164(request.phone_number)
                result = await self.db.execute(
                    select(OnboardingSession)
                    .where(
                        OnboardingSession.phone_number_e164 == phone_e164,
                        OnboardingSession.status == "draft",
                    )
                    .order_by(OnboardingSession.updated_at.desc())
                )
                session = result.scalar_one_or_none()
                if not session or not session.phone_verified:
                    return EmailVerificationResponse(
                        success=False, message="Start/verify phone first"
                    )
                session_id = session.id

            # Ensure the session still points to a Buyers
            if not session.business_id:
                return EmailVerificationResponse(
                    success=False, message="Session is not linked to a business"
                )

            # Store email on session
            now = now_utc()
            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == session_id)
                .values(
                    email_address=request.email, updated_at=now, step="email_started"
                )
            )
            await self.db.commit()

            code = await self._generate_code(6)
            verification_id = await self._create_verification_session(
                onboarding_session_id=session_id,
                channel="email",
                target=request.email,
                code=code,
                expires_in_minutes=15,
            )

            email_sent = await self.notification_service.send_verification_email(
                email=request.email, code=code
            )
            if not email_sent:
                return EmailVerificationResponse(
                    success=False, message="Failed to send verification email"
                )

            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == session_id)
                .values(step="email_code_sent", updated_at=now_utc())
            )
            await self.db.commit()

            return EmailVerificationResponse(
                success=True,
                message="Verification code sent successfully",
                verification_id=verification_id,
                onboarding_session_id=session_id,
            )

        except ValueError:
            return EmailVerificationResponse(
                success=False, message="Invalid phone number"
            )
        except SQLAlchemyError as e:
            await self.db.rollback()  # ADD: keep transaction clean on DB errors
            return EmailVerificationResponse(
                success=False, message=f"Database error: {e}"
            )
        except Exception as e:
            return EmailVerificationResponse(
                success=False, message=f"Failed to send verification code: {str(e)}"
            )

    async def verify_email_code(
        self, request: EmailVerificationCodeRequest
    ) -> EmailVerificationCodeResponse:
        """Verify the email code with the same guarantees as phone."""
        try:
            now = now_utc()
            result = await self.db.execute(
                select(VerificationSession).where(
                    VerificationSession.verification_id == request.verification_id,
                    VerificationSession.channel == "email",
                )
            )
            sess = result.scalar_one_or_none()

            if (
                not sess
                or sess.used_at is not None
                or not sess.expires_at
                or sess.expires_at <= now
            ):
                return EmailVerificationCodeResponse(
                    success=False, message="Invalid or expired verification code"
                )

            if sess.attempts >= sess.max_attempts:
                return EmailVerificationCodeResponse(
                    success=False,
                    message="Too many attempts. Please request a new code.",
                )

            submitted_hash = sha256_code(request.code, pepper=self.code_pepper)
            is_ok = secrets.compare_digest(submitted_hash, sess.code_hash)

            await self.db.execute(
                update(VerificationSession)
                .where(VerificationSession.verification_id == request.verification_id)
                .values(attempts=sess.attempts + 1)
            )

            if not is_ok:
                await self.db.commit()
                return EmailVerificationCodeResponse(
                    success=False, message="Incorrect verification code"
                )

            updated = await self.db.execute(
                update(VerificationSession)
                .where(
                    VerificationSession.verification_id == request.verification_id,
                    VerificationSession.used_at.is_(None),
                    VerificationSession.expires_at > now,
                )
                .values(used_at=now)
            )

            if updated.rowcount == 0:
                return EmailVerificationCodeResponse(
                    success=False, message="Code already used or expired"
                )

            session_id = sess.onboarding_session_id

            # check that the onboarding session exists
            session_exists = await self.db.execute(
                select(OnboardingSession).where(OnboardingSession.id == session_id)
            )
            onboarding_session = session_exists.scalar_one_or_none()
            if not onboarding_session:
                await self.db.commit()
                return EmailVerificationCodeResponse(
                    success=False, message="Onboarding session not found"
                )

            # Ensure session is linked to a Buyers (new schema requirement)
            if not onboarding_session.business_id:
                await self.db.commit()
                return EmailVerificationCodeResponse(
                    success=False,
                    message="Onboarding session is not linked to a business",
                )

            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == session_id)
                .values(
                    email_verified=True,
                    email_verified_at=now,
                    updated_at=now,
                    step="email_verified",
                )
            )
            await self.db.commit()

            return EmailVerificationCodeResponse(
                success=True,
                message="Email verified successfully",
                onboarding_session_id=session_id,
            )

        except Exception as e:
            await self.db.rollback()
            return EmailVerificationCodeResponse(
                success=False, message=f"Verification failed: {str(e)}"
            )

    async def set_business_country(
        self, request: BusinessCountryRequest
    ) -> Dict[str, Any]:
        """Set the business country for the user"""
        try:
            now = now_utc()

            #  Load the onboarding session to get its business_id (new schema)
            sess_row = await self.db.execute(
                select(OnboardingSession).where(
                    OnboardingSession.id == request.onboarding_session_id
                )
            )
            session = sess_row.scalar_one_or_none()
            if not session:
                return ServiceResponse(
                    success=False, message="Onboarding session not found"
                )

            #  Ensure the onboarding session is linked to a Buyers
            if not session.business_id:
                return ServiceResponse(
                    success=False, message="Session is not linked to a business"
                )

            # Update user's business country
            result = await self.db.execute(
                update(Buyers)
                .where(Buyers.id == session.business_id)
                .values(
                    business_country=request.country,
                    updated_at=now,
                )
            )

            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == request.onboarding_session_id)
                .values(
                    onboarding_data=(
                        func.coalesce(
                            OnboardingSession.onboarding_data, cast(literal({}), JSONB)
                        ).op("||")(
                            cast(literal({"business_country": request.country}), JSONB)
                        )
                    ),
                    step="business_country_set",
                    updated_at=now,
                )
            )

            await self.db.commit()
            return ServiceResponse(
                success=True,
                message=f"Buyers country set to {request.country}",
                onboarding_session_id=request.onboarding_session_id,
            )

        except Exception as e:
            await self.db.rollback()
            return ServiceResponse(
                success=False,
                message=f"Failed to set business country: {str(e)}",
            )

    async def set_business_info(self, request: BusinessInfoRequest) -> Dict[str, Any]:
        """Set the business information for the current onboarding session."""
        if not request.onboarding_session_id:
            raise ValueError("onboarding_session_id is required")

        # Extract only the business fields (exclude the session id)
        business_info = request.model_dump(exclude={"onboarding_session_id"})

        try:
            now = now_utc()

            # Load onboarding session and validate business linkage
            sess_row = await self.db.execute(
                select(OnboardingSession).where(
                    OnboardingSession.id == request.onboarding_session_id
                )
            )
            session = sess_row.scalar_one_or_none()
            if not session:
                return ServiceResponse(
                    success=False, message="Onboarding session not found"
                )

            if not session.business_id:
                return ServiceResponse(
                    success=False, message="Session is not linked to a business"
                )

            # Write to the canonical Buyers table
            await self.db.execute(
                update(Buyers)
                .where(Buyers.id == session.business_id)
                .values(
                    business_info=business_info,  # full structured dict
                    updated_at=now,
                )
            )

            # Keep the onboarding_data JSON trail in sync for transparency/logging
            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == request.onboarding_session_id)
                .values(
                    onboarding_data=(
                        func.coalesce(
                            OnboardingSession.onboarding_data, cast(literal({}), JSONB)
                        ).op("||")(
                            cast(literal({"business_info": business_info}), JSONB)
                        )
                    ),
                    step="business_info_set",
                    updated_at=now,
                )
            )

            await self.db.commit()
            return ServiceResponse(
                success=True,
                message="Buyers info set successfully",
                onboarding_session_id=request.onboarding_session_id,
            )

        except Exception as e:
            await self.db.rollback()
            return ServiceResponse(
                success=False,
                message=f"Failed to set business info: {str(e)}",
            )

    async def update_shareholders(
        self, request: ShareholderInfoRequest
    ) -> Dict[str, Any]:
        """Set or update the shareholder information for the business."""
        try:
            now = now_utc()
            now_iso = now.isoformat()

            # Normalize and structure shareholder data
            shareholders_data = [
                {
                    "id": item.id or secrets.token_urlsafe(12),
                    "first_name": item.first_name,
                    "last_name": item.last_name,
                    "email": (item.email or "").strip().lower() or None,
                    "created_at": now_iso,
                    "updated_at": now_iso,
                }
                for item in request.shareholders
            ]

            # Load onboarding session to find related business
            sess_row = await self.db.execute(
                select(OnboardingSession).where(
                    OnboardingSession.id == request.onboarding_session_id
                )
            )
            session = sess_row.scalar_one_or_none()
            if not session:
                return ServiceResponse(
                    success=False, message="Onboarding session not found"
                )

            if not session.business_id:
                return ServiceResponse(
                    success=False, message="Session is not linked to a business"
                )

            # Write shareholders to canonical Buyers table
            await self.db.execute(
                update(Buyers)
                .where(Buyers.id == session.business_id)
                .values(
                    shareholders=shareholders_data,
                    updated_at=now,
                )
            )

            # Keep onboarding session JSON data synced (for audit trail)
            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == request.onboarding_session_id)
                .values(
                    onboarding_data=(
                        func.coalesce(
                            OnboardingSession.onboarding_data, cast(literal({}), JSONB)
                        ).op("||")(
                            cast(literal({"shareholders": shareholders_data}), JSONB)
                        )
                    ),
                    step="shareholders_updated",
                    updated_at=now,
                )
            )

            await self.db.commit()
            return ServiceResponse(
                success=True,
                message="Shareholders updated successfully",
                onboarding_session_id=request.onboarding_session_id,
            )

        except Exception as e:
            await self.db.rollback()
            return ServiceResponse(
                success=False,
                message=f"Failed to add shareholders: {str(e)}",
            )

    async def finalize_business_onboarding(
        self, onboarding_session_id: str
    ) -> Dict[str, Any]:
        """Create a new user from completed onboarding session"""
        try:
            now = now_utc()

            # Fetch the onboarding session
            result = await self.db.execute(
                select(OnboardingSession).where(
                    OnboardingSession.id == onboarding_session_id
                )
            )
            session = result.scalar_one_or_none()

            if not session:
                return ServiceResponse(
                    success=False,
                    message="Onboarding session not found",
                )

            # Ensure the session is linked to a business
            if not session.business_id:
                return ServiceResponse(
                    success=False,
                    message="Onboarding session is not linked to a business",
                    onboarding_session_id=onboarding_session_id,
                )

            # Validate that required steps are completed
            if not session.phone_verified or not session.email_verified:
                return ServiceResponse(
                    success=False,
                    message="Phone and email must be verified before completing onboarding",
                    onboarding_session_id=onboarding_session_id,
                )

            # Buyers info validation — from stored onboarding_data
            onboarding_data = session.onboarding_data or {}
            if not onboarding_data.get("business_country"):
                return ServiceResponse(
                    success=False,
                    message="Buyers country must be set before completing onboarding",
                    onboarding_session_id=onboarding_session_id,
                )

            # Load the linked business
            biz_result = await self.db.execute(
                select(Buyers).where(Buyers.id == session.business_id)
            )
            business = biz_result.scalar_one_or_none()
            if not business:
                return ServiceResponse(
                    success=False,
                    message="Linked business not found",
                    onboarding_session_id=onboarding_session_id,
                )

            # Update business data from the onboarding session (authoritative copy)
            await self.db.execute(
                update(Buyers)
                .where(Buyers.id == session.business_id)
                .values(
                    business_country=onboarding_data.get("business_country"),
                    business_info=onboarding_data.get("business_info"),
                    shareholders=onboarding_data.get("shareholders"),
                    is_onboarding_complete=True,
                    updated_at=now,
                )
            )

            # Mark onboarding session as completed
            await self.db.execute(
                update(OnboardingSession)
                .where(OnboardingSession.id == onboarding_session_id)
                .values(status="completed", step="business_finalized", updated_at=now)
            )

            await self.db.commit()

            return ServiceResponse(
                success=True,
                message="Buyers onboarding completed successfully",
                onboarding_session_id=onboarding_session_id,
                business_id=session.business_id,
            )

        except IntegrityError:
            await self.db.rollback()
            return ServiceResponse(
                success=False,
                message="A business with this contact information already exists",
                onboarding_session_id=onboarding_session_id,
            )
        except Exception as e:
            await self.db.rollback()
            return ServiceResponse(
                success=False,
                message=f"Failed to finalize onboarding: {str(e)}",
                onboarding_session_id=onboarding_session_id,
            )
