from fastapi import APIRouter, HTTPException, Depends, Header, status
from typing import Optional, Annotated
from app.controllers.user_controller import UserController
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
from app.dependencies import get_user_controller
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=True)


@router.post("/send-onboarding-link", response_model=ServiceResponse)
async def send_onboarding_link(
    request: SendOnboardingLinkRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Send onboarding link to buyer email

    @param request: SendOnboardingLinkRequest with email and seller_id
    @returns: Response with success status
    """
    response: ServiceResponse = await user_controller.send_onboarding_link(request)
    if not response.success:
        raise HTTPException(status_code=400, detail=response.message)
    return response


@router.get("/start-onboarding-session", response_model=ServiceResponse)
async def start_onboarding_session(
    token: str,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Start an onboarding session using a secure token

    @param token: Secure onboarding token from query parameter
    @returns: onboarding_session_id: the session id

    - success: bool - whether the operation succeded.
    - message: str - explanation
    - onboarding_session_id: the session id
    """
    response: ServiceResponse = await user_controller.start_onboarding_session(token)
    if not response.success:
        raise HTTPException(status_code=400, detail=response.message)
    return response


@router.post("/phone/verify", response_model=ServiceResponse)
async def initiate_phone_verification(
    request: PhoneVerificationRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Initiate phone number verification by sending SMS

    @param request: Phone verification request with country code and phone number
    @returns: PhoneVerificationResponse object:

    - success: bool - whether the operation succeded.
    - message: str - explanation
    - verification_session_id: the email verification session id
    - onboarding_session_id: the session id
    """
    response: ServiceResponse = await user_controller.initiate_phone_verification(
        request
    )
    if not response.success:
        raise HTTPException(
            status_code=400, detail=response.message or "Operation failed"
        )
    return response


@router.post("/phone/verify-code", response_model=ServiceResponse)
async def verify_phone_code(
    request: PhoneVerificationCodeRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Verify the SMS verification code

    @param request: Phone verification code request with verification ID and code
    @returns: PhoneVerificationCodeResponse object:

    - success: bool - whether the operation succeded.
    - message: str - explanation
    - onboarding_session_id: the session id
    """
    response: ServiceResponse = await user_controller.verify_phone_code(request)
    if not response.success:
        raise HTTPException(
            status_code=400, detail=response.message or "Verification failed"
        )
    return response


@router.post("/email/verify", response_model=ServiceResponse)  # ✅ Added response_model
async def initiate_email_verification(
    request: EmailVerificationRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Initiate email verification by sending verification code

    @param request: Email verification request with email and verified phone number
    @returns: EmailVerificationResponse object:

    - success: bool - whether the operation succeded.
    - message: str - explanation
    - verification_session_id: the email verification session id
    - onboarding_session_id: the session id
    """
    response: ServiceResponse = await user_controller.initiate_email_verification(
        request
    )
    if not response.success:
        raise HTTPException(
            status_code=400, detail=response.message or "Verification failed"
        )
    return response


@router.post("/email/verify-code", response_model=ServiceResponse)
async def verify_email_code(
    request: EmailVerificationCodeRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Verify the email verification code

    @param request: Email verification code request with verification ID and code
    @returns: EmailVerificationCodeResponse object:

    - success: bool - whether the operation succeded.
    - message: str - explanation
    - onboarding_session_id: the session id
    """
    response: ServiceResponse = await user_controller.verify_email_code(request)
    if not response.success:
        raise HTTPException(
            status_code=400, detail=response.message or "Verification failed"
        )
    return response


@router.put("/business-country", response_model=ServiceResponse)
async def set_business_country(
    request: BusinessCountryRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Set the business country for the user

    @param request: Business country request with selected country
    @returns: Response with business country setting result:

    - success: bool - whether the operation succeded
    - message: str - explanation
    """
    response: ServiceResponse = await user_controller.set_business_country(request)
    if not response.success:
        raise HTTPException(
            status_code=400,
            detail=response.message or "Business country setting failed",
        )
    return response


@router.put("/business-info", response_model=ServiceResponse)
async def set_business_info(
    request: BusinessInfoRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Set business information

    @param request: Business info request with business information
    @returns: Response with result:
    """
    response: ServiceResponse = await user_controller.set_business_info(request)
    if not response.success:
        raise HTTPException(
            status_code=400, detail=response.message or "Business info setting failed"
        )
    return response


@router.put("/shareholder-info", response_model=ServiceResponse)
async def set_shareholder_info(
    request: ShareholderInfoRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Set shareholder information

    @param request: Shareholder request with shareholder information
    @returns: Response with shareholders information result:

    - success: bool - whether the operation succeded
    - message: str - explanation
    """
    response: ServiceResponse = await user_controller.set_shareholder_info(request)
    if not response.success:
        raise HTTPException(status_code=400, detail=response.message)
    return response


@router.post("/create-user", response_model=ServiceResponse)
async def create_user(
    onboarding_session_id: str,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Complete onboarding and create final user record

    @param onboarding_session_id: The onboarding session ID to complete
    @returns: Response with user creation result:

    - success: bool - whether the operation succeeded
    - message: str - explanation
    - user_id: str - the created user ID (if successful)
    """
    response = await user_controller.create_business(onboarding_session_id)
    if not response.success:
        raise HTTPException(
            status_code=400, detail=response.message or "User creation failed"
        )
    return response


@router.post("/signup", response_model=ServiceResponse)
async def sign_up(
    req: SignUpRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Sign up a new user

    @param req: Sign-up request containing username, email, and password
    @returns: Response with signup result:

    - success: bool - whether the operation succeeded
    - message: str - explanation of the signup result
    - onboarding_session_id: optional - if linked to an onboarding session
    """
    response: ServiceResponse = await user_controller.sign_up(req)
    if not response.success:
        raise HTTPException(
            status_code=400, detail=response.message or "User signup failed"
        )
    return response


@router.post("/login", response_model=ServiceResponse)
async def login(
    req: LoginRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Log in with username and password.

    Returns:
    - success: bool
    - message: str
    - access_token: optional bearer token on success
    - token_type: always 'bearer' when access_token is present
    - user_id / username: included on success for convenience
    """
    response: ServiceResponse = await user_controller.login(req)
    if not response.success:
        # Unhappy path: bubble up a 401 so the frontend can ask for credentials again
        raise HTTPException(
            status_code=401, detail=response.message or "Invalid credentials"
        )
    return response


@router.post("/logout", response_model=ServiceResponse)
async def logout(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user_controller: Annotated[UserController, Depends(get_user_controller)] = None,
):
    """
    Logout by revoking the current bearer token.
    Reads the Authorization header (no dedicated auth module yet).
    """
    response: ServiceResponse = await user_controller.logout(creds.credentials)
    if not response.success:
        # surface 401 if token is missing/invalid so the frontend can clean up local session
        raise HTTPException(status_code=401, detail=response.message or "Invalid token")
    return response


@router.post("/forgot-password", response_model=ServiceResponse)
async def forgot_password(
    req: ForgotPasswordRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Start the password reset flow by sending a reset email if the account exists.
    Always returns a generic success message to prevent user enumeration.
    """
    response: ServiceResponse = await user_controller.forgot_password(req)
    if not response.success:
        # Database or internal errors become 500; we don't reveal account existence
        raise HTTPException(
            status_code=500, detail=response.message or "Internal error"
        )
    return response


@router.post("/reset-password", response_model=ServiceResponse)
async def reset_password(
    req: ResetPasswordRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
):
    """
    Complete password reset:
    - Frontend extracts `token` from the reset link query string
    - Frontend posts { token, new_password, confirm_password } here
    """
    response: ServiceResponse = await user_controller.reset_password(req)
    if not response.success:
        raise HTTPException(status_code=400, detail=response.message or "Reset failed")
    return response


@router.post("/change-password", response_model=ServiceResponse)
async def change_password(
    req: ChangePasswordRequest,
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    user_controller: Annotated[UserController, Depends(get_user_controller)] = None,
):
    """
    Change password for the authenticated user.
    Requires a valid Bearer token in the Authorization header.
    """
    response: ServiceResponse = await user_controller.change_password(
        token=creds.credentials, req=req
    )
    if not response.success:
        # 401 for invalid/absent token; 400 for bad current password or validation issues
        code = (
            status.HTTP_401_UNAUTHORIZED
            if response.message == "Invalid authentication token."
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=code, detail=response.message or "Change password failed"
        )
    return response
