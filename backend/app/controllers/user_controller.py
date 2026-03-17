from typing import Dict, Any
from app.services.user_service import UserService
from app.models.user import (
    ServiceResponse,
    PhoneVerificationRequest,
    PhoneVerificationCodeRequest,
    EmailVerificationRequest,
    EmailVerificationCodeRequest,
    BusinessCountryRequest,
    BusinessInfoRequest,
    ShareholderInfoRequest,
    SignUpRequest,
    LoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    SendOnboardingLinkRequest,
)


class UserController:
    """Controller for handling user onboarding and authentication HTTP requests.

    Delegates all business logic to :class:`UserService` and wraps exceptions in a
    standard :class:`ServiceResponse` envelope so the route layer always receives a
    consistent shape.
    """

    def __init__(self, user_service: UserService):
        self.user_service = user_service

    async def send_onboarding_link(
        self, request: SendOnboardingLinkRequest
    ) -> ServiceResponse:
        """Generate and email a secure onboarding link to a buyer.

        Args:
            request: Contains the seller's ID and buyer's email/phone to target.

        Returns:
            :class:`ServiceResponse` with ``success=True`` on delivery, or
            ``success=False`` with an error message on failure.
        """
        try:
            return await self.user_service.send_onboarding_link(request)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def start_onboarding_session(self, token: str) -> ServiceResponse:
        """Start a buyer onboarding session identified by a secure token.

        Args:
            token: One-time opaque token from the onboarding link sent to the buyer.

        Returns:
            :class:`ServiceResponse` with session metadata on success.
        """
        try:
            return await self.user_service.start_onboarding_session(token)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def initiate_phone_verification(
        self, request: PhoneVerificationRequest
    ) -> Dict[str, Any]:
        """Send an SMS verification code to the buyer's phone number.

        Args:
            request: Contains the phone number (E.164) and onboarding session ID.

        Returns:
            :class:`ServiceResponse` with ``verification_id`` on success.
        """
        try:
            return await self.user_service.verify_phone_number(request)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def verify_phone_code(
        self, request: PhoneVerificationCodeRequest
    ) -> Dict[str, Any]:
        """Verify the SMS code submitted by the buyer.

        Args:
            request: Contains the verification_id and the 6-digit code.

        Returns:
            :class:`ServiceResponse` indicating whether the code was accepted.
        """
        try:
            return await self.user_service.verify_phone_code(request)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def initiate_email_verification(
        self, request: EmailVerificationRequest
    ) -> Dict[str, Any]:
        """Send an email verification code to the buyer's email address.

        Args:
            request: Contains the email address and onboarding session ID.

        Returns:
            :class:`ServiceResponse` with ``verification_id`` on success.
        """
        try:
            return await self.user_service.verify_email(request)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def verify_email_code(
        self, request: EmailVerificationCodeRequest
    ) -> Dict[str, Any]:
        """Verify the email code submitted by the buyer.

        Args:
            request: Contains the verification_id and the 6-digit code.

        Returns:
            :class:`ServiceResponse` indicating whether the code was accepted.
        """
        try:
            return await self.user_service.verify_email_code(request)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def set_business_country(
        self, request: BusinessCountryRequest
    ) -> Dict[str, Any]:
        """Record the buyer's business country during onboarding.

        Args:
            request: Contains the onboarding_session_id and the ISO-3166 country code.

        Returns:
            :class:`ServiceResponse` confirming the country was saved.
        """
        try:
            return await self.user_service.set_business_country(request)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def set_business_info(self, request: BusinessInfoRequest) -> Dict[str, Any]:
        """Persist the buyer's business registration details during onboarding.

        Args:
            request: Contains business name, VAT number, address, and session ID.

        Returns:
            :class:`ServiceResponse` confirming the business info was saved.
        """
        try:
            return await self.user_service.set_business_info(request)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def set_shareholder_info(
        self, request: ShareholderInfoRequest
    ) -> Dict[str, Any]:
        """Persist shareholder information for the buyer's business during onboarding.

        Args:
            request: Contains a list of shareholders and the onboarding session ID.

        Returns:
            :class:`ServiceResponse` confirming shareholders were saved.
        """
        try:
            return await self.user_service.update_shareholders(request)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def create_business(self, onboarding_session_id: str) -> Dict[str, Any]:
        """Finalise onboarding and promote the session to a verified business.

        Args:
            onboarding_session_id: The ID of the completed onboarding session.

        Returns:
            :class:`ServiceResponse` with the new buyer's ID on success.
        """
        try:
            return await self.user_service.finalize_business_onboarding(
                onboarding_session_id
            )
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def sign_up(self, req: SignUpRequest) -> Dict[str, Any]:
        """Register a new seller account with username and hashed password.

        Args:
            req: Contains username, password, and email for the new seller.

        Returns:
            :class:`ServiceResponse` with ``user_id`` on success.
        """
        try:
            return await self.user_service.sign_up(req)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def login(
        self,
        req: LoginRequest,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> Dict[str, Any]:
        """Authenticate a seller with username and password.

        Args:
            req: Contains username and password.
            user_agent: Optional User-Agent header for session audit.
            ip_address: Optional real client IP for session audit.

        Returns:
            :class:`ServiceResponse` with JWT ``access_token``, opaque
            ``refresh_token``, and ``token_type="bearer"`` on success.
        """
        try:
            return await self.user_service.login(req, user_agent=user_agent, ip_address=ip_address)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def logout(self, refresh_token: str) -> Dict[str, Any]:
        """Revoke the seller's refresh token, ending the session.

        Args:
            refresh_token: The opaque refresh token issued at login.

        Returns:
            :class:`ServiceResponse` confirming successful logout.
        """
        try:
            return await self.user_service.logout(refresh_token)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def refresh_tokens(
        self,
        refresh_token: str,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> Dict[str, Any]:
        """Exchange a refresh token for a new JWT + rotated refresh token.

        Args:
            refresh_token: The current opaque refresh token from the client.
            user_agent: Optional User-Agent for the updated session row.
            ip_address: Optional real client IP for the updated session row.

        Returns:
            :class:`ServiceResponse` with fresh ``access_token`` and
            ``refresh_token`` on success.
        """
        try:
            return await self.user_service.refresh_tokens(
                refresh_token, user_agent=user_agent, ip_address=ip_address
            )
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def forgot_password(self, req: ForgotPasswordRequest) -> Dict[str, Any]:
        """Initiate password reset flow by emailing a one-time reset link.

        Args:
            req: Contains the seller's email address.

        Returns:
            :class:`ServiceResponse` with a success message (always, to prevent enumeration).
        """
        try:
            return await self.user_service.forgot_password(req)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def reset_password(self, req: ResetPasswordRequest) -> Dict[str, Any]:
        """Consume a password-reset token and set a new password.

        Args:
            req: Contains the reset token and the new password.

        Returns:
            :class:`ServiceResponse` confirming the password was changed.
        """
        try:
            return await self.user_service.reset_password(req)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def change_password(
        self, seller_id: str, req: ChangePasswordRequest
    ) -> Dict[str, Any]:
        """Change the authenticated seller's password.

        Args:
            seller_id: The seller's primary key extracted from the validated JWT.
            req: Contains ``current_password``, ``new_password``, and
                ``confirm_password``.

        Returns:
            :class:`ServiceResponse` confirming the password was changed and
            all sessions were revoked (requiring re-login).
        """
        try:
            return await self.user_service.change_password(seller_id, req)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def get_onboarding_session_state(self, session_id: str) -> Dict[str, Any]:
        """Return the current step and verification state of an onboarding session.

        Used by the frontend to resume an abandoned onboarding flow.

        Args:
            session_id: The onboarding session primary key.

        Returns:
            :class:`ServiceResponse` with ``step``, ``phone_verified``, and
            ``email_verified`` fields populated on success.
        """
        try:
            return await self.user_service.get_onboarding_session_state(session_id)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")
