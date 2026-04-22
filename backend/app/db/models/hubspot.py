"""HubSpot CRM mirror tables (multi-tenant).

Scope
-----
Rows mirror HubSpot CRM v3 objects that feed our revenue-recognition
pipeline: Deals, Line Items, Quotes, Products, Companies, Associations,
Files. Plus a ``HubspotConnection`` row per (organization, portal) so
each tenant's OAuth credentials are isolated.

Contract
--------
Every row is scoped by ``organization_id``. External identity is the
``hubspot_id`` string (HubSpot returns numeric ids but serializes them
as strings — we store them verbatim). ``raw_object`` is the last
webhook / sync payload for auditability and forward-compatible property
reads — the bridge services read from this when they need a field we
haven't pulled into a typed column.

Architectural notes
-------------------
* Associations are stored *both* in a dedicated ``HubspotAssociation``
  row **and** as denormalised FKs (``deal_hubspot_id`` on
  ``HubspotLineItem``, etc.) because HubSpot's tree is deeply nested
  and the denorm lets the ``HubspotContractBridgeService`` assemble a
  deal + lines + quote in a single query.
* We intentionally do NOT mirror the native HubSpot "Contracts" object
  (``/crm/v3/objects/contracts``) here. That object is a document /
  legal-agreement container in Service Hub — see the research note on
  the PR description. Our canonical contract lives in
  ``app.db.models.contracts.Contract``; HubSpot Deals + Line Items feed
  it via ``HubspotContractBridgeService``.

Security
--------
* ``refresh_token_encrypted`` + ``access_token_encrypted`` are Fernet
  ciphertexts using ``GMAIL_TOKEN_ENCRYPTION_KEY`` (shared at-rest key
  for OAuth tokens across integrations).
* ``webhook_secret`` never lives on a per-tenant row — it's the dev app
  secret from ``settings.HUBSPOT_CLIENT_SECRET``.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models._utils import utcnow


# ---------------------------------------------------------------------------
# Connection (per tenant ↔ HubSpot portal)
# ---------------------------------------------------------------------------


class HubspotConnection(Base):
    """A tenant's HubSpot OAuth linkage to a Portal (hub)."""

    __tablename__ = "hubspot_connections"

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_by_user_id: Mapped[str | None] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    hub_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    hub_domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    scopes: Mapped[str | None] = mapped_column(Text, nullable=True)

    access_token_encrypted: Mapped[str] = mapped_column(String(4096), nullable=False)
    refresh_token_encrypted: Mapped[str] = mapped_column(String(4096), nullable=False)
    access_token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    disconnected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_webhook_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    extra: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "hub_id", name="uq_hubspot_conn_org_hub"
        ),
        Index(
            "ix_hubspot_conn_org_active",
            "organization_id",
            postgresql_where=text("disconnected_at IS NULL"),
        ),
    )


# ---------------------------------------------------------------------------
# Base class for HubSpot CRM mirror tables
# ---------------------------------------------------------------------------


class _HubspotOrgScoped(Base):
    """Shared columns for HubSpot mirror tables."""

    __abstract__ = True

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hub_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    hubspot_id: Mapped[str] = mapped_column(String(64), nullable=False)
    properties: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw_object: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    hubspot_created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    hubspot_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    archived: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )


# ---------------------------------------------------------------------------
# CRM objects
# ---------------------------------------------------------------------------


class HubspotCompany(_HubspotOrgScoped):
    """HubSpot Company — our ``Counterparty`` candidate.

    Linked to :class:`app.db.models.counterparty.Counterparty` via
    ``counterparty_id`` once matched. The matcher service lives in
    ``app.services.hubspot_company_matcher`` (mirrors the Stripe flow).
    """

    __tablename__ = "hubspot_companies"

    name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    industry: Mapped[str | None] = mapped_column(String(128), nullable=True)
    vat_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    annual_revenue: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    number_of_employees: Mapped[int | None] = mapped_column(Integer, nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    lifecycle_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)

    counterparty_id: Mapped[str | None] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("counterparties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_companies_org_hsid"
        ),
        Index("ix_hubspot_companies_domain", "organization_id", "domain"),
        Index("ix_hubspot_companies_vat", "organization_id", "vat_id"),
    )


class HubspotProduct(_HubspotOrgScoped):
    """HubSpot Product — catalog SKU referenced by line items."""

    __tablename__ = "hubspot_products"

    name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sku: Mapped[str | None] = mapped_column(String(128), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    recurring_billing_period: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recurring_billing_frequency: Mapped[str | None] = mapped_column(
        String(32), nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_products_org_hsid"
        ),
        Index("ix_hubspot_products_sku", "organization_id", "sku"),
    )


class HubspotDeal(_HubspotOrgScoped):
    """HubSpot Deal — the primary revrec signal.

    One deal → one ``Contract`` (source=``HUBSPOT_DEAL``) via the
    bridge service. The contract's performance obligations come from
    the deal's associated :class:`HubspotLineItem`s.
    """

    __tablename__ = "hubspot_deals"

    name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    amount: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    pipeline: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stage_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_closed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    is_closed_won: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    close_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    mrr: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    arr: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    tcv: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    acv: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Denormalised primary association — the deal's "main" company.
    # Also materialised in HubspotAssociation for completeness.
    primary_company_hubspot_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_deals_org_hsid"
        ),
        Index(
            "ix_hubspot_deals_org_closedate",
            "organization_id",
            "close_date",
        ),
        Index(
            "ix_hubspot_deals_org_stage",
            "organization_id",
            "pipeline",
            "stage",
        ),
    )


class HubspotLineItem(_HubspotOrgScoped):
    """HubSpot Line Item — one PO candidate per row.

    ``deal_hubspot_id`` / ``quote_hubspot_id`` are denormalised from the
    v4 associations so the bridge can query the full deal composition
    in a single SQL call.
    """

    __tablename__ = "hubspot_line_items"

    name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sku: Mapped[str | None] = mapped_column(String(128), nullable=True)
    product_hubspot_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    quantity: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    price: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    amount: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    total_discount: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)

    term_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recurring_billing_period: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recurring_billing_frequency: Mapped[str | None] = mapped_column(String(32), nullable=True)
    recurring_billing_start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    recurring_billing_end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    billing_period: Mapped[str | None] = mapped_column(String(32), nullable=True)

    deal_hubspot_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )
    quote_hubspot_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_lineitems_org_hsid"
        ),
        Index(
            "ix_hubspot_lineitems_org_deal",
            "organization_id",
            "deal_hubspot_id",
        ),
    )


class HubspotQuote(_HubspotOrgScoped):
    """HubSpot Quote — signed CPQ document. Optional artifact for contracts."""

    __tablename__ = "hubspot_quotes"

    title: Mapped[str | None] = mapped_column(String(512), nullable=True)
    status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expiration_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    amount: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    esign_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    public_url_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    pdf_download_link: Mapped[str | None] = mapped_column(Text, nullable=True)

    deal_hubspot_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_quotes_org_hsid"
        ),
    )


class HubspotAssociation(Base):
    """Materialised HubSpot v4 association (from → to).

    One row per labeled association between two CRM objects. The
    ``association_type_id`` distinguishes primary/secondary associations
    — HubSpot returns multiple type ids per association path.
    """

    __tablename__ = "hubspot_associations"

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    from_object_type: Mapped[str] = mapped_column(String(32), nullable=False)
    from_hubspot_id: Mapped[str] = mapped_column(String(64), nullable=False)
    to_object_type: Mapped[str] = mapped_column(String(32), nullable=False)
    to_hubspot_id: Mapped[str] = mapped_column(String(64), nullable=False)
    association_type_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    label: Mapped[str | None] = mapped_column(String(128), nullable=True)
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "from_object_type",
            "from_hubspot_id",
            "to_object_type",
            "to_hubspot_id",
            "association_type_id",
            name="uq_hubspot_assoc",
        ),
        Index(
            "ix_hubspot_assoc_from",
            "organization_id",
            "from_object_type",
            "from_hubspot_id",
        ),
        Index(
            "ix_hubspot_assoc_to",
            "organization_id",
            "to_object_type",
            "to_hubspot_id",
        ),
    )


class HubspotFile(Base):
    """HubSpot File attached to a deal / quote (contract PDF, SOW, etc.).

    Not derived from ``_HubspotOrgScoped`` because Files live in a
    separate API namespace and don't expose the ``properties`` bag.
    """

    __tablename__ = "hubspot_files"

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    hubspot_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    extension: Mapped[str | None] = mapped_column(String(16), nullable=True)
    size: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    raw_object: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_files_org_hsid"
        ),
    )
