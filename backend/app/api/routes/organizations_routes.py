"""Plural ``/v1/organizations`` routes — list memberships and switch active org."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import AuthUser, MembCtrl
from app.models.organization import (
    SwitchOrganizationRequest,
    SwitchOrganizationResponse,
    UserOrganizationMembershipItem,
)

router = APIRouter()


@router.get(
    "/",
    response_model=list[UserOrganizationMembershipItem],
    summary="List organizations the current user belongs to",
)
async def list_my_organizations(
    user: AuthUser,
    ctl: MembCtrl,
) -> list[UserOrganizationMembershipItem]:
    return await ctl.list_organizations(user)


@router.post(
    "/switch",
    response_model=SwitchOrganizationResponse,
    summary="Switch active organization (new access token)",
)
async def switch_organization(
    user: AuthUser,
    req: SwitchOrganizationRequest,
    ctl: MembCtrl,
) -> SwitchOrganizationResponse:
    return await ctl.switch_organization(user, req)
