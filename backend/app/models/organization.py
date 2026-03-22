"""Pydantic request and response schemas for organization and counterparty endpoints."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Organization
# ---------------------------------------------------------------------------


class OrganizationSetupRequest(BaseModel):
    """Payload to create an organization after sign-up.

    If ``country`` is ``"GR"`` and a ``vat_number`` is provided, the backend
    will auto-fetch company data from the GEMI registry.
    """

    name: str = Field(..., min_length=1, max_length=255)
    vat_number: str = Field(..., min_length=5, max_length=30)
    country: str = Field(..., min_length=2, max_length=2, description="ISO 3166-1 alpha-2 country code")


class BusinessResponse(BaseModel):
    """Organization profile returned after setup or on GET /organization/me.

    ``saltedge_customer_id`` is the oldest SaltEdge ``customers`` row for this
    tenant (by ``created_at``). When multiple customers exist, the API still
    returns this single canonical id so dashboards can call P&L endpoints
    without guessing; use ``GET /v1/saltedge/customers`` when the user must pick another customer.
    """

    organization_id: UUID
    name: str
    vat_number: str
    country: str
    registry_data: dict | None = None
    saltedge_customer_id: str | None = None

    model_config = {"from_attributes": True}


class SwitchOrganizationRequest(BaseModel):
    organization_id: UUID


class SwitchOrganizationResponse(BaseModel):
    """New access JWT after switching active organization (refresh token unchanged)."""

    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user_id: UUID
    username: str
    email: EmailStr
    role: str
    organization_id: UUID | None = None
    email_verified: bool = False
    phone_verified: bool = False


class UserOrganizationMembershipItem(BaseModel):
    organization_id: UUID
    name: str
    vat_number: str
    country: str
    role: str
    is_current: bool


# ---------------------------------------------------------------------------
# Counterparty
# ---------------------------------------------------------------------------


class CounterpartyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    vat_number: str | None = None
    country: str | None = Field(None, min_length=2, max_length=2)
    address_street: str | None = None
    address_city: str | None = None
    address_postal_code: str | None = None
    address_region: str | None = None
    type: str = Field(..., description="CUSTOMER | VENDOR | BOTH")
    contact_info: dict | None = None
    default_category_id: UUID | None = None


class CounterpartyUpdate(BaseModel):
    name: str | None = None
    vat_number: str | None = None
    country: str | None = None
    address_street: str | None = None
    address_city: str | None = None
    address_postal_code: str | None = None
    address_region: str | None = None
    type: str | None = None
    contact_info: dict | None = None
    default_category_id: UUID | None = None


class CounterpartyResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    vat_number: str | None
    country: str | None
    address_street: str | None
    address_city: str | None
    address_postal_code: str | None
    address_region: str | None
    type: str
    contact_info: dict | None
    default_category_id: UUID | None
    registry_data: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
