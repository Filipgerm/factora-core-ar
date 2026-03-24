"""Plural ``/v1/organizations`` routes — create org, list memberships, switch active org."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.dependencies import AuthUser, MembCtrl, OrgCtrl
from app.models.organization import (
    BusinessResponse,
    OrganizationSetupRequest,
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
    "/",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create organization (initial setup)",
)
async def create_organization(
    req: OrganizationSetupRequest,
    user: AuthUser,
    org_controller: OrgCtrl,
) -> BusinessResponse:
    """Same behavior as ``POST /v1/organization/`` — REST-style collection create."""
    return await org_controller.setup_organization(user["sub"], req)


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
