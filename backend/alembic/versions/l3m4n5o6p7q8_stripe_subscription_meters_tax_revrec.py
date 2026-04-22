"""stripe native revrec tables — subscription_items, subscription_schedules, meters, meter event summaries, tax transactions, revrec reports

Revision ID: l3m4n5o6p7q8
Revises: k2l3m4n5o6p7
Create Date: 2026-04-21

Six new Stripe mirror tables to cover:

* ``stripe_subscription_items`` — per-price atom of a Subscription; the lynchpin
  that ties a ``PerformanceObligation`` to the price that bills it.
* ``stripe_subscription_schedules`` — multi-phase contracts; stores full
  ``phases`` JSONB so modification accounting doesn't need a re-fetch.
* ``stripe_meters`` + ``stripe_meter_event_summaries`` — Stripe Billing Meters
  for usage-based billing; summaries drive ``recognition_method = USAGE_BASED``.
* ``stripe_tax_transactions`` — Stripe Tax API committed documents per
  invoice / payment_intent / checkout_session for reconciliation with AADE.
* ``stripe_revrec_reports`` — snapshots of Stripe's native Revenue
  Recognition reports; our scheduler reconciles against these numbers.

Every row is org-scoped with ``uq_*_org_stripe_id``.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "l3m4n5o6p7q8"
down_revision: str | Sequence[str] | None = "k2l3m4n5o6p7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _org_scoped_columns() -> list[sa.Column]:
    return [
        sa.Column("id", sa.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("stripe_id", sa.String(255), nullable=False),
        sa.Column("stripe_metadata", postgresql.JSONB, nullable=True),
        sa.Column("raw_stripe_object", postgresql.JSONB, nullable=True),
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


def upgrade() -> None:
    op.create_table(
        "stripe_subscription_items",
        *_org_scoped_columns(),
        sa.Column("subscription_stripe_id", sa.String(255), nullable=False),
        sa.Column("price_stripe_id", sa.String(255), nullable=True),
        sa.Column("product_stripe_id", sa.String(255), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("billing_thresholds", postgresql.JSONB, nullable=True),
        sa.Column("tax_rates", postgresql.JSONB, nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_stripe_subscription_items_organization_id",
        "stripe_subscription_items",
        ["organization_id"],
    )
    op.create_index(
        "ix_stripe_subscription_items_subscription_stripe_id",
        "stripe_subscription_items",
        ["subscription_stripe_id"],
    )
    op.create_index(
        "ix_stripe_sub_item_org_sub",
        "stripe_subscription_items",
        ["organization_id", "subscription_stripe_id"],
    )
    op.create_index(
        "ix_stripe_sub_item_org_price",
        "stripe_subscription_items",
        ["organization_id", "price_stripe_id"],
    )
    op.create_unique_constraint(
        "uq_stripe_sub_item_org_stripe_id",
        "stripe_subscription_items",
        ["organization_id", "stripe_id"],
    )

    op.create_table(
        "stripe_subscription_schedules",
        *_org_scoped_columns(),
        sa.Column("customer_stripe_id", sa.String(255), nullable=True),
        sa.Column("subscription_stripe_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("current_phase", postgresql.JSONB, nullable=True),
        sa.Column("phases", postgresql.JSONB, nullable=True),
        sa.Column("end_behavior", sa.String(32), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("released_subscription_id", sa.String(255), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_stripe_subscription_schedules_organization_id",
        "stripe_subscription_schedules",
        ["organization_id"],
    )
    op.create_index(
        "ix_stripe_subscription_schedules_customer_stripe_id",
        "stripe_subscription_schedules",
        ["customer_stripe_id"],
    )
    op.create_index(
        "ix_stripe_sub_sched_org_status",
        "stripe_subscription_schedules",
        ["organization_id", "status"],
    )
    op.create_unique_constraint(
        "uq_stripe_sub_sched_org_stripe_id",
        "stripe_subscription_schedules",
        ["organization_id", "stripe_id"],
    )

    op.create_table(
        "stripe_meters",
        *_org_scoped_columns(),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("event_name", sa.String(128), nullable=True),
        sa.Column("event_time_window", sa.String(32), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("customer_mapping", postgresql.JSONB, nullable=True),
        sa.Column("default_aggregation", postgresql.JSONB, nullable=True),
        sa.Column("value_settings", postgresql.JSONB, nullable=True),
        sa.Column("status_transitions", postgresql.JSONB, nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        sa.Column("livemode", sa.Boolean(), nullable=True),
    )
    op.create_index(
        "ix_stripe_meters_organization_id", "stripe_meters", ["organization_id"]
    )
    op.create_index(
        "ix_stripe_meters_event_name", "stripe_meters", ["event_name"]
    )
    op.create_index(
        "ix_stripe_meter_org_status", "stripe_meters", ["organization_id", "status"]
    )
    op.create_unique_constraint(
        "uq_stripe_meter_org_stripe_id", "stripe_meters", ["organization_id", "stripe_id"]
    )

    op.create_table(
        "stripe_meter_event_summaries",
        sa.Column("id", sa.UUID(as_uuid=False), primary_key=True),
        sa.Column(
            "organization_id",
            sa.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("meter_stripe_id", sa.String(255), nullable=False),
        sa.Column("customer_stripe_id", sa.String(255), nullable=False),
        sa.Column("aggregated_value", sa.Numeric(20, 6), nullable=True),
        sa.Column("start_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("livemode", sa.Boolean(), nullable=True),
        sa.Column("raw_stripe_object", postgresql.JSONB, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_stripe_meter_event_summaries_organization_id",
        "stripe_meter_event_summaries",
        ["organization_id"],
    )
    op.create_index(
        "ix_stripe_meter_summary_org_meter",
        "stripe_meter_event_summaries",
        ["organization_id", "meter_stripe_id"],
    )
    op.create_index(
        "ix_stripe_meter_summary_org_customer",
        "stripe_meter_event_summaries",
        ["organization_id", "customer_stripe_id"],
    )
    op.create_unique_constraint(
        "uq_stripe_meter_summary_org_meter_cust_start",
        "stripe_meter_event_summaries",
        ["organization_id", "meter_stripe_id", "customer_stripe_id", "start_time"],
    )

    op.create_table(
        "stripe_tax_transactions",
        *_org_scoped_columns(),
        sa.Column("transaction_type", sa.String(32), nullable=True),
        sa.Column("reference", sa.String(255), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("customer_stripe_id", sa.String(255), nullable=True),
        sa.Column("customer_details", postgresql.JSONB, nullable=True),
        sa.Column("ship_from_details", postgresql.JSONB, nullable=True),
        sa.Column("tax_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("line_items", postgresql.JSONB, nullable=True),
        sa.Column("shipping_cost", postgresql.JSONB, nullable=True),
        sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversal", postgresql.JSONB, nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        sa.Column("livemode", sa.Boolean(), nullable=True),
    )
    op.create_index(
        "ix_stripe_tax_transactions_organization_id",
        "stripe_tax_transactions",
        ["organization_id"],
    )
    op.create_index(
        "ix_stripe_tax_transactions_reference",
        "stripe_tax_transactions",
        ["reference"],
    )
    op.create_index(
        "ix_stripe_tax_transactions_customer_stripe_id",
        "stripe_tax_transactions",
        ["customer_stripe_id"],
    )
    op.create_index(
        "ix_stripe_tax_tx_org_reference",
        "stripe_tax_transactions",
        ["organization_id", "reference"],
    )
    op.create_unique_constraint(
        "uq_stripe_tax_tx_org_stripe_id",
        "stripe_tax_transactions",
        ["organization_id", "stripe_id"],
    )

    op.create_table(
        "stripe_revrec_reports",
        *_org_scoped_columns(),
        sa.Column("report_type", sa.String(64), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("interval_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("interval_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result_url", sa.Text(), nullable=True),
        sa.Column("parameters", postgresql.JSONB, nullable=True),
        sa.Column("summary", postgresql.JSONB, nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        sa.Column("succeeded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_stripe_revrec_reports_organization_id",
        "stripe_revrec_reports",
        ["organization_id"],
    )
    op.create_index(
        "ix_stripe_revrec_report_org_interval",
        "stripe_revrec_reports",
        ["organization_id", "interval_end"],
    )
    op.create_unique_constraint(
        "uq_stripe_revrec_report_org_stripe_id",
        "stripe_revrec_reports",
        ["organization_id", "stripe_id"],
    )


def downgrade() -> None:
    op.drop_table("stripe_revrec_reports")
    op.drop_table("stripe_tax_transactions")
    op.drop_table("stripe_meter_event_summaries")
    op.drop_table("stripe_meters")
    op.drop_table("stripe_subscription_schedules")
    op.drop_table("stripe_subscription_items")
