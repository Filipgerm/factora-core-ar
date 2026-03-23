"""stripe_billing_mirror_tables — local mirror of Stripe objects per organization.

Revision ID: a691a130c62a
Revises: e9b2c4d6f8a0
Create Date: 2026-03-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a691a130c62a"
down_revision: Union[str, Sequence[str], None] = "e9b2c4d6f8a0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "stripe_balance_snapshots",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column(
            "available",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "pending",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("connect_reserved", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("instant_available", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("livemode", sa.Boolean(), nullable=True),
        sa.Column("raw_stripe_object", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "retrieved_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_balance_snapshots_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_balance_snapshots")),
    )
    op.create_index(
        op.f("ix_stripe_balance_snapshots_organization_id"),
        "stripe_balance_snapshots",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_balance_snap_org_retrieved",
        "stripe_balance_snapshots",
        ["organization_id", "retrieved_at"],
        unique=False,
    )

    _org_cols = (
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("stripe_id", sa.String(255), nullable=False),
        sa.Column("stripe_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("raw_stripe_object", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "stripe_balance_transactions",
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("fee", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("net", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(64), nullable=True),
        sa.Column("type", sa.String(64), nullable=True),
        sa.Column("reporting_category", sa.String(128), nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        sa.Column("available_on", sa.DateTime(timezone=True), nullable=True),
        sa.Column("exchange_rate", sa.Float(), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_bt_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_balance_transactions_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_balance_transactions")),
    )
    op.create_index(
        op.f("ix_stripe_balance_transactions_organization_id"),
        "stripe_balance_transactions",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_bt_org_created",
        "stripe_balance_transactions",
        ["organization_id", "stripe_created"],
        unique=False,
    )

    op.create_table(
        "stripe_payouts",
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("arrival_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("automatic", sa.Boolean(), nullable=True),
        sa.Column("balance_transaction_id", sa.String(255), nullable=True),
        sa.Column("destination", sa.String(255), nullable=True),
        sa.Column("failure_code", sa.String(128), nullable=True),
        sa.Column("failure_message", sa.Text(), nullable=True),
        sa.Column("method", sa.String(32), nullable=True),
        sa.Column("payout_type", sa.String(32), nullable=True),
        sa.Column("statement_descriptor", sa.String(255), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_payout_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_payouts_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_payouts")),
    )
    op.create_index(
        op.f("ix_stripe_payouts_organization_id"),
        "stripe_payouts",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_payout_org_status",
        "stripe_payouts",
        ["organization_id", "status"],
        unique=False,
    )

    op.create_table(
        "stripe_customers",
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("name", sa.String(512), nullable=True),
        sa.Column("phone", sa.String(64), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("balance", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("delinquent", sa.Boolean(), nullable=True),
        sa.Column("invoice_prefix", sa.String(32), nullable=True),
        sa.Column("tax_exempt", sa.String(32), nullable=True),
        sa.Column("default_source", sa.String(255), nullable=True),
        sa.Column("address", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_cus_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_customers_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_customers")),
    )
    op.create_index(
        op.f("ix_stripe_customers_organization_id"),
        "stripe_customers",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_cus_org_email",
        "stripe_customers",
        ["organization_id", "email"],
        unique=False,
    )

    op.create_table(
        "stripe_subscriptions",
        sa.Column("customer_stripe_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("collection_method", sa.String(32), nullable=True),
        sa.Column("default_payment_method", sa.String(255), nullable=True),
        sa.Column("items_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_sub_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_subscriptions_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_subscriptions")),
    )
    op.create_index(
        op.f("ix_stripe_subscriptions_organization_id"),
        "stripe_subscriptions",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stripe_subscriptions_customer_stripe_id"),
        "stripe_subscriptions",
        ["customer_stripe_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_sub_org_customer",
        "stripe_subscriptions",
        ["organization_id", "customer_stripe_id"],
        unique=False,
    )

    op.create_table(
        "stripe_invoices",
        sa.Column("customer_stripe_id", sa.String(255), nullable=True),
        sa.Column("subscription_stripe_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("amount_due", sa.Integer(), nullable=True),
        sa.Column("amount_paid", sa.Integer(), nullable=True),
        sa.Column("amount_remaining", sa.Integer(), nullable=True),
        sa.Column("subtotal", sa.Integer(), nullable=True),
        sa.Column("total", sa.Integer(), nullable=True),
        sa.Column("tax", sa.Integer(), nullable=True),
        sa.Column("billing_reason", sa.String(64), nullable=True),
        sa.Column("collection_method", sa.String(32), nullable=True),
        sa.Column("hosted_invoice_url", sa.Text(), nullable=True),
        sa.Column("invoice_pdf", sa.Text(), nullable=True),
        sa.Column("number", sa.String(128), nullable=True),
        sa.Column("paid", sa.Boolean(), nullable=True),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_inv_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_invoices_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_invoices")),
    )
    op.create_index(
        op.f("ix_stripe_invoices_organization_id"),
        "stripe_invoices",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stripe_invoices_customer_stripe_id"),
        "stripe_invoices",
        ["customer_stripe_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_inv_org_status",
        "stripe_invoices",
        ["organization_id", "status"],
        unique=False,
    )

    op.create_table(
        "stripe_invoice_line_items",
        sa.Column("invoice_stripe_id", sa.String(255), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Integer(), nullable=True),
        sa.Column("price_stripe_id", sa.String(255), nullable=True),
        sa.Column("product_stripe_id", sa.String(255), nullable=True),
        sa.Column("unit_amount", sa.Integer(), nullable=True),
        sa.Column("discountable", sa.Boolean(), nullable=True),
        sa.Column("line_type", sa.String(32), nullable=True),
        sa.Column("period", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_inv_line_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_invoice_line_items_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_invoice_line_items")),
    )
    op.create_index(
        op.f("ix_stripe_invoice_line_items_organization_id"),
        "stripe_invoice_line_items",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stripe_invoice_line_items_invoice_stripe_id"),
        "stripe_invoice_line_items",
        ["invoice_stripe_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_inv_line_org_invoice",
        "stripe_invoice_line_items",
        ["organization_id", "invoice_stripe_id"],
        unique=False,
    )

    op.create_table(
        "stripe_credit_notes",
        sa.Column("invoice_stripe_id", sa.String(255), nullable=True),
        sa.Column("customer_stripe_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("subtotal", sa.Integer(), nullable=True),
        sa.Column("total", sa.Integer(), nullable=True),
        sa.Column("reason", sa.String(64), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_cn_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_credit_notes_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_credit_notes")),
    )
    op.create_index(
        op.f("ix_stripe_credit_notes_organization_id"),
        "stripe_credit_notes",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stripe_credit_notes_invoice_stripe_id"),
        "stripe_credit_notes",
        ["invoice_stripe_id"],
        unique=False,
    )

    op.create_table(
        "stripe_products",
        sa.Column("name", sa.String(512), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_price_id", sa.String(255), nullable=True),
        sa.Column("images", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_prod_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_products_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_products")),
    )
    op.create_index(
        op.f("ix_stripe_products_organization_id"),
        "stripe_products",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_prod_org_active",
        "stripe_products",
        ["organization_id", "active"],
        unique=False,
    )

    op.create_table(
        "stripe_prices",
        sa.Column("product_stripe_id", sa.String(255), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("unit_amount", sa.Integer(), nullable=True),
        sa.Column("billing_scheme", sa.String(32), nullable=True),
        sa.Column("price_type", sa.String(32), nullable=True),
        sa.Column("recurring", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("tax_behavior", sa.String(32), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_price_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_prices_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_prices")),
    )
    op.create_index(
        op.f("ix_stripe_prices_organization_id"),
        "stripe_prices",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stripe_prices_product_stripe_id"),
        "stripe_prices",
        ["product_stripe_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_price_org_product",
        "stripe_prices",
        ["organization_id", "product_stripe_id"],
        unique=False,
    )

    op.create_table(
        "stripe_payment_intents",
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("amount_received", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("customer_stripe_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("invoice_stripe_id", sa.String(255), nullable=True),
        sa.Column("latest_charge", sa.String(255), nullable=True),
        sa.Column("payment_method", sa.String(255), nullable=True),
        sa.Column("receipt_email", sa.String(255), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_pi_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_payment_intents_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_payment_intents")),
    )
    op.create_index(
        op.f("ix_stripe_payment_intents_organization_id"),
        "stripe_payment_intents",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stripe_payment_intents_customer_stripe_id"),
        "stripe_payment_intents",
        ["customer_stripe_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_pi_org_status",
        "stripe_payment_intents",
        ["organization_id", "status"],
        unique=False,
    )

    op.create_table(
        "stripe_refunds",
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("charge_stripe_id", sa.String(255), nullable=True),
        sa.Column("payment_intent_stripe_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("reason", sa.String(64), nullable=True),
        sa.Column("failure_reason", sa.String(128), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_refund_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_refunds_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_refunds")),
    )
    op.create_index(
        op.f("ix_stripe_refunds_organization_id"),
        "stripe_refunds",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stripe_refunds_charge_stripe_id"),
        "stripe_refunds",
        ["charge_stripe_id"],
        unique=False,
    )

    op.create_table(
        "stripe_disputes",
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(3), nullable=True),
        sa.Column("charge_stripe_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(32), nullable=True),
        sa.Column("reason", sa.String(64), nullable=True),
        sa.Column("evidence_due_by", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_dispute_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_disputes_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_disputes")),
    )
    op.create_index(
        op.f("ix_stripe_disputes_organization_id"),
        "stripe_disputes",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_stripe_disputes_charge_stripe_id"),
        "stripe_disputes",
        ["charge_stripe_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_dispute_org_status",
        "stripe_disputes",
        ["organization_id", "status"],
        unique=False,
    )

    op.create_table(
        "stripe_tax_rates",
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("percentage", sa.Numeric(10, 4), nullable=True),
        sa.Column("inclusive", sa.Boolean(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=True),
        sa.Column("jurisdiction", sa.String(128), nullable=True),
        sa.Column("tax_type", sa.String(64), nullable=True),
        sa.Column("stripe_created", sa.DateTime(timezone=True), nullable=True),
        *_org_cols,
        sa.UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_tr_org_stripe_id"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_stripe_tax_rates_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_stripe_tax_rates")),
    )
    op.create_index(
        op.f("ix_stripe_tax_rates_organization_id"),
        "stripe_tax_rates",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_stripe_tr_org_active",
        "stripe_tax_rates",
        ["organization_id", "active"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_stripe_tr_org_active", table_name="stripe_tax_rates")
    op.drop_table("stripe_tax_rates")
    op.drop_index("ix_stripe_dispute_org_status", table_name="stripe_disputes")
    op.drop_index(op.f("ix_stripe_disputes_charge_stripe_id"), table_name="stripe_disputes")
    op.drop_index(op.f("ix_stripe_disputes_organization_id"), table_name="stripe_disputes")
    op.drop_table("stripe_disputes")
    op.drop_index(op.f("ix_stripe_refunds_charge_stripe_id"), table_name="stripe_refunds")
    op.drop_index(op.f("ix_stripe_refunds_organization_id"), table_name="stripe_refunds")
    op.drop_table("stripe_refunds")
    op.drop_index("ix_stripe_pi_org_status", table_name="stripe_payment_intents")
    op.drop_index(op.f("ix_stripe_payment_intents_customer_stripe_id"), table_name="stripe_payment_intents")
    op.drop_index(op.f("ix_stripe_payment_intents_organization_id"), table_name="stripe_payment_intents")
    op.drop_table("stripe_payment_intents")
    op.drop_index("ix_stripe_price_org_product", table_name="stripe_prices")
    op.drop_index(op.f("ix_stripe_prices_product_stripe_id"), table_name="stripe_prices")
    op.drop_index(op.f("ix_stripe_prices_organization_id"), table_name="stripe_prices")
    op.drop_table("stripe_prices")
    op.drop_index("ix_stripe_prod_org_active", table_name="stripe_products")
    op.drop_index(op.f("ix_stripe_products_organization_id"), table_name="stripe_products")
    op.drop_table("stripe_products")
    op.drop_index(op.f("ix_stripe_credit_notes_invoice_stripe_id"), table_name="stripe_credit_notes")
    op.drop_index(op.f("ix_stripe_credit_notes_organization_id"), table_name="stripe_credit_notes")
    op.drop_table("stripe_credit_notes")
    op.drop_index("ix_stripe_inv_line_org_invoice", table_name="stripe_invoice_line_items")
    op.drop_index(op.f("ix_stripe_invoice_line_items_invoice_stripe_id"), table_name="stripe_invoice_line_items")
    op.drop_index(op.f("ix_stripe_invoice_line_items_organization_id"), table_name="stripe_invoice_line_items")
    op.drop_table("stripe_invoice_line_items")
    op.drop_index("ix_stripe_inv_org_status", table_name="stripe_invoices")
    op.drop_index(op.f("ix_stripe_invoices_customer_stripe_id"), table_name="stripe_invoices")
    op.drop_index(op.f("ix_stripe_invoices_organization_id"), table_name="stripe_invoices")
    op.drop_table("stripe_invoices")
    op.drop_index("ix_stripe_sub_org_customer", table_name="stripe_subscriptions")
    op.drop_index(op.f("ix_stripe_subscriptions_customer_stripe_id"), table_name="stripe_subscriptions")
    op.drop_index(op.f("ix_stripe_subscriptions_organization_id"), table_name="stripe_subscriptions")
    op.drop_table("stripe_subscriptions")
    op.drop_index("ix_stripe_cus_org_email", table_name="stripe_customers")
    op.drop_index(op.f("ix_stripe_customers_organization_id"), table_name="stripe_customers")
    op.drop_table("stripe_customers")
    op.drop_index("ix_stripe_payout_org_status", table_name="stripe_payouts")
    op.drop_index(op.f("ix_stripe_payouts_organization_id"), table_name="stripe_payouts")
    op.drop_table("stripe_payouts")
    op.drop_index("ix_stripe_bt_org_created", table_name="stripe_balance_transactions")
    op.drop_index(op.f("ix_stripe_balance_transactions_organization_id"), table_name="stripe_balance_transactions")
    op.drop_table("stripe_balance_transactions")
    op.drop_index("ix_stripe_balance_snap_org_retrieved", table_name="stripe_balance_snapshots")
    op.drop_index(op.f("ix_stripe_balance_snapshots_organization_id"), table_name="stripe_balance_snapshots")
    op.drop_table("stripe_balance_snapshots")
