"""MembershipController — list orgs and switch active organization context."""

from __future__ import annotations

from app.models.organization import (
    SwitchOrganizationRequest,
    SwitchOrganizationResponse,
    UserOrganizationMembershipItem,
)
from app.services.auth_service import AuthService
from app.services.membership_service import MembershipService


class MembershipController:
    def __init__(
        self,
        membership_service: MembershipService,
        auth_service: AuthService,
    ) -> None:
        self.membership_service = membership_service
        self.auth_service = auth_service

    async def list_organizations(self, user_payload: dict) -> list[UserOrganizationMembershipItem]:
        return await self.membership_service.list_user_organizations(
            user_payload["sub"],
            active_organization_id=user_payload.get("organization_id"),
        )

    async def switch_organization(
        self,
        user_payload: dict,
        request: SwitchOrganizationRequest,
    ) -> SwitchOrganizationResponse:
        user = await self.membership_service.switch_active_organization(
            user_payload["sub"],
            str(request.organization_id),
        )
        return self.auth_service.build_switch_organization_response(user)
