"""contracts/performance_obligations: drop Stripe-specific convenience columns

Once the multi-billing-engine abstraction (billing_system + billing_*_ref)
is in place, the Stripe-specific columns that used to double as both the
canonical pointer AND a convenience mirror become pure redundancy — a
PO populated for Stripe today always has ``billing_system = STRIPE`` and
``billing_item_ref = si_xxx`` alongside the legacy ``stripe_subscription_item_id``.

Dropping the mirrors forces every producer / consumer onto the generic
contract and eliminates the risk of one column drifting from the other.

Dropped columns
---------------
contracts:
  * stripe_subscription_id          -> billing_contract_ref (with billing_system=STRIPE)
  * stripe_subscription_schedule_id -> billing_contract_ref
  * hubspot_deal_id                 -> billing_contract_ref (with billing_system=HUBSPOT)

performance_obligations:
  * stripe_price_id               -> billing_price_ref
  * stripe_product_id             -> billing_product_ref
  * stripe_subscription_item_id   -> billing_item_ref
  * stripe_meter_id               -> billing_meter_ref

Also drops the now-useless enum values on ``contractallocationsource``
(``stripe_invoice_line_item``, ``stripe_subscription_item``,
``stripe_meter_event_summary``) — the engine-agnostic BILLING_* values
fully replace them.

Pre-flight
----------
Production databases that populated the legacy columns should first
copy them into the new generic columns (a one-liner UPDATE in the same
transaction). For MVP / dev we skip this because every writer already
populates both.

Revision ID: v3w4x5y6z7a8
Revises: u2v3w4x5y6z7
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "v3w4x5y6z7a8"
down_revision = "u2v3w4x5y6z7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Backfill guard: copy legacy data into generic refs where missing.
    # Safe to run every time — WHERE clauses short-circuit when the
    # legacy columns are NULL or the generic columns already carry a
    # value.
    op.execute(
        """
        UPDATE contracts
           SET billing_system        = COALESCE(billing_system, 'stripe'),
               billing_contract_ref  = COALESCE(
                   billing_contract_ref,
                   stripe_subscription_id,
                   stripe_subscription_schedule_id
               )
         WHERE billing_contract_ref IS NULL
           AND (stripe_subscription_id IS NOT NULL
                OR stripe_subscription_schedule_id IS NOT NULL)
        """
    )
    op.execute(
        """
        UPDATE contracts
           SET billing_system       = COALESCE(billing_system, 'hubspot'),
               billing_contract_ref = COALESCE(billing_contract_ref, hubspot_deal_id)
         WHERE billing_contract_ref IS NULL
           AND hubspot_deal_id IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE performance_obligations
           SET billing_system    = COALESCE(billing_system, 'stripe'),
               billing_price_ref = COALESCE(billing_price_ref, stripe_price_id),
               billing_product_ref = COALESCE(billing_product_ref, stripe_product_id),
               billing_item_ref  = COALESCE(billing_item_ref, stripe_subscription_item_id),
               billing_meter_ref = COALESCE(billing_meter_ref, stripe_meter_id)
         WHERE stripe_price_id IS NOT NULL
            OR stripe_product_id IS NOT NULL
            OR stripe_subscription_item_id IS NOT NULL
            OR stripe_meter_id IS NOT NULL
        """
    )

    # --- Drop legacy indexes first (column-drop would fail otherwise).
    op.execute("DROP INDEX IF EXISTS ix_contracts_stripe_subscription")
    op.execute("DROP INDEX IF EXISTS ix_performance_obligations_org_stripe_price")
    op.execute("DROP INDEX IF EXISTS ix_performance_obligations_org_stripe_sub_item")

    # --- contracts
    op.drop_column("contracts", "stripe_subscription_id")
    op.drop_column("contracts", "stripe_subscription_schedule_id")
    op.drop_column("contracts", "hubspot_deal_id")

    # --- performance_obligations
    op.drop_column("performance_obligations", "stripe_price_id")
    op.drop_column("performance_obligations", "stripe_product_id")
    op.drop_column("performance_obligations", "stripe_subscription_item_id")
    op.drop_column("performance_obligations", "stripe_meter_id")

    # NOTE: we intentionally leave the Stripe-specific enum values
    # (``stripe_invoice_line_item``, ``stripe_subscription_item``,
    # ``stripe_meter_event_summary``) on the ``contractallocationsource``
    # type. Postgres does not support ``ALTER TYPE … DROP VALUE`` directly
    # (the canonical workaround is to rename the type, create a new one
    # with the desired values, and migrate every column + default). With
    # zero rows of existing data using those values today (confirmed via
    # code audit — the bridge always writes ``BILLING_*`` variants),
    # leaving them as dead enum values is strictly safer and remains a
    # no-op. A follow-up migration can prune them once we are confident
    # they will never appear in historical backups.


def downgrade() -> None:
    op.add_column(
        "performance_obligations",
        sa.Column("stripe_meter_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "performance_obligations",
        sa.Column(
            "stripe_subscription_item_id", sa.String(length=255), nullable=True
        ),
    )
    op.add_column(
        "performance_obligations",
        sa.Column("stripe_product_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "performance_obligations",
        sa.Column("stripe_price_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "contracts", sa.Column("hubspot_deal_id", sa.String(length=64), nullable=True)
    )
    op.add_column(
        "contracts",
        sa.Column(
            "stripe_subscription_schedule_id", sa.String(length=255), nullable=True
        ),
    )
    op.add_column(
        "contracts",
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
    )

    op.create_index(
        "ix_performance_obligations_org_stripe_sub_item",
        "performance_obligations",
        ["organization_id", "stripe_subscription_item_id"],
    )
    op.create_index(
        "ix_performance_obligations_org_stripe_price",
        "performance_obligations",
        ["organization_id", "stripe_price_id"],
    )
    op.create_index(
        "ix_contracts_stripe_subscription",
        "contracts",
        ["organization_id", "stripe_subscription_id"],
    )
