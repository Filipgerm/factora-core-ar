"""stripe_customers.counterparty_id FK to counterparties

Link the Stripe customer mirror to the unified ``counterparties`` table so
AR invoices, revrec schedules and collections automation share a single
canonical business entity. The column is nullable — the
``StripeCustomerCounterpartyMatcher`` resolves it opportunistically on
upsert; unresolved rows are surfaced for manual review in the UI.

Revision ID: p7q8r9s0t1u2
Revises: o6p7q8r9s0t1
Create Date: 2026-04-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "p7q8r9s0t1u2"
down_revision = "o6p7q8r9s0t1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "stripe_customers",
        sa.Column("counterparty_id", sa.dialects.postgresql.UUID(as_uuid=False), nullable=True),
    )
    op.create_foreign_key(
        "fk_stripe_cus_counterparty",
        "stripe_customers",
        "counterparties",
        ["counterparty_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_stripe_cus_org_counterparty",
        "stripe_customers",
        ["organization_id", "counterparty_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_stripe_cus_org_counterparty", table_name="stripe_customers")
    op.drop_constraint(
        "fk_stripe_cus_counterparty", "stripe_customers", type_="foreignkey"
    )
    op.drop_column("stripe_customers", "counterparty_id")
