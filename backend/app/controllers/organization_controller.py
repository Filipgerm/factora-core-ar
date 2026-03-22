"""OrganizationController — bridges HTTP routes and business logic."""

from __future__ import annotations

from uuid import UUID

from app.services.organization_service import OrganizationService
from app.db.models.identity import Organization
from app.db.models.counterparty import Counterparty
from app.models.organization import (
    BusinessResponse,
    CounterpartyCreate,
    CounterpartyResponse,
    CounterpartyUpdate,
    OrganizationSetupRequest,
)


class OrganizationController:
    """
    Controller for organization and counterparty operations.

    Acts as the orchestration layer between FastAPI routing and the
    core business logic defined in the OrganizationService.
    """

    def __init__(self, org_service: OrganizationService) -> None:
        """
        Initialize the OrganizationController.

        Args:
            org_service: The business logic service for organizations.
        """
        self.service = org_service

    def _map_org_to_response(
        self,
        org: Organization,
        *,
        saltedge_customer_id: str | None = None,
    ) -> BusinessResponse:
        """Helper to map Organization ORM to BusinessResponse DTO."""
        return BusinessResponse(
            organization_id=UUID(org.id),
            name=org.name,
            vat_number=org.vat_number,
            country=org.country,
            registry_data=org.registry_data,
            saltedge_customer_id=saltedge_customer_id,
        )

    def _map_counterparty_to_response(self, cp: Counterparty) -> CounterpartyResponse:
        """Helper to map Counterparty ORM to CounterpartyResponse DTO."""
        return CounterpartyResponse(
            id=UUID(cp.id),
            organization_id=UUID(cp.organization_id),
            name=cp.name,
            vat_number=cp.vat_number,
            country=cp.country,
            address_street=cp.address_street,
            address_city=cp.address_city,
            address_postal_code=cp.address_postal_code,
            address_region=cp.address_region,
            type=cp.type.value if hasattr(cp.type, "value") else str(cp.type),
            contact_info=cp.contact_info,
            default_category_id=(
                UUID(cp.default_category_id) if cp.default_category_id else None
            ),
            registry_data=cp.registry_data,
            created_at=cp.created_at,
            updated_at=cp.updated_at,
        )

    async def setup_organization(
        self, user_id: str, request: OrganizationSetupRequest
    ) -> BusinessResponse:
        """
        Set up a new organization and link it to the current user.

        Args:
            user_id: The UUID of the authenticated user
            request: Organization setup payload including VAT and country

        Returns:
            BusinessResponse: The created organization profile

        Raises:
            NotFoundError: If the user does not exist
            ConflictError: If the user already belongs to an organization, or VAT conflicts
            ExternalServiceError: If the database operation fails
        """
        org_model = await self.service.setup_organization(user_id, request)
        cid = await self.service.get_primary_saltedge_customer_id(
            organization_id=org_model.id
        )
        return self._map_org_to_response(org_model, saltedge_customer_id=cid)

    async def get_organization(self) -> BusinessResponse:
        """
        Retrieve the organization profile for the authenticated user.

        Returns:
            BusinessResponse: The requested organization profile

        Raises:
            NotFoundError: If the organization does not exist
        """
        org_model = await self.service.get_organization()
        cid = await self.service.get_primary_saltedge_customer_id()
        return self._map_org_to_response(org_model, saltedge_customer_id=cid)

    async def list_counterparties(self) -> list[CounterpartyResponse]:
        """
        List all active counterparties for a specific organization.

        Returns:
            list[CounterpartyResponse]: A list of active counterparties (vendors/customers)
        """
        cp_models = await self.service.list_counterparties()
        return [self._map_counterparty_to_response(cp) for cp in cp_models]

    async def create_counterparty(
        self, request: CounterpartyCreate
    ) -> CounterpartyResponse:
        """
        Create a new counterparty for the organization.

        Args:
            request: The counterparty details (name, VAT, type, etc.)

        Returns:
            CounterpartyResponse: The newly created counterparty

        Raises:
            ValidationError: If the counterparty type is invalid
            ExternalServiceError: If the database operation fails
        """
        cp_model = await self.service.create_counterparty(request)
        return self._map_counterparty_to_response(cp_model)

    async def update_counterparty(
        self, counterparty_id: str, request: CounterpartyUpdate
    ) -> CounterpartyResponse:
        """
        Update an existing counterparty's details.

        Args:
            counterparty_id: The UUID of the counterparty to update
            request: The fields to partially update

        Returns:
            CounterpartyResponse: The updated counterparty record

        Raises:
            NotFoundError: If the counterparty does not exist or belongs to another org
            ValidationError: If the provided type is invalid
            ExternalServiceError: If the database operation fails
        """
        cp_model = await self.service.update_counterparty(counterparty_id, request)
        return self._map_counterparty_to_response(cp_model)

    async def delete_counterparty(self, counterparty_id: str) -> None:
        """
        Soft-delete a counterparty from the organization.

        Args:
            counterparty_id: The UUID of the counterparty to delete

        Returns:
            None

        Raises:
            NotFoundError: If the counterparty does not exist or belongs to another org
            ExternalServiceError: If the database operation fails
        """
        await self.service.delete_counterparty(counterparty_id)
