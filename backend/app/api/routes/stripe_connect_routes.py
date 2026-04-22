"""Stripe Connect OAuth onboarding routes (prefix ``/v1/stripe/connect``).

Flow::

    GET  /authorize          -> {authorization_url}   (auth required)
    GET  /callback?code&state -> 302 redirect to frontend settings page
    GET  /connections        -> list linked accounts  (auth required)
    POST /disconnect         -> soft disconnect + Stripe deauthorize
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.db.models.identity import UserRole
from app.dependencies import (
    AuthUser,
    CurrentOrgId,
    StripeConnectCtrl,
    require_auth,
    require_role,
)

router = APIRouter()


class DisconnectRequest(BaseModel):
    stripe_account_id: str


@router.get(
    "/authorize",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def authorize(
    controller: StripeConnectCtrl,
    user: AuthUser,
    org_id: CurrentOrgId,
):
    """Return the Stripe Connect OAuth URL for this organization."""
    return await controller.start(user_id=str(user["sub"]), organization_id=org_id)


@router.get("/callback")
async def callback(
    controller: StripeConnectCtrl,
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
):
    """OAuth redirect target. Browser-driven; no JSON body."""
    return await controller.callback(code=code, state=state)


@router.get(
    "/connections",
    dependencies=[Depends(require_auth)],
)
async def list_connections(
    controller: StripeConnectCtrl,
    org_id: CurrentOrgId,
):
    return await controller.list_connections(organization_id=org_id)


@router.post(
    "/disconnect",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def disconnect(
    controller: StripeConnectCtrl,
    org_id: CurrentOrgId,
    req: DisconnectRequest,
):
    return await controller.disconnect(
        organization_id=org_id, stripe_account_id=req.stripe_account_id
    )
