"""MembershipService — multi-organization access for users.

Lists organizations the user belongs to and updates the active organization
on ``users.organization_id`` (JWT context) after validation against
``user_organization_memberships``.
"""
from __future__ import annotations

import logging
from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError, ForbiddenError, NotFoundError
from app.db.models.identity import Organization, User, UserOrganizationMembership
from app.models.organization import UserOrganizationMembershipItem

logger = logging.getLogger(__name__)


class MembershipService:
    """Organization membership queries and active-org switching."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_user_organizations(
        self,
        user_id: str,
        *,
        active_organization_id: str | None,
    ) -> list[UserOrganizationMembershipItem]:
        """Return all organizations the user is a member of."""
        try:
            stmt = (
                select(UserOrganizationMembership, Organization)
                .join(
                    Organization,
                    Organization.id == UserOrganizationMembership.organization_id,
                )
                .where(UserOrganizationMembership.user_id == user_id)
                .order_by(Organization.name.asc())
            )
            result = await self.db.execute(stmt)
            rows: Sequence[tuple[UserOrganizationMembership, Organization]] = result.all()
            items: list[UserOrganizationMembershipItem] = []
            for mem, org in rows:
                items.append(
                    UserOrganizationMembershipItem(
                        organization_id=UUID(org.id),
                        name=org.name,
                        vat_number=org.vat_number,
                        country=org.country,
                        role=mem.role.value if hasattr(mem.role, "value") else str(mem.role),
                        is_current=active_organization_id == org.id,
                    )
                )
            return items
        except SQLAlchemyError as e:
            logger.error("list_user_organizations failed: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")

    async def switch_active_organization(self, user_id: str, organization_id: str) -> User:
        """Set the user's active org and role from a validated membership row."""
        try:
            mres = await self.db.execute(
                select(UserOrganizationMembership).where(
                    UserOrganizationMembership.user_id == user_id,
                    UserOrganizationMembership.organization_id == organization_id,
                )
            )
            mem = mres.scalar_one_or_none()
            if not mem:
                raise ForbiddenError(
                    "You are not a member of this organization.",
                    code="organization.access_denied",
                )

            ures = await self.db.execute(select(User).where(User.id == user_id))
            user = ures.scalar_one_or_none()
            if not user:
                raise NotFoundError("User not found.", code="resource.not_found")

            user.organization_id = organization_id
            user.role = mem.role
            await self.db.commit()
            await self.db.refresh(user)
            return user
        except (ForbiddenError, NotFoundError):
            raise
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("switch_active_organization failed: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")
