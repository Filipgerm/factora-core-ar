from datetime import datetime, timedelta, timezone
import email
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from urllib.parse import urljoin
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
    SignUpRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
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
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.dialects.postgresql import JSONB
from app.db.database_models import (
    OnboardingSession,
    SellerSessions,
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
from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
    ValidationError,
    FactoraError,
)

FRONTEND_BASE_URL = settings.FRONTEND_BASE_URL


Channel = Literal["phone", "email"]
ph = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=2)


def hash_password(password: str, *, pepper: str | None = None) -> str:
    """Returns an Argon2id hash string suitable for storage in the DB.

    Optionally mixes in a server-side pepper kept in a secrets manager.
    Never call this for verification — use ``verify_password`` instead.

    Args:
        password: The plaintext password to hash.
        pepper: Optional server-side secret prepended before hashing.

    Returns:
        An Argon2id hash string.
    """
    pwd = f"{pepper}{password}" if pepper else password
    return ph.hash(pwd)


def verify_password(
    stored_hash: str, password: str, *, pepper: str | None = None
) -> bool:
    """Verifies a plaintext password against an Argon2id stored hash.

    Handles salt extraction internally via the Argon2 library; safe against
    timing attacks. Returns ``False`` (never raises) on mismatch so callers
    can use a simple boolean check.

    Args:
        stored_hash: The Argon2id hash retrieved from the database.
        password: The plaintext password supplied by the user.
        pepper: Optional server-side secret that was mixed in at hash time.

    Returns:
        ``True`` if the password matches, ``False`` otherwise.
    """

    pwd = f"{pepper}{password}" if pepper else password
    try:
        return ph.verify(stored_hash, pwd)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


_ACCESS_TOKEN_TTL_HOURS = 24


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def hash_token(raw_token: str) -> str:
    """Return a SHA-256 hex digest of *raw_token* for safe DB storage.

    The raw token is returned to the client; only its hash is persisted so
    that a database read cannot be used to forge a valid session.

    Args:
        raw_token: The raw opaque token string (e.g. from ``secrets.token_urlsafe``).

    Returns:
        A 64-character lowercase hex string.
    """
    import hashlib

    return hashlib.sha256(raw_token.encode()).hexdigest()


def sha256_code(code: str, *, pepper: str) -> str:
    """Hash the verification code with a server-side pepper."""
    h = hashlib.sha256()
    h.update(f"{pepper}:{code}".encode("utf-8"))
    return h.hexdigest()


def _validate_password(password: str) -> None:
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    # Keep a reasonable baseline; adjust to your policy
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must include a lowercase letter.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must include an uppercase letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must include a digit.")


class UserService:
    """Service class for handling user onboarding business logic"""

    def __init__(self, db: AsyncSession, *, code_pepper: str):
        self.db = db
        self.notification_service = NotificationService()
        self.code_pepper = code_pepper

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

    async def sign_up(self, request: SignUpRequest) -> Dict[str, Any]:
        """
        Create a new seller with hashed password and unique email/username.
        """
        try:

            # Optional preflight to give a clearer error than raw IntegrityError:
            exists = await self.db.execute(
                select(Sellers.id).where(Sellers.email == request.email)
            )
            if exists.scalar_one_or_none():
                raise ConflictError("Email already in use.")

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

            # created = result.first()
            # print(created)
            await self.db.commit()
            return ServiceResponse(
                success=True,
                message="Seller created successfully.",
            )

        except IntegrityError:
            # Someone else grabbed the same email between our check and commit
            await self.db.rollback()
            return ServiceResponse(success=False, message="Email already in use.")

        except SQLAlchemyError as e:
            await self.db.rollback()
            return ServiceResponse(success=False, message=f"Database error: {e}")

    async def login(
        self,
        request: LoginRequest,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> Dict[str, Any]:
        """Validate credentials and issue a JWT access token + opaque refresh token.

        The JWT access token has a 30-minute TTL and is never stored in the DB.
        The refresh token is opaque (``secrets.token_urlsafe``), has a 7-day TTL,
        and is persisted as its SHA-256 hash in ``seller_sessions``.

        Args:
            request: Validated ``LoginRequest`` containing ``username`` and
                ``password``.
            user_agent: Optional ``User-Agent`` header value for session audit.
            ip_address: Optional real client IP for session audit.

        Returns:
            ``ServiceResponse`` with ``access_token`` (JWT), ``refresh_token``
            (opaque), and ``token_type="bearer"`` on success.
        """
        try:
            # 1) Lookup by username
            result = await self.db.execute(
                select(Sellers).where(Sellers.username == request.username)
            )
            seller: Optional[Sellers] = result.scalar_one_or_none()

            # Using AuthenticationError for 401 Unauthorized mapping
            if not seller:
                raise AuthenticationError("Invalid username or password.")

            # 2) Verify password against the stored Argon2id hash
            if not verify_password(
                seller.password_hash, request.password, pepper=self.code_pepper
            ):
                raise AuthenticationError("Invalid username or password.")

            if not seller.is_active:
                raise AuthenticationError(
                    "Account is disabled. Please contact support."
                )

            # 3) Issue a short-lived JWT access token.
            #    The raw JWT is returned to the client; we store only the SHA-256
            #    hash of its jti claim for optional forced revocation.
            access_token, jti = encode_access_token(seller.id)

            # 4) Issue an opaque refresh token.
            #    Only the SHA-256 hash is persisted so DB breach ≠ token exposure.
            raw_refresh_token, refresh_hash = generate_refresh_token()
            now = now_utc()
            refresh_expires_at = now + timedelta(days=REFRESH_TOKEN_TTL_DAYS)

            # Persist the new session row
            session = SellerSessions(
                seller_id=seller.id,
                refresh_token_hash=refresh_hash,
                jti_hash=hash_jti(jti),
                expires_at=refresh_expires_at,
                created_at=now,
                last_used_at=now,
                user_agent=user_agent,
                ip_address=ip_address,
            )
            self.db.add(session)

            # Update last_login_at on the seller row
            await self.db.execute(
                update(Sellers).where(Sellers.id == seller.id).values(last_login_at=now)
            )
            await self.db.commit()

            return ServiceResponse(
                success=True,
                message="Login successful.",
                access_token=access_token,
                refresh_token=raw_refresh_token,
                token_type="bearer",
                user_id=str(seller.id),
                username=seller.username,
            )

        except SQLAlchemyError as e:
            await self.db.rollback()
            return ServiceResponse(success=False, message=f"Database error: {e}")

    async def logout(self, refresh_token: str) -> Dict[str, Any]:
        """Revoke the seller's refresh token, ending the session.

        The JWT access token will expire naturally after 30 minutes.  Passing
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

            # Delete the session row — no further refresh is possible
            await self.db.execute(
                delete(SellerSessions).where(
                    SellerSessions.refresh_token_hash == token_hash
                )
            )
            await self.db.commit()

            return ServiceResponse(success=True, message="Logged out successfully.")

        except SQLAlchemyError as e:
            await self.db.rollback()
            return ServiceResponse(success=False, message=f"Database error: {e}")

    async def refresh_tokens(
        self,
        refresh_token: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> Dict[str, Any]:
        """Exchange a valid refresh token atomically to prevent race conditions."""
        try:
            token_hash = hash_token(refresh_token)
            now = now_utc()

            # We delete the row and return its data in a single operation.
            # If two requests arrive simultaneously, Postgres locks the row.
            # The first request deletes it and gets the data. The second request gets None.
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
                # We do not need a separate SELECT. If it didn't delete, it's invalid.
                raise AuthenticationError("Invalid or expired refresh token.")

            seller_id, old_user_agent, old_ip_address = consumed_session

            # Verify the seller still exists and is active
            seller_result = await self.db.execute(
                select(Sellers).where(
                    Sellers.id == seller_id,
                    Sellers.is_active.is_(True),
                )
            )
            seller: Optional[Sellers] = seller_result.scalar_one_or_none()

            if not seller:
                # The session is already deleted by the RETURNING clause above.
                await self.db.commit()
                raise AuthenticationError("Account not found or disabled.")

            # Issue new tokens (rotation)
            new_access_token, new_jti = encode_access_token(seller.id)
            new_raw_refresh, new_refresh_hash = generate_refresh_token()
            new_expires_at = now + timedelta(days=REFRESH_TOKEN_TTL_DAYS)

            # Insert the fresh session
            new_session = SellerSessions(
                seller_id=seller.id,
                refresh_token_hash=new_refresh_hash,
                jti_hash=hash_jti(new_jti),
                expires_at=new_expires_at,
                created_at=now,
                last_used_at=now,
                user_agent=user_agent or old_user_agent,
                ip_address=ip_address or old_ip_address,
            )
            self.db.add(new_session)

            # The transaction guarantees that if anything failed above, the deleted
            # old session is rolled back safely.
            await self.db.commit()

            return ServiceResponse(
                success=True,
                message="Tokens refreshed.",
                access_token=new_access_token,
                refresh_token=new_raw_refresh,
                token_type="bearer",
                user_id=str(seller.id),
                username=seller.username,
            )

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during token refresh: {str(e)}")

    async def forgot_password(self, request: ForgotPasswordRequest) -> Dict[str, Any]:
        """
        Generate a password reset token and email it if the account exists.
        Always return a generic success message to avoid user enumeration.
        """
        try:
            reset_token = secrets.token_urlsafe(32)
            hashed_token = hash_token(reset_token)
            expires_at = now_utc() + timedelta(minutes=30)

            result = await self.db.execute(
                update(Sellers)
                .where(Sellers.email == request.email, Sellers.is_active.is_(True))
                .values(
                    password_reset_token=hashed_token,
                    password_reset_expires_at=expires_at,
                )
                .returning(Sellers.email)
            )
            updated_password_email = result.scalar_one_or_none()
            await self.db.commit()

            if updated_password_email:
                # Build reset URL the frontend will handle.
                base_url = FRONTEND_BASE_URL.rstrip("/")
                reset_url = f"{base_url}/auth/reset-password?token={reset_token}"
                try:
                    await self.notification_service.send_password_reset_email(
                        email=updated_password_email, reset_url=reset_url
                    )
                except Exception as e:
                    print(f"ERROR sending password reset email: {e}")

            return ServiceResponse(
                success=True,
                message="If an account exists for the provided email, a password reset link has been sent.",
            )

        except SQLAlchemyError as e:
            await self.db.rollback()
            return ServiceResponse(success=False, message=f"Database error: {e}")

    async def reset_password(self, request: ResetPasswordRequest) -> Dict[str, Any]:
        """Validate token and set new password atomically."""
        try:
            incoming_hash = hash_token(request.token)
            now = now_utc()
            new_hash = hash_password(request.new_password, pepper=self.code_pepper)

            # We attempt to update the password ONLY IF the token matches, is not expired,
            # and the user is active. We return the user data if successful.
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
                # If the query affected 0 rows, the token was invalid, expired, or used.
                raise AuthenticationError("Invalid or expired reset token.")

            seller_id, username = updated_seller

            # Global Logout: Secure the account
            await self.db.execute(
                delete(SellerSessions).where(SellerSessions.seller_id == seller_id)
            )
            await self.db.commit()

            return ServiceResponse(
                success=True,
                message="Password reset successful.",
                user_id=str(seller_id),
                username=username,
            )

        except SQLAlchemyError as e:
            await self.db.rollback()
            raise FactoraError(f"Database error during password reset: {str(e)}")

    async def change_password(
        self, seller_id: str, request: ChangePasswordRequest
    ) -> Dict[str, Any]:
        """Change the seller's password after verifying the current one.

        The caller must have already validated the JWT via ``require_auth`` so
        only a ``seller_id`` is received here — no raw token handling.
        All active sessions are revoked on success so the seller must re-login.

        Args:
            seller_id: The authenticated seller's primary key (from JWT ``sub``).
            request: ``ChangePasswordRequest`` containing ``current_password``,
                ``new_password``, and ``confirm_password``.

        Returns:
            ``ServiceResponse`` indicating success or the specific failure reason.
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
            now = now_utc()

            # Update password and revoke all sessions (force fresh login)
            await self.db.execute(
                update(Sellers)
                .where(Sellers.id == seller.id)
                .values(password_hash=new_hash, updated_at=now)
            )
            await self.db.execute(
                delete(SellerSessions).where(SellerSessions.seller_id == seller.id)
            )
            await self.db.commit()

            return ServiceResponse(
                success=True,
                message="Password changed successfully. Please log in again.",
                user_id=str(seller.id),
                username=seller.username,
            )

        except SQLAlchemyError as e:
            await self.db.rollback()
            return ServiceResponse(success=False, message=f"Database error: {e}")
