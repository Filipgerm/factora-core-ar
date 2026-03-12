from typing import Dict, Any, Union
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
    """Controller for handling user onboarding HTTP requests"""

    def __init__(self, user_service: UserService):
        self.user_service = user_service

    async def send_onboarding_link(
        self, request: SendOnboardingLinkRequest
    ) -> ServiceResponse:
        """
        Send onboarding link to buyer
        """
        try:
            response: ServiceResponse = await self.user_service.send_onboarding_link(
                request
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def start_onboarding_session(self, token: str) -> ServiceResponse:
        """
        Start an onboarding session using a secure token
        """
        try:
            response: ServiceResponse = (
                await self.user_service.start_onboarding_session(token)
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def initiate_phone_verification(
        self, request: PhoneVerificationRequest
    ) -> Dict[str, Any]:
        """
        Handle phone verification initiation request

        @param request: Phone verification request data
        @returns: Response with verification status and ID
        """
        try:
            response: ServiceResponse = await self.user_service.verify_phone_number(
                request
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def verify_phone_code(
        self, request: PhoneVerificationCodeRequest
    ) -> Dict[str, Any]:
        """
        Handle phone verification code submission

        @param request: Phone verification code request data
        @returns: Response with verification result
        """
        try:
            response: ServiceResponse = await self.user_service.verify_phone_code(
                request
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def initiate_email_verification(
        self, request: EmailVerificationRequest
    ) -> Dict[str, Any]:
        """
        Handle email verification initiation request

        @param request: Email verification request data
        @returns: Response with verification status and ID
        """
        try:
            response: ServiceResponse = await self.user_service.verify_email(request)
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def verify_email_code(
        self, request: EmailVerificationCodeRequest
    ) -> Dict[str, Any]:
        """
        Handle email verification code submission

        @param request: Email verification code request data
        @returns: Response with verification result
        """
        try:
            response: ServiceResponse = await self.user_service.verify_email_code(
                request
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def set_business_country(
        self, request: BusinessCountryRequest
    ) -> Dict[str, Any]:
        """
        Handle business country selection

        @param request: Business country request data
        @returns: Response with country setting result
        """
        try:
            response: ServiceResponse = await self.user_service.set_business_country(
                request
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def set_business_info(self, request: BusinessInfoRequest) -> Dict[str, Any]:
        """
        Handle business information completion

        @param request: Business info request with business information
        @returns: Response with business information setting result
        """
        try:
            response: ServiceResponse = await self.user_service.set_business_info(
                request
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def set_shareholder_info(
        self, request: ShareholderInfoRequest
    ) -> Dict[str, Any]:
        """
        Handle Shareholder information completion

        @param request: Shareholder information request data
        @returns: Response with shareholder information setting result
        """
        try:
            response: ServiceResponse = await self.user_service.update_shareholders(
                request
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def create_business(self, onboarding_session_id: str) -> Dict[str, Any]:
        """
        Complete onboarding and create final user record

        @param onboarding_session_id: The onboarding session ID to complete
        @returns: Response with user creation result
        """
        try:
            response: ServiceResponse = (
                await self.user_service.finalize_business_onboarding(
                    onboarding_session_id
                )
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def sign_up(self, req: SignUpRequest) -> Dict[str, Any]:
        """
        Handle user signup

        @param req: SignUpRequest: contains username, password, email
        """

        try:
            response: ServiceResponse = await self.user_service.sign_up(req)
            return response
        except Exception as e:
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def login(self, req: LoginRequest) -> Dict[str, Any]:
        """
        Handle user login (username + password).
        """
        try:
            response: ServiceResponse = await self.user_service.login(req)
            return response
        except Exception as e:
            # Keep consistent error envelope used in signup
            return ServiceResponse(
                success=False,
                message=f"Internal server error: {str(e)}",
            )

    async def logout(self, token: str) -> Dict[str, Any]:
        """
        Handle logout by revoking the provided bearer token.
        """
        try:
            response: ServiceResponse = await self.user_service.logout(token)
            return response
        except Exception as e:
            return ServiceResponse(
                success=False, message=f"Internal server error: {str(e)}"
            )

    async def forgot_password(self, req: ForgotPasswordRequest) -> Dict[str, Any]:
        """
        Initiate password reset for a user identified by email.
        """
        try:
            response: ServiceResponse = await self.user_service.forgot_password(req)
            return response
        except Exception as e:
            return ServiceResponse(
                success=False, message=f"Internal server error: {str(e)}"
            )

    async def reset_password(self, req: ResetPasswordRequest) -> Dict[str, Any]:
        """
        Finalize password reset for a user.
        """
        try:
            response: ServiceResponse = await self.user_service.reset_password(req)
            return response
        except Exception as e:
            return ServiceResponse(
                success=False, message=f"Internal server error: {str(e)}"
            )

    async def change_password(
        self, token: str, req: ChangePasswordRequest
    ) -> Dict[str, Any]:
        """
        Change password for the authenticated user identified by the provided token.
        """
        try:
            response: ServiceResponse = await self.user_service.change_password(
                token, req
            )
            return response
        except Exception as e:
            return ServiceResponse(
                success=False, message=f"Internal server error: {str(e)}"
            )
