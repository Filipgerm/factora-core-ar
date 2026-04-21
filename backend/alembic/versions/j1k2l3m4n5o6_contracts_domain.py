"""contracts domain — contracts, performance_obligations, contract_allocations, contract_documents, contract_modifications

Revision ID: j1k2l3m4n5o6
Revises: i9j0k1l2m3n4
Create Date: 2026-04-21

Introduces the IFRS 15 revenue-recognition backbone: a contract is decomposed
into one or more performance obligations. Each obligation carries its own SSP,
allocated transaction price, service window, and (optionally) a link to the
Stripe price/product/subscription item that drives its billing.

``contract_allocations`` is the event-level bridge: for every revenue-emitting
source row (Stripe invoice line, unified invoice, manual journal memo),
we record which PO it satisfies and how much it contributes. This mapping is
consumed by the revrec scheduler in a subsequent migration to link
``gl_revenue_recognition_schedules`` to ``contract_id`` / ``performance_obligation_id``.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "j1k2l3m4n5o6"
down_revision: str | Sequence[str] | None = "i9j0k1l2m3n4"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_contract_status = postgresql.ENUM(
    "draft",
    "active",
    "paused",
    "completed",
    "canceled",
    "terminated",
    name="contractstatus",
    create_type=True,
)
_contract_source = postgresql.ENUM(
    "manual",
    "stripe_subscription",
    "stripe_subscription_schedule",
    "hubspot_deal",
    "ocr_pdf",
    "import_csv",
    name="contractsource",
    create_type=True,
)
_po_kind = postgresql.ENUM(
    "point_in_time",
    "over_time_straight_line",
    "over_time_milestone",
    "over_time_usage_based",
    name="performanceobligationkind",
    create_type=True,
)
_alloc_method = postgresql.ENUM(
    "relative_ssp",
    "residual",
    "equal_split",
    "explicit",
    name="allocationmethod",
    create_type=True,
)
_alloc_source = postgresql.ENUM(
    "stripe_invoice_line_item",
    "stripe_subscription_item",
    "stripe_meter_event_summary",
    "invoice",
    "manual",
    name="contractallocationsource",
    create_type=True,
)
_mod_type = postgresql.ENUM(
    "separate_contract",
    "termination_and_new",
    "cumulative_catchup",
    name="contractmodificationtype",
    create_type=True,
)


def upgrade() -> None:
    bind = op.get_bind()
    for t in (_contract_status, _contract_source, _po_kind, _alloc_method, _alloc_source, _mod_type):
        t.create(bind, checkfirst=True)

    op.create_table(
        "contracts",
        sa.Column("id", sa.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "legal_entity_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("gl_legal_entities.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "counterparty_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("counterparties.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("external_reference", sa.String(255), nullable=True),
        sa.Column("source", _contract_source, nullable=False, server_default="manual"),
        sa.Column("status", _contract_status, nullable=False, server_default="draft"),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_schedule_id", sa.String(255), nullable=True),
        sa.Column("hubspot_deal_id", sa.String(64), nullable=True),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column(
            "total_transaction_price",
            sa.Numeric(18, 4),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "allocation_variance",
            sa.Numeric(18, 4),
            nullable=False,
            server_default="0",
        ),
        sa.Column("service_start_date", sa.Date(), nullable=True),
        sa.Column("service_end_date", sa.Date(), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("terminated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("payment_terms_days", sa.Integer(), nullable=True),
        sa.Column("billing_frequency", sa.String(32), nullable=True),
        sa.Column(
            "auto_renew",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("extra", postgresql.JSONB, nullable=True),
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
    )
    op.create_index("ix_contracts_organization_id", "contracts", ["organization_id"])
    op.create_index("ix_contracts_legal_entity_id", "contracts", ["legal_entity_id"])
    op.create_index("ix_contracts_counterparty_id", "contracts", ["counterparty_id"])
    op.create_index("ix_contracts_org_status", "contracts", ["organization_id", "status"])
    op.create_index(
        "ix_contracts_org_counterparty", "contracts", ["organization_id", "counterparty_id"]
    )
    op.create_index(
        "ix_contracts_stripe_subscription",
        "contracts",
        ["organization_id", "stripe_subscription_id"],
    )
    op.create_unique_constraint(
        "uq_contracts_org_source_external",
        "contracts",
        ["organization_id", "source", "external_reference"],
    )

    op.create_table(
        "performance_obligations",
        sa.Column("id", sa.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contract_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("sequence", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("kind", _po_kind, nullable=False),
        sa.Column(
            "allocation_method",
            _alloc_method,
            nullable=False,
            server_default="relative_ssp",
        ),
        sa.Column(
            "standalone_selling_price",
            sa.Numeric(18, 4),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "allocated_transaction_price",
            sa.Numeric(18, 4),
            nullable=False,
            server_default="0",
        ),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("service_start_date", sa.Date(), nullable=True),
        sa.Column("service_end_date", sa.Date(), nullable=True),
        sa.Column("total_units", sa.Numeric(18, 6), nullable=True),
        sa.Column("unit_of_measure", sa.String(64), nullable=True),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column("stripe_product_id", sa.String(255), nullable=True),
        sa.Column("stripe_subscription_item_id", sa.String(255), nullable=True),
        sa.Column("stripe_meter_id", sa.String(255), nullable=True),
        sa.Column(
            "revenue_account_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("gl_accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "deferred_account_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("gl_accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "is_cancelable",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("extra", postgresql.JSONB, nullable=True),
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
        sa.CheckConstraint(
            "allocated_transaction_price >= 0 AND standalone_selling_price >= 0",
            name="ck_performance_obligations_non_negative_prices",
        ),
    )
    op.create_index(
        "ix_performance_obligations_organization_id",
        "performance_obligations",
        ["organization_id"],
    )
    op.create_index(
        "ix_performance_obligations_contract_id",
        "performance_obligations",
        ["contract_id"],
    )
    op.create_index(
        "ix_performance_obligations_contract_seq",
        "performance_obligations",
        ["contract_id", "sequence"],
    )
    op.create_index(
        "ix_performance_obligations_org_stripe_price",
        "performance_obligations",
        ["organization_id", "stripe_price_id"],
    )
    op.create_index(
        "ix_performance_obligations_org_stripe_sub_item",
        "performance_obligations",
        ["organization_id", "stripe_subscription_item_id"],
    )

    op.create_table(
        "contract_allocations",
        sa.Column("id", sa.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contract_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "performance_obligation_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("performance_obligations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_type", _alloc_source, nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column(
            "invoice_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("invoices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("amount", sa.Numeric(18, 4), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"),
        sa.Column("units", sa.Numeric(18, 6), nullable=True),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("extra", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_contract_allocations_organization_id",
        "contract_allocations",
        ["organization_id"],
    )
    op.create_index(
        "ix_contract_allocations_contract_id", "contract_allocations", ["contract_id"]
    )
    op.create_index(
        "ix_contract_allocations_performance_obligation_id",
        "contract_allocations",
        ["performance_obligation_id"],
    )
    op.create_index(
        "ix_contract_allocations_po_date",
        "contract_allocations",
        ["performance_obligation_id", "event_date"],
    )
    op.create_index(
        "ix_contract_allocations_invoice", "contract_allocations", ["invoice_id"]
    )
    op.create_unique_constraint(
        "uq_contract_allocations_org_source_po",
        "contract_allocations",
        ["organization_id", "source_type", "source_id", "performance_obligation_id"],
    )

    op.create_table(
        "contract_documents",
        sa.Column("id", sa.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contract_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "invoice_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("invoices.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("kind", sa.String(64), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("storage_key", sa.String(512), nullable=True),
        sa.Column("content_type", sa.String(128), nullable=True),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column(
            "uploaded_by_user_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("extra", postgresql.JSONB, nullable=True),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_contract_documents_organization_id",
        "contract_documents",
        ["organization_id"],
    )
    op.create_index(
        "ix_contract_documents_contract_id", "contract_documents", ["contract_id"]
    )
    op.create_index(
        "ix_contract_documents_contract_kind",
        "contract_documents",
        ["contract_id", "kind"],
    )

    op.create_table(
        "contract_modifications",
        sa.Column("id", sa.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "contract_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("contracts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("modification_type", _mod_type, nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column(
            "delta_transaction_price",
            sa.Numeric(18, 4),
            nullable=False,
            server_default="0",
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("extra", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_contract_modifications_organization_id",
        "contract_modifications",
        ["organization_id"],
    )
    op.create_index(
        "ix_contract_modifications_contract_id",
        "contract_modifications",
        ["contract_id"],
    )
    op.create_index(
        "ix_contract_modifications_contract_date",
        "contract_modifications",
        ["contract_id", "effective_date"],
    )


def downgrade() -> None:
    op.drop_table("contract_modifications")
    op.drop_table("contract_documents")
    op.drop_table("contract_allocations")
    op.drop_table("performance_obligations")
    op.drop_table("contracts")

    bind = op.get_bind()
    for t in (_mod_type, _alloc_source, _alloc_method, _po_kind, _contract_source, _contract_status):
        t.drop(bind, checkfirst=True)
