"""HubSpot CRM mirror tables + OAuth connection.

Adds the tables backing the HubSpot P1 integration:
    * ``hubspot_connections`` — one per (organization, portal) with
      encrypted OAuth tokens.
    * ``hubspot_companies``   — mirror of ``/crm/v3/objects/companies``
      + FK to ``counterparties`` for Counterparty matching.
    * ``hubspot_products``    — mirror of ``/crm/v3/objects/products``.
    * ``hubspot_deals``       — mirror of ``/crm/v3/objects/deals`` — the
      primary revrec signal.
    * ``hubspot_line_items``  — mirror of ``/crm/v3/objects/line_items``
      with denormalised ``deal_hubspot_id`` / ``quote_hubspot_id`` so
      the bridge can assemble a contract in one query.
    * ``hubspot_quotes``      — mirror of ``/crm/v3/objects/quotes``.
    * ``hubspot_associations``— materialised v4 associations
      (deal ↔ company / line_item / quote).
    * ``hubspot_files``       — attached documents (contract PDFs,
      SOW scans).

All tables are scoped by ``organization_id`` and carry a ``raw_object``
JSONB for forward-compat property reads.

Revision ID: x5y6z7a8b9c0
Revises: w4x5y6z7a8b9
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "x5y6z7a8b9c0"
down_revision = "w4x5y6z7a8b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hubspot_connections",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("hub_id", sa.BigInteger(), nullable=False),
        sa.Column("hub_domain", sa.String(length=255), nullable=True),
        sa.Column("scopes", sa.Text(), nullable=True),
        sa.Column("access_token_encrypted", sa.String(length=4096), nullable=False),
        sa.Column("refresh_token_encrypted", sa.String(length=4096), nullable=False),
        sa.Column(
            "access_token_expires_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            "connected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_webhook_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("extra", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.UniqueConstraint("organization_id", "hub_id", name="uq_hubspot_conn_org_hub"),
    )
    op.create_index(
        "ix_hubspot_connections_organization_id",
        "hubspot_connections",
        ["organization_id"],
    )
    op.create_index(
        "ix_hubspot_conn_org_active",
        "hubspot_connections",
        ["organization_id"],
        postgresql_where=sa.text("disconnected_at IS NULL"),
    )

    # ---- Shared scaffold for CRM object tables ------------------------
    crm_columns = lambda: [
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("hub_id", sa.BigInteger(), nullable=False),
        sa.Column("hubspot_id", sa.String(length=64), nullable=False),
        sa.Column("properties", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("raw_object", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("hubspot_created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("hubspot_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "archived", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    ]

    # ---- Companies ----------------------------------------------------
    op.create_table(
        "hubspot_companies",
        *crm_columns(),
        sa.Column("name", sa.String(length=512), nullable=True),
        sa.Column("domain", sa.String(length=255), nullable=True),
        sa.Column("country", sa.String(length=128), nullable=True),
        sa.Column("industry", sa.String(length=128), nullable=True),
        sa.Column("vat_id", sa.String(length=64), nullable=True),
        sa.Column("annual_revenue", sa.Numeric(18, 2), nullable=True),
        sa.Column("number_of_employees", sa.Integer(), nullable=True),
        sa.Column("owner_id", sa.String(length=64), nullable=True),
        sa.Column("lifecycle_stage", sa.String(length=64), nullable=True),
        sa.Column(
            "counterparty_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("counterparties.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_companies_org_hsid"
        ),
    )
    op.create_index(
        "ix_hubspot_companies_organization_id", "hubspot_companies", ["organization_id"]
    )
    op.create_index("ix_hubspot_companies_hub_id", "hubspot_companies", ["hub_id"])
    op.create_index(
        "ix_hubspot_companies_counterparty_id",
        "hubspot_companies",
        ["counterparty_id"],
    )
    op.create_index(
        "ix_hubspot_companies_domain", "hubspot_companies", ["organization_id", "domain"]
    )
    op.create_index(
        "ix_hubspot_companies_vat", "hubspot_companies", ["organization_id", "vat_id"]
    )

    # ---- Products -----------------------------------------------------
    op.create_table(
        "hubspot_products",
        *crm_columns(),
        sa.Column("name", sa.String(length=512), nullable=True),
        sa.Column("sku", sa.String(length=128), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("price", sa.Numeric(18, 4), nullable=True),
        sa.Column("recurring_billing_period", sa.String(length=32), nullable=True),
        sa.Column("recurring_billing_frequency", sa.String(length=32), nullable=True),
        sa.UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_products_org_hsid"
        ),
    )
    op.create_index(
        "ix_hubspot_products_organization_id", "hubspot_products", ["organization_id"]
    )
    op.create_index("ix_hubspot_products_hub_id", "hubspot_products", ["hub_id"])
    op.create_index(
        "ix_hubspot_products_sku", "hubspot_products", ["organization_id", "sku"]
    )

    # ---- Deals --------------------------------------------------------
    op.create_table(
        "hubspot_deals",
        *crm_columns(),
        sa.Column("name", sa.String(length=512), nullable=True),
        sa.Column("amount", sa.Numeric(18, 2), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("pipeline", sa.String(length=64), nullable=True),
        sa.Column("stage", sa.String(length=64), nullable=True),
        sa.Column("stage_label", sa.String(length=255), nullable=True),
        sa.Column("is_closed", sa.Boolean(), nullable=True),
        sa.Column("is_closed_won", sa.Boolean(), nullable=True),
        sa.Column("close_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("mrr", sa.Numeric(18, 2), nullable=True),
        sa.Column("arr", sa.Numeric(18, 2), nullable=True),
        sa.Column("tcv", sa.Numeric(18, 2), nullable=True),
        sa.Column("acv", sa.Numeric(18, 2), nullable=True),
        sa.Column("owner_id", sa.String(length=64), nullable=True),
        sa.Column(
            "primary_company_hubspot_id", sa.String(length=64), nullable=True
        ),
        sa.UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_deals_org_hsid"
        ),
    )
    op.create_index(
        "ix_hubspot_deals_organization_id", "hubspot_deals", ["organization_id"]
    )
    op.create_index("ix_hubspot_deals_hub_id", "hubspot_deals", ["hub_id"])
    op.create_index(
        "ix_hubspot_deals_primary_company",
        "hubspot_deals",
        ["primary_company_hubspot_id"],
    )
    op.create_index(
        "ix_hubspot_deals_org_closedate",
        "hubspot_deals",
        ["organization_id", "close_date"],
    )
    op.create_index(
        "ix_hubspot_deals_org_stage",
        "hubspot_deals",
        ["organization_id", "pipeline", "stage"],
    )

    # ---- Line items ---------------------------------------------------
    op.create_table(
        "hubspot_line_items",
        *crm_columns(),
        sa.Column("name", sa.String(length=512), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sku", sa.String(length=128), nullable=True),
        sa.Column("product_hubspot_id", sa.String(length=64), nullable=True),
        sa.Column("quantity", sa.Numeric(18, 4), nullable=True),
        sa.Column("price", sa.Numeric(18, 4), nullable=True),
        sa.Column("amount", sa.Numeric(18, 4), nullable=True),
        sa.Column("total_discount", sa.Numeric(18, 4), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("term_months", sa.Integer(), nullable=True),
        sa.Column("recurring_billing_period", sa.String(length=32), nullable=True),
        sa.Column("recurring_billing_frequency", sa.String(length=32), nullable=True),
        sa.Column(
            "recurring_billing_start_date",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "recurring_billing_end_date", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("billing_period", sa.String(length=32), nullable=True),
        sa.Column("deal_hubspot_id", sa.String(length=64), nullable=True),
        sa.Column("quote_hubspot_id", sa.String(length=64), nullable=True),
        sa.UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_lineitems_org_hsid"
        ),
    )
    op.create_index(
        "ix_hubspot_line_items_organization_id",
        "hubspot_line_items",
        ["organization_id"],
    )
    op.create_index("ix_hubspot_line_items_hub_id", "hubspot_line_items", ["hub_id"])
    op.create_index(
        "ix_hubspot_line_items_product",
        "hubspot_line_items",
        ["product_hubspot_id"],
    )
    op.create_index(
        "ix_hubspot_line_items_deal",
        "hubspot_line_items",
        ["deal_hubspot_id"],
    )
    op.create_index(
        "ix_hubspot_line_items_quote",
        "hubspot_line_items",
        ["quote_hubspot_id"],
    )
    op.create_index(
        "ix_hubspot_lineitems_org_deal",
        "hubspot_line_items",
        ["organization_id", "deal_hubspot_id"],
    )

    # ---- Quotes -------------------------------------------------------
    op.create_table(
        "hubspot_quotes",
        *crm_columns(),
        sa.Column("title", sa.String(length=512), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=True),
        sa.Column("expiration_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("amount", sa.Numeric(18, 2), nullable=True),
        sa.Column("esign_status", sa.String(length=64), nullable=True),
        sa.Column("public_url_key", sa.String(length=128), nullable=True),
        sa.Column("pdf_download_link", sa.Text(), nullable=True),
        sa.Column("deal_hubspot_id", sa.String(length=64), nullable=True),
        sa.UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_quotes_org_hsid"
        ),
    )
    op.create_index(
        "ix_hubspot_quotes_organization_id", "hubspot_quotes", ["organization_id"]
    )
    op.create_index("ix_hubspot_quotes_hub_id", "hubspot_quotes", ["hub_id"])
    op.create_index(
        "ix_hubspot_quotes_deal", "hubspot_quotes", ["deal_hubspot_id"]
    )

    # ---- Associations -------------------------------------------------
    op.create_table(
        "hubspot_associations",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("from_object_type", sa.String(length=32), nullable=False),
        sa.Column("from_hubspot_id", sa.String(length=64), nullable=False),
        sa.Column("to_object_type", sa.String(length=32), nullable=False),
        sa.Column("to_hubspot_id", sa.String(length=64), nullable=False),
        sa.Column("association_type_id", sa.Integer(), nullable=True),
        sa.Column("label", sa.String(length=128), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "organization_id",
            "from_object_type",
            "from_hubspot_id",
            "to_object_type",
            "to_hubspot_id",
            "association_type_id",
            name="uq_hubspot_assoc",
        ),
    )
    op.create_index(
        "ix_hubspot_associations_organization_id",
        "hubspot_associations",
        ["organization_id"],
    )
    op.create_index(
        "ix_hubspot_assoc_from",
        "hubspot_associations",
        ["organization_id", "from_object_type", "from_hubspot_id"],
    )
    op.create_index(
        "ix_hubspot_assoc_to",
        "hubspot_associations",
        ["organization_id", "to_object_type", "to_hubspot_id"],
    )

    # ---- Files --------------------------------------------------------
    op.create_table(
        "hubspot_files",
        sa.Column("id", postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("hubspot_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=512), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("extension", sa.String(length=16), nullable=True),
        sa.Column("size", sa.BigInteger(), nullable=True),
        sa.Column("raw_object", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint(
            "organization_id", "hubspot_id", name="uq_hubspot_files_org_hsid"
        ),
    )
    op.create_index(
        "ix_hubspot_files_organization_id", "hubspot_files", ["organization_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_hubspot_files_organization_id", table_name="hubspot_files")
    op.drop_table("hubspot_files")

    op.drop_index("ix_hubspot_assoc_to", table_name="hubspot_associations")
    op.drop_index("ix_hubspot_assoc_from", table_name="hubspot_associations")
    op.drop_index(
        "ix_hubspot_associations_organization_id", table_name="hubspot_associations"
    )
    op.drop_table("hubspot_associations")

    op.drop_index("ix_hubspot_quotes_deal", table_name="hubspot_quotes")
    op.drop_index("ix_hubspot_quotes_hub_id", table_name="hubspot_quotes")
    op.drop_index("ix_hubspot_quotes_organization_id", table_name="hubspot_quotes")
    op.drop_table("hubspot_quotes")

    op.drop_index("ix_hubspot_lineitems_org_deal", table_name="hubspot_line_items")
    op.drop_index("ix_hubspot_line_items_quote", table_name="hubspot_line_items")
    op.drop_index("ix_hubspot_line_items_deal", table_name="hubspot_line_items")
    op.drop_index("ix_hubspot_line_items_product", table_name="hubspot_line_items")
    op.drop_index("ix_hubspot_line_items_hub_id", table_name="hubspot_line_items")
    op.drop_index(
        "ix_hubspot_line_items_organization_id", table_name="hubspot_line_items"
    )
    op.drop_table("hubspot_line_items")

    op.drop_index("ix_hubspot_deals_org_stage", table_name="hubspot_deals")
    op.drop_index("ix_hubspot_deals_org_closedate", table_name="hubspot_deals")
    op.drop_index("ix_hubspot_deals_primary_company", table_name="hubspot_deals")
    op.drop_index("ix_hubspot_deals_hub_id", table_name="hubspot_deals")
    op.drop_index("ix_hubspot_deals_organization_id", table_name="hubspot_deals")
    op.drop_table("hubspot_deals")

    op.drop_index("ix_hubspot_products_sku", table_name="hubspot_products")
    op.drop_index("ix_hubspot_products_hub_id", table_name="hubspot_products")
    op.drop_index(
        "ix_hubspot_products_organization_id", table_name="hubspot_products"
    )
    op.drop_table("hubspot_products")

    op.drop_index("ix_hubspot_companies_vat", table_name="hubspot_companies")
    op.drop_index("ix_hubspot_companies_domain", table_name="hubspot_companies")
    op.drop_index(
        "ix_hubspot_companies_counterparty_id", table_name="hubspot_companies"
    )
    op.drop_index("ix_hubspot_companies_hub_id", table_name="hubspot_companies")
    op.drop_index(
        "ix_hubspot_companies_organization_id", table_name="hubspot_companies"
    )
    op.drop_table("hubspot_companies")

    op.drop_index("ix_hubspot_conn_org_active", table_name="hubspot_connections")
    op.drop_index(
        "ix_hubspot_connections_organization_id", table_name="hubspot_connections"
    )
    op.drop_table("hubspot_connections")
