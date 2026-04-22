"""stripe_invoice_line_items: subscription_item_stripe_id + composite FKs to prices/products/sub_items

Revision ID: m4n5o6p7q8r9
Revises: l3m4n5o6p7q8
Create Date: 2026-04-21

Add the missing ``subscription_item_stripe_id`` column + three composite FKs
so invoice lines can be joined to their pricing and billing-unit parents
with DB-level guarantees:

* ``(organization_id, price_stripe_id)`` → ``stripe_prices``
* ``(organization_id, product_stripe_id)`` → ``stripe_products``
* ``(organization_id, subscription_item_stripe_id)`` → ``stripe_subscription_items``

All ``ON DELETE SET NULL`` so soft-deleting a Stripe catalog row does not
nuke historical invoice lines. ``StripeSyncService`` now pre-upserts stub
parent rows from the invoice line payload to tolerate out-of-order webhooks.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "m4n5o6p7q8r9"
down_revision: str | Sequence[str] | None = "l3m4n5o6p7q8"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "stripe_invoice_line_items",
        sa.Column("subscription_item_stripe_id", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_stripe_inv_line_org_price",
        "stripe_invoice_line_items",
        ["organization_id", "price_stripe_id"],
    )
    op.create_index(
        "ix_stripe_inv_line_org_product",
        "stripe_invoice_line_items",
        ["organization_id", "product_stripe_id"],
    )
    op.create_index(
        "ix_stripe_inv_line_org_sub_item",
        "stripe_invoice_line_items",
        ["organization_id", "subscription_item_stripe_id"],
    )
    op.create_foreign_key(
        "fk_stripe_inv_line_price",
        "stripe_invoice_line_items",
        "stripe_prices",
        ["organization_id", "price_stripe_id"],
        ["organization_id", "stripe_id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_stripe_inv_line_product",
        "stripe_invoice_line_items",
        "stripe_products",
        ["organization_id", "product_stripe_id"],
        ["organization_id", "stripe_id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_stripe_inv_line_sub_item",
        "stripe_invoice_line_items",
        "stripe_subscription_items",
        ["organization_id", "subscription_item_stripe_id"],
        ["organization_id", "stripe_id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_stripe_inv_line_sub_item", "stripe_invoice_line_items", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_stripe_inv_line_product", "stripe_invoice_line_items", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_stripe_inv_line_price", "stripe_invoice_line_items", type_="foreignkey"
    )
    op.drop_index(
        "ix_stripe_inv_line_org_sub_item", table_name="stripe_invoice_line_items"
    )
    op.drop_index(
        "ix_stripe_inv_line_org_product", table_name="stripe_invoice_line_items"
    )
    op.drop_index(
        "ix_stripe_inv_line_org_price", table_name="stripe_invoice_line_items"
    )
    op.drop_column("stripe_invoice_line_items", "subscription_item_stripe_id")
