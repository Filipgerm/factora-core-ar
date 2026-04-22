"""HubSpot Pydantic DTOs — CRM v3 API + OAuth + Webhooks.

These models are intentionally *permissive* (``extra="allow"``) because
HubSpot evolves the ``properties`` bag per portal and per object type.
We name the fields we actively depend on and keep the raw ``properties``
dict for forward-compatibility. The ``HubspotClient`` returns these
directly; the ORM mapper in ``app.services.hubspot_sync_service`` reads
whichever fields it needs.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field


T = TypeVar("T")


class HubspotTokenResponse(BaseModel):
    """Raw response from ``POST /oauth/v1/token``."""

    access_token: str
    refresh_token: str | None = None
    expires_in: int  # seconds
    token_type: str | None = None

    model_config = ConfigDict(extra="allow")


class HubspotTokenInfo(BaseModel):
    """Response from ``GET /oauth/v1/access-tokens/{token}``.

    Used to resolve the HubSpot Portal (hub) id without a separate
    account-info call. ``hub_id`` uniquely identifies the tenant's
    HubSpot account.
    """

    hub_id: int = Field(..., description="HubSpot portal id — the tenant's account.")
    user: str | None = None
    user_id: int | None = None
    app_id: int | None = None
    hub_domain: str | None = None
    scopes: list[str] | None = None
    expires_in: int | None = None

    model_config = ConfigDict(extra="allow")


class HubspotAssociationTarget(BaseModel):
    """One association target inside ``HubspotObject.associations[<type>].results``."""

    id: str
    type: str | None = None

    model_config = ConfigDict(extra="allow")


class HubspotAssociationGroup(BaseModel):
    """One association group (e.g. the ``companies`` group on a Deal)."""

    results: list[HubspotAssociationTarget] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class _HubspotObjectBase(BaseModel):
    """Shared schema for CRM v3 object responses.

    ``properties`` is the source-of-truth raw bag. Typed accessor
    attributes (``dealname``, ``amount``, …) on the subclasses are
    derived from that bag during mapping.
    """

    id: str
    properties: dict[str, Any] = Field(default_factory=dict)
    associations: dict[str, HubspotAssociationGroup] = Field(default_factory=dict)
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    archived: bool | None = None

    model_config = ConfigDict(extra="allow", populate_by_name=True)


class HubspotDeal(_HubspotObjectBase):
    """``/crm/v3/objects/deals`` — primary revrec signal.

    Key properties we rely on: ``dealname``, ``amount``, ``closedate``,
    ``pipeline``, ``dealstage``, ``hs_is_closed_won``, ``hubspot_owner_id``,
    plus custom ``hs_arr``, ``hs_mrr``, ``hs_tcv``, ``hs_deal_stage_probability``
    when the portal populates them.
    """


class HubspotLineItem(_HubspotObjectBase):
    """``/crm/v3/objects/line_items`` — line-level pricing on a deal or quote.

    Revrec-relevant properties: ``name``, ``quantity``, ``price``,
    ``hs_total_discount``, ``amount``, ``hs_term_in_months``,
    ``hs_recurring_billing_period``, ``hs_billing_period``,
    ``hs_recurring_billing_start_date``, ``recurringbillingfrequency``,
    ``hs_product_id``.
    """


class HubspotProduct(_HubspotObjectBase):
    """``/crm/v3/objects/products`` — catalog SKUs referenced by line items."""


class HubspotQuote(_HubspotObjectBase):
    """``/crm/v3/objects/quotes`` — signed quote for a deal (CPQ)."""


class HubspotCompany(_HubspotObjectBase):
    """``/crm/v3/objects/companies`` — our ``Counterparty`` candidate."""


class HubspotFile(BaseModel):
    """``/files/v3/files/{id}`` — attached contract PDF / addendum / SOW."""

    id: str
    name: str | None = None
    url: str | None = None
    access: str | None = None
    path: str | None = None
    type: str | None = None
    extension: str | None = None
    size: int | None = None
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")

    model_config = ConfigDict(extra="allow", populate_by_name=True)


class HubspotAssociation(BaseModel):
    """``/crm/v4/associations/{from}/{to}`` result row."""

    from_object_type: str | None = None
    from_id: str | None = None
    to_id: str
    association_types: list[dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow", populate_by_name=True)


class HubspotPipelineStage(BaseModel):
    id: str
    label: str
    display_order: int | None = Field(default=None, alias="displayOrder")
    metadata: dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(extra="allow", populate_by_name=True)


class HubspotPipeline(BaseModel):
    id: str
    label: str
    stages: list[HubspotPipelineStage] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow", populate_by_name=True)


class HubspotPage(BaseModel, Generic[T]):
    """Generic page wrapper — ``{results: [...], paging: {next: {after}}}``."""

    results: list[T] = Field(default_factory=list)
    paging: dict[str, Any] | None = None

    model_config = ConfigDict(extra="allow")


# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------


HubspotEventType = Literal[
    "contact.creation",
    "contact.deletion",
    "contact.propertyChange",
    "company.creation",
    "company.deletion",
    "company.propertyChange",
    "deal.creation",
    "deal.deletion",
    "deal.propertyChange",
    "deal.merge",
    "line_item.creation",
    "line_item.deletion",
    "line_item.propertyChange",
    "quote.creation",
    "quote.deletion",
    "quote.propertyChange",
    "product.creation",
    "product.deletion",
    "product.propertyChange",
    "object.creation",
    "object.deletion",
    "object.propertyChange",
]


class HubspotWebhookEvent(BaseModel):
    """One element of a HubSpot webhook batch payload.

    HubSpot delivers arrays of these; the event type identifies what
    happened. We dispatch by ``subscriptionType`` (our normalized
    ``event_type`` field) inside ``HubspotSyncService``.
    """

    event_id: int = Field(..., alias="eventId")
    subscription_id: int = Field(..., alias="subscriptionId")
    portal_id: int = Field(..., alias="portalId")
    app_id: int | None = Field(default=None, alias="appId")
    occurred_at: int = Field(..., alias="occurredAt")
    subscription_type: str = Field(..., alias="subscriptionType")
    attempt_number: int | None = Field(default=None, alias="attemptNumber")
    object_id: int | None = Field(default=None, alias="objectId")
    change_source: str | None = Field(default=None, alias="changeSource")
    change_flag: str | None = Field(default=None, alias="changeFlag")
    property_name: str | None = Field(default=None, alias="propertyName")
    property_value: Any | None = Field(default=None, alias="propertyValue")
    source_id: str | None = Field(default=None, alias="sourceId")

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    @property
    def object_type(self) -> str:
        """Extract the object type from ``subscription_type`` (``deal.creation`` → ``deal``)."""
        return (self.subscription_type or "").split(".")[0]

    @property
    def action(self) -> str:
        """Extract the action (``creation``, ``deletion``, ``propertyChange``, …)."""
        parts = (self.subscription_type or "").split(".")
        return parts[1] if len(parts) > 1 else ""
