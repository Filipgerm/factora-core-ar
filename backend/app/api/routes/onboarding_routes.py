from fastapi import APIRouter, HTTPException, Depends, status
from typing import Annotated
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
    SendOnboardingLinkRequest,
)
from app.dependencies import get_user_controller

router = APIRouter(tags=["Onboarding"])


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
) -> ServiceResponse:
    """Complete onboarding and create the final buyer record.

    Args:
        onboarding_session_id: The ID of the completed onboarding session.

    Returns:
        ``ServiceResponse`` with the new buyer's ID on success.

    Raises:
        HTTPException: 400 if required verification steps are incomplete.
    """
    response = await user_controller.create_business(onboarding_session_id)
    if not response.success:
        raise HTTPException(
            status_code=400, detail=response.message or "User creation failed"
        )
    return response


@router.get("/session/{session_id}", response_model=ServiceResponse)
async def get_session_state(
    session_id: str,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
) -> ServiceResponse:
    """Return the current step and verification state of an onboarding session.

    Called by the frontend on page load when ``onboarding_session_id`` is
    stored in localStorage, allowing the buyer to resume from where they left
    off without re-clicking the invitation link.

    Args:
        session_id: The onboarding session primary key.

    Returns:
        ``ServiceResponse`` with ``step``, ``phone_verified``,
        ``email_verified``, and ``status``.

    Raises:
        HTTPException: 404 if the session does not exist.
    """
    response = await user_controller.get_onboarding_session_state(session_id)
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=response.message or "Session not found",
        )
    return response
