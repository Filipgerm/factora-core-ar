"""OrganizationService — tenant setup and counterparty management.

After a user completes sign-up and login they must set up their organization.
If the country is ``"GR"`` (Greece) and a VAT number is provided, the service
auto-fetches company metadata from the GEMI registry and stores it in
``organizations.registry_data``.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import insert, select, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictError,
    ExternalServiceError,
    NotFoundError,
    ValidationError,
)
from app.db.models.banking import CustomerModel
from app.db.models.identity import Organization, User
from app.db.models.counterparty import Counterparty, CounterpartyType
from app.models.organization import (
    CounterpartyCreate,
    CounterpartyUpdate,
    OrganizationSetupRequest,
)

logger = logging.getLogger(__name__)


class OrganizationService:
    """Handles organization creation, profile management, and counterparties."""

    def __init__(self, db: AsyncSession, organization_id: str | None = None) -> None:
        self.db = db
        self.organization_id = (
            organization_id  # None for setup flow; set for org-scoped ops
        )

    # ------------------------------------------------------------------
    # Organization setup
    # ------------------------------------------------------------------

    async def setup_organization(
        self,
        user_id: str,
        request: OrganizationSetupRequest,
    ) -> Organization:
        """Create an organization for the given user and link it to their account.

        If the user already has an organization, raises ``ConflictError``.
        For Greek companies (``country="GR"``), attempts to fetch registry data
        from GEMI using the provided VAT number.

        Returns:
            ``BusinessResponse`` with the new organization's details.

        Raises:
            ConflictError: User already has an organization.
            ValidationError: VAT number format is invalid.
        """
        # Check user exists and doesn't already have an org
        result = await self.db.execute(select(User).where(User.id == user_id))
        user: Optional[User] = result.scalar_one_or_none()
        if not user:
            raise NotFoundError("User not found.", code="resource.not_found")

        if user.organization_id:
            raise ConflictError(
                "User already belongs to an organization.",
                code="organization.already_exists",
            )

        # Attempt GEMI lookup for Greek companies
        registry_data: dict | None = None
        if request.country.upper() == "GR" and request.vat_number:
            registry_data = await self._fetch_gemi_data(request.vat_number)

        try:
            org_id = str(uuid.uuid4())
            new_org = Organization(
                id=org_id,
                name=request.name,
                vat_number=request.vat_number,
                country=request.country.upper(),
                registry_data=registry_data,
            )
            self.db.add(new_org)

            user.organization_id = org_id

            await self.db.commit()
            await self.db.refresh(new_org)
            return new_org

        except IntegrityError:
            await self.db.rollback()
            raise ConflictError(
                "Organization with this VAT already exists.",
                code="organization.vat_conflict",
            )
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error during setup_organization: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")

    async def get_organization(self) -> Organization:
        """Fetch the organization profile for the authenticated user.

        Raises:
            NotFoundError: Organization does not exist.
        """
        if not self.organization_id:
            raise NotFoundError("Organization not found.", code="resource.not_found")
        result = await self.db.execute(
            select(Organization).where(Organization.id == self.organization_id)
        )
        org: Optional[Organization] = result.scalar_one_or_none()
        if not org:
            raise NotFoundError("Organization not found.", code="resource.not_found")

        return org

    async def get_primary_saltedge_customer_id(
        self, organization_id: str | None = None
    ) -> str | None:
        """Return the oldest SaltEdge customer id for the org, or ``None`` if none exist."""
        oid = organization_id or self.organization_id
        if not oid:
            return None
        result = await self.db.execute(
            select(CustomerModel.id)
            .where(CustomerModel.organization_id == oid)
            .order_by(CustomerModel.created_at.asc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    # ------------------------------------------------------------------
    # Counterparties
    # ------------------------------------------------------------------

    async def list_counterparties(
        self, include_deleted: bool = False
    ) -> Sequence[Counterparty]:
        """Return all active (non-deleted) counterparties for the organization."""
        if not self.organization_id:
            raise NotFoundError("Organization not found.", code="resource.not_found")

        stmt = select(Counterparty).where(
            Counterparty.organization_id == self.organization_id
        )
        if not include_deleted:
            stmt = stmt.where(Counterparty.deleted_at.is_(None))
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_counterparty(self, request: CounterpartyCreate) -> Counterparty:
        """Create a new counterparty for the organization.

        Raises:
            ValidationError: Invalid ``type`` value.
        """
        if not self.organization_id:
            raise NotFoundError("Organization not found.", code="resource.not_found")
        try:
            cp_type = CounterpartyType(request.type.lower())
        except ValueError:
            raise ValidationError(
                f"Invalid counterparty type: {request.type}. Must be one of: customer, vendor, both.",
                code="validation.invalid_type",
                fields={"type": "Must be customer, vendor, or both"},
            )

        try:
            cp_id = str(uuid.uuid4())
            new_cp = Counterparty(
                id=cp_id,
                organization_id=self.organization_id,
                name=request.name,
                vat_number=request.vat_number,
                country=request.country,
                address_street=request.address_street,
                address_city=request.address_city,
                address_postal_code=request.address_postal_code,
                address_region=request.address_region,
                type=cp_type,
                contact_info=request.contact_info,
                default_category_id=(
                    str(request.default_category_id)
                    if request.default_category_id
                    else None
                ),
                registry_data=None,
            )
            self.db.add(new_cp)
            await self.db.commit()
            await self.db.refresh(new_cp)
            return new_cp

        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error creating counterparty: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")

    async def update_counterparty(
        self, counterparty_id: str, request: CounterpartyUpdate
    ) -> Counterparty:
        """Update a counterparty's details.

        Raises:
            NotFoundError: Counterparty does not exist or belongs to another org.
        """
        if not self.organization_id:
            raise NotFoundError("Organization not found.", code="resource.not_found")
        result = await self.db.execute(
            select(Counterparty).where(
                Counterparty.id == counterparty_id,
                Counterparty.organization_id == self.organization_id,
                Counterparty.deleted_at.is_(None),
            )
        )
        cp: Optional[Counterparty] = result.scalar_one_or_none()
        if not cp:
            raise NotFoundError("Counterparty not found.", code="resource.not_found")

        update_data: dict = {
            k: v
            for k, v in request.model_dump(exclude_unset=True).items()
            if v is not None
        }
        if "type" in update_data:
            try:
                update_data["type"] = CounterpartyType(update_data["type"].lower())
            except ValueError:
                raise ValidationError(
                    f"Invalid counterparty type: {update_data['type']}",
                    code="validation.invalid_type",
                    fields={"type": "Must be customer, vendor, or both"},
                )

        try:
            for key, value in update_data.items():
                setattr(cp, key, value)

            await self.db.commit()
            await self.db.refresh(cp)
            return cp
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error updating counterparty: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")

    async def delete_counterparty(self, counterparty_id: str) -> None:
        """Soft-delete a counterparty (sets ``deleted_at`` timestamp).

        Raises:
            NotFoundError: Counterparty does not exist or belongs to another org.
        """
        from app.core.security.hashing import now_utc

        if not self.organization_id:
            raise NotFoundError("Organization not found.", code="resource.not_found")
        result = await self.db.execute(
            select(Counterparty).where(
                Counterparty.id == counterparty_id,
                Counterparty.organization_id == self.organization_id,
                Counterparty.deleted_at.is_(None),
            )
        )
        cp: Optional[Counterparty] = result.scalar_one_or_none()
        if not cp:
            raise NotFoundError("Counterparty not found.", code="resource.not_found")

        try:
            cp.deleted_at = now_utc()
            await self.db.commit()
        except SQLAlchemyError as e:
            await self.db.rollback()
            logger.error("DB error deleting counterparty: %s", e)
            raise ExternalServiceError("Database error.", code="db.error")

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _fetch_gemi_data(self, vat_number: str) -> dict | None:
        """Attempt to fetch company registry data from GEMI for a Greek VAT number.

        Returns ``None`` if GEMI is unreachable or returns no results — never
        raises, so a GEMI failure never blocks organization setup.
        """
        try:
            from app.config import settings as _settings
            from app.clients.gemi_client import GemiApiClient

            client = GemiApiClient(api_key=_settings.GEMH_API_KEY)
            data = await client.search_companies_by_afm(vat_number)
            results = data.get("searchResults", [])
            if results:
                return results[0]
        except Exception as e:
            logger.warning("GEMI lookup failed for VAT %s: %s", vat_number, e)
        return None
