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

    async def login(self, req: LoginRequest) -> Dict[str, Any]:
        """Authenticate a seller with username and password.

        Args:
            req: Contains username and password.

        Returns:
            :class:`ServiceResponse` with a bearer ``access_token`` on success.
        """
        try:
            return await self.user_service.login(req)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")

    async def logout(self, token: str) -> Dict[str, Any]:
        """Revoke the seller's current bearer token.

        Args:
            token: The raw bearer token extracted from the Authorization header.

        Returns:
            :class:`ServiceResponse` confirming successful logout.
        """
        try:
            return await self.user_service.logout(token)
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
        self, token: str, req: ChangePasswordRequest
    ) -> Dict[str, Any]:
        """Change the authenticated seller's password.

        Args:
            token: Bearer token identifying the current session.
            req: Contains the current password and the desired new password.

        Returns:
            :class:`ServiceResponse` confirming the password was changed and
            the session was revoked (requiring re-login).
        """
        try:
            return await self.user_service.change_password(token, req)
        except Exception as e:
            return ServiceResponse(success=False, message=f"Internal server error: {str(e)}")
