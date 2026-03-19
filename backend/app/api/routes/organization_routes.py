"""Organization and counterparty routes.

All endpoints live under the ``/v1/organization`` prefix.

Organization endpoints:
  - ``POST /``    — initial organization setup (once per user)
  - ``GET /me``   — fetch the authenticated user's organization profile

Counterparty endpoints:
  - ``GET    /counterparties``          — list counterparties
  - ``POST   /counterparties``          — create a counterparty
  - ``PUT    /counterparties/{id}``     — update a counterparty
  - ``DELETE /counterparties/{id}``     — soft-delete a counterparty
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.dependencies import AuthUser, CurrentOrgId, OrgCtrl, require_role
from app.db.models.identity import UserRole
from app.models.organization import (
    BusinessResponse,
    CounterpartyCreate,
    CounterpartyResponse,
    CounterpartyUpdate,
    OrganizationSetupRequest,
)

router = APIRouter(tags=["Organization"])


# ---------------------------------------------------------------------------
# Organization
# ---------------------------------------------------------------------------


@router.post(
    "/",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Set up organization for the current user",
)
async def setup_organization(
    req: OrganizationSetupRequest,
    user: AuthUser,
    org_controller: OrgCtrl,
) -> BusinessResponse:
    """Create an organization and link it to the authenticated user.

    If the country is ``GR`` and a valid VAT number is provided, the backend
    will attempt to auto-populate ``registry_data`` from the GEMI registry.

    Can only be called once per user.  Subsequent calls return 409.
    """
    return await org_controller.setup_organization(user["sub"], req)


@router.get(
    "/me",
    response_model=BusinessResponse,
    summary="Get current user's organization profile",
)
async def get_organization(
    _org_id: CurrentOrgId,  # Ensures user has org; org_id comes from JWT via DI
    org_controller: OrgCtrl,
) -> BusinessResponse:
    """Return the authenticated user's organization profile."""
    return await org_controller.get_organization()


# ---------------------------------------------------------------------------
# Counterparties
# ---------------------------------------------------------------------------


@router.get(
    "/counterparties",
    response_model=list[CounterpartyResponse],
    summary="List all counterparties for the organization",
)
async def list_counterparties(
    _org_id: CurrentOrgId,  # Ensures user has org
    org_controller: OrgCtrl,
) -> list[CounterpartyResponse]:
    """Return all active (non-deleted) counterparties for the organization."""
    return await org_controller.list_counterparties()


@router.post(
    "/counterparties",
    response_model=CounterpartyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a counterparty",
    dependencies=[Depends(require_role(UserRole.OWNER, UserRole.ADMIN))],
)
async def create_counterparty(
    req: CounterpartyCreate,
    _org_id: CurrentOrgId,  # Ensures user has org
    org_controller: OrgCtrl,
) -> CounterpartyResponse:
    """Create a new customer, vendor, or both."""
    return await org_controller.create_counterparty(req)


@router.put(
    "/counterparties/{counterparty_id}",
    response_model=CounterpartyResponse,
    summary="Update a counterparty",
    dependencies=[Depends(require_role(UserRole.OWNER, UserRole.ADMIN))],
)
async def update_counterparty(
    counterparty_id: UUID,
    req: CounterpartyUpdate,
    _org_id: CurrentOrgId,  # Ensures user has org
    org_controller: OrgCtrl,
) -> CounterpartyResponse:
    """Update a counterparty's fields (partial update)."""
    return await org_controller.update_counterparty(str(counterparty_id), req)


@router.delete(
    "/counterparties/{counterparty_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete a counterparty",
    dependencies=[Depends(require_role(UserRole.OWNER, UserRole.ADMIN))],
)
async def delete_counterparty(
    counterparty_id: UUID,
    _org_id: CurrentOrgId,  # Ensures user has org
    org_controller: OrgCtrl,
) -> None:
    """Soft-delete a counterparty (sets ``deleted_at``; data is preserved)."""
    await org_controller.delete_counterparty(str(counterparty_id))
