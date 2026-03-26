"""Partial indexes on organization_id where deleted_at IS NULL

Revision ID: f8e1c2d9b0a4
Revises: a51bee5b8371
Create Date: 2026-03-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f8e1c2d9b0a4"
down_revision: Union[str, Sequence[str], None] = "a51bee5b8371"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_WHERE = sa.text("deleted_at IS NULL")

_TABLES: list[tuple[str, str]] = [
    ("counterparties", "ix_counterparties_org_active"),
    ("invoices", "ix_invoices_org_active"),
    ("stripe_balance_transactions", "ix_stripe_balance_transactions_org_active"),
    ("stripe_payouts", "ix_stripe_payouts_org_active"),
    # stripe_balance_snapshots has no deleted_at (snapshot rows, not soft-deleted).
    ("stripe_customers", "ix_stripe_customers_org_active"),
    ("stripe_subscriptions", "ix_stripe_subscriptions_org_active"),
    ("stripe_invoices", "ix_stripe_invoices_org_active"),
    ("stripe_invoice_line_items", "ix_stripe_invoice_line_items_org_active"),
    ("stripe_credit_notes", "ix_stripe_credit_notes_org_active"),
    ("stripe_products", "ix_stripe_products_org_active"),
    ("stripe_prices", "ix_stripe_prices_org_active"),
    ("stripe_payment_intents", "ix_stripe_payment_intents_org_active"),
    ("stripe_refunds", "ix_stripe_refunds_org_active"),
    ("stripe_disputes", "ix_stripe_disputes_org_active"),
    ("stripe_tax_rates", "ix_stripe_tax_rates_org_active"),
]


def upgrade() -> None:
    for table, idx in _TABLES:
        op.create_index(
            idx,
            table,
            ["organization_id"],
            unique=False,
            postgresql_where=_WHERE,
        )


def downgrade() -> None:
    for table, idx in reversed(_TABLES):
        op.drop_index(idx, table_name=table)
