"""Authentication routes: login, logout, token refresh, password management.

All auth endpoints live under the ``/auth`` prefix.  The seller's JWT
access token (30-min TTL) is included in the Authorization header of
subsequent requests; the refresh token is used only at ``POST /auth/refresh``.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.controllers.user_controller import UserController
from app.dependencies import get_user_controller, require_auth
from app.models.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    ResetPasswordRequest,
    ServiceResponse,
    SignUpRequest,
)

router = APIRouter(tags=["Auth"])


# ---------------------------------------------------------------------------
# Seller registration
# ---------------------------------------------------------------------------


@router.post("/signup", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def sign_up(
    req: SignUpRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
) -> ServiceResponse:
    """Register a new seller account.

    Args:
        req: ``SignUpRequest`` containing ``username``, ``email``, and
            ``password``.

    Returns:
        ``ServiceResponse`` with ``success=True`` on creation.

    Raises:
        HTTPException: 409 if the username or email is already in use.
        HTTPException: 400 for other validation failures.
    """
    response: ServiceResponse = await user_controller.sign_up(req)
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT
            if "already" in (response.message or "").lower()
            else status.HTTP_400_BAD_REQUEST,
            detail=response.message or "Sign-up failed",
        )
    return response


# ---------------------------------------------------------------------------
# Login / logout / refresh
# ---------------------------------------------------------------------------


@router.post("/login", response_model=ServiceResponse)
async def login(
    req: LoginRequest,
    request: Request,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
) -> ServiceResponse:
    """Authenticate a seller and issue JWT + refresh token.

    Returns:
        ``ServiceResponse`` with ``access_token`` (JWT, 30 min) and
        ``refresh_token`` (opaque, 7 days) on success.

    Raises:
        HTTPException: 401 on invalid credentials.
    """
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    response: ServiceResponse = await user_controller.login(
        req, user_agent=user_agent, ip_address=ip_address
    )
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=response.message or "Invalid credentials",
        )
    return response


@router.post("/logout", response_model=ServiceResponse)
async def logout(
    req: _RefreshTokenBody,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
) -> ServiceResponse:
    """Revoke the seller's refresh token, ending the session.

    The JWT access token will expire on its own after 30 minutes.  Pass the
    refresh token in the request body to prevent further token issuance for
    this session.

    Args:
        req: Body containing ``refresh_token``.

    Raises:
        HTTPException: 401 if the refresh token is not found.
    """
    response: ServiceResponse = await user_controller.logout(req.refresh_token)
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=response.message or "Invalid token",
        )
    return response


@router.post("/refresh", response_model=ServiceResponse)
async def refresh_tokens(
    req: _RefreshTokenBody,
    request: Request,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
) -> ServiceResponse:
    """Exchange a valid refresh token for a new JWT + rotated refresh token.

    Refresh tokens are rotated on each use — presenting the same token twice
    returns a 401 (replay protection).

    Args:
        req: Body containing ``refresh_token``.

    Returns:
        ``ServiceResponse`` with fresh ``access_token`` and ``refresh_token``.

    Raises:
        HTTPException: 401 if the token is invalid, expired, or already used.
    """
    user_agent = request.headers.get("user-agent")
    ip_address = request.client.host if request.client else None
    response: ServiceResponse = await user_controller.refresh_tokens(
        req.refresh_token, user_agent=user_agent, ip_address=ip_address
    )
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=response.message or "Token refresh failed",
        )
    return response


# ---------------------------------------------------------------------------
# Password management
# ---------------------------------------------------------------------------


@router.post("/forgot-password", response_model=ServiceResponse)
async def forgot_password(
    req: ForgotPasswordRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
) -> ServiceResponse:
    """Trigger a password-reset email if the account exists.

    Always returns a generic success message to prevent user enumeration.
    """
    response: ServiceResponse = await user_controller.forgot_password(req)
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error",
        )
    return response


@router.post("/reset-password", response_model=ServiceResponse)
async def reset_password(
    req: ResetPasswordRequest,
    user_controller: Annotated[UserController, Depends(get_user_controller)],
) -> ServiceResponse:
    """Complete password reset using the one-time token from the email link.

    Args:
        req: ``ResetPasswordRequest`` with ``token``, ``new_password``, and
            ``confirm_password``.

    Raises:
        HTTPException: 400 if the token is invalid or expired.
    """
    response: ServiceResponse = await user_controller.reset_password(req)
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.message or "Reset failed",
        )
    return response


@router.post("/change-password", response_model=ServiceResponse)
async def change_password(
    req: ChangePasswordRequest,
    payload: Annotated[dict, Depends(require_auth)],
    user_controller: Annotated[UserController, Depends(get_user_controller)],
) -> ServiceResponse:
    """Change the authenticated seller's password.

    Requires a valid JWT in the ``Authorization: Bearer <token>`` header.
    All active sessions are revoked on success.

    Args:
        req: ``ChangePasswordRequest`` with ``current_password``,
            ``new_password``, and ``confirm_password``.
        payload: Decoded JWT payload injected by ``require_auth``.

    Raises:
        HTTPException: 400 if the current password is wrong or passwords match.
    """
    seller_id: str = payload["sub"]
    response: ServiceResponse = await user_controller.change_password(
        seller_id=seller_id, req=req
    )
    if not response.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.message or "Change password failed",
        )
    return response


# ---------------------------------------------------------------------------
# Internal helper model (defined here to keep routes self-contained)
# ---------------------------------------------------------------------------

from pydantic import BaseModel  # noqa: E402 — placed after routes intentionally


class _RefreshTokenBody(BaseModel):
    """Request body for logout and token-refresh endpoints."""

    refresh_token: str
