"""OrganizationController — bridges HTTP routes and business logic."""

from __future__ import annotations

from uuid import UUID

from app.services.organization_service import OrganizationService
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
        return await self.service.setup_organization(user_id, request)

    async def get_organization(self, organization_id: str) -> BusinessResponse:
        """
        Retrieve the organization profile for the authenticated user.

        Args:
            organization_id: The UUID of the user's organization

        Returns:
            BusinessResponse: The requested organization profile

        Raises:
            NotFoundError: If the organization does not exist
        """
        return await self.service.get_organization(organization_id)

    async def list_counterparties(
        self, organization_id: str
    ) -> list[CounterpartyResponse]:
        """
        List all active counterparties for a specific organization.

        Args:
            organization_id: The UUID of the organization

        Returns:
            list[CounterpartyResponse]: A list of active counterparties (vendors/customers)
        """
        return await self.service.list_counterparties(organization_id)

    async def create_counterparty(
        self, organization_id: str, request: CounterpartyCreate
    ) -> CounterpartyResponse:
        """
        Create a new counterparty for the organization.

        Args:
            organization_id: The UUID of the organization creating the counterparty
            request: The counterparty details (name, VAT, type, etc.)

        Returns:
            CounterpartyResponse: The newly created counterparty

        Raises:
            ValidationError: If the counterparty type is invalid
            ExternalServiceError: If the database operation fails
        """
        return await self.service.create_counterparty(organization_id, request)

    async def update_counterparty(
        self, organization_id: str, counterparty_id: str, request: CounterpartyUpdate
    ) -> CounterpartyResponse:
        """
        Update an existing counterparty's details.

        Args:
            organization_id: The UUID of the organization
            counterparty_id: The UUID of the counterparty to update
            request: The fields to partially update

        Returns:
            CounterpartyResponse: The updated counterparty record

        Raises:
            NotFoundError: If the counterparty does not exist or belongs to another org
            ValidationError: If the provided type is invalid
            ExternalServiceError: If the database operation fails
        """
        return await self.service.update_counterparty(
            organization_id, counterparty_id, request
        )

    async def delete_counterparty(
        self, organization_id: str, counterparty_id: str
    ) -> None:
        """
        Soft-delete a counterparty from the organization.

        Args:
            organization_id: The UUID of the organization
            counterparty_id: The UUID of the counterparty to delete

        Returns:
            None

        Raises:
            NotFoundError: If the counterparty does not exist or belongs to another org
            ExternalServiceError: If the database operation fails
        """
        await self.service.delete_counterparty(organization_id, counterparty_id)
