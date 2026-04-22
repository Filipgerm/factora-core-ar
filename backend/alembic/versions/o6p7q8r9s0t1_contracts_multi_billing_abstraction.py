"""contracts multi-billing-engine abstraction

Adds ``BillingSystem`` enum + generic billing-reference columns on
``contracts``, ``performance_obligations`` and ``contract_allocations`` so
the domain scales beyond Stripe (HubSpot, Chargebee, custom billing, etc.).

* Stripe-specific columns stay in place as convenience mirrors for direct
  joins; new engines only populate the generic columns.
* ``contract_source`` and ``contract_allocation_source`` enums gain extra
  values (``hubspot_quote``, ``chargebee_subscription``,
  ``billing_invoice_line`` …) so non-Stripe flows don't need a migration
  to onboard.

Revision ID: o6p7q8r9s0t1
Revises: n5o6p7q8r9s0
Create Date: 2026-04-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "o6p7q8r9s0t1"
down_revision = "n5o6p7q8r9s0"
branch_labels = None
depends_on = None


_BILLING_SYSTEM_VALUES = (
    "stripe",
    "hubspot",
    "chargebee",
    "recurly",
    "zuora",
    "custom",
    "manual",
    "import",
)


_NEW_CONTRACT_SOURCES = (
    "hubspot_quote",
    "chargebee_subscription",
    "recurly_subscription",
    "zuora_subscription",
    "custom_billing",
    "sales_crm",
)


_NEW_ALLOCATION_SOURCES = (
    "billing_invoice_line",
    "billing_subscription_item",
    "billing_usage_event",
)


def upgrade() -> None:
    bind = op.get_bind()
    billing_enum = sa.Enum(*_BILLING_SYSTEM_VALUES, name="billingsystem")
    billing_enum.create(bind, checkfirst=True)

    for value in _NEW_CONTRACT_SOURCES:
        op.execute(
            f"ALTER TYPE contractsource ADD VALUE IF NOT EXISTS '{value}'"
        )
    for value in _NEW_ALLOCATION_SOURCES:
        op.execute(
            f"ALTER TYPE contractallocationsource ADD VALUE IF NOT EXISTS '{value}'"
        )

    op.add_column(
        "contracts",
        sa.Column(
            "billing_system",
            sa.Enum(*_BILLING_SYSTEM_VALUES, name="billingsystem", create_type=False),
            nullable=True,
        ),
    )
    op.add_column(
        "contracts",
        sa.Column("billing_contract_ref", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "contracts",
        sa.Column("billing_account_ref", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_contracts_billing_system",
        "contracts",
        ["billing_system"],
    )
    op.create_index(
        "ix_contracts_org_billing_contract",
        "contracts",
        ["organization_id", "billing_system", "billing_contract_ref"],
    )

    op.add_column(
        "performance_obligations",
        sa.Column(
            "billing_system",
            sa.Enum(*_BILLING_SYSTEM_VALUES, name="billingsystem", create_type=False),
            nullable=True,
        ),
    )
    op.add_column(
        "performance_obligations",
        sa.Column("billing_product_ref", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "performance_obligations",
        sa.Column("billing_price_ref", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "performance_obligations",
        sa.Column("billing_item_ref", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "performance_obligations",
        sa.Column("billing_meter_ref", sa.String(length=255), nullable=True),
    )
    op.create_index(
        "ix_performance_obligations_billing_system",
        "performance_obligations",
        ["billing_system"],
    )
    op.create_index(
        "ix_performance_obligations_org_billing_price",
        "performance_obligations",
        ["organization_id", "billing_system", "billing_price_ref"],
    )
    op.create_index(
        "ix_performance_obligations_org_billing_item",
        "performance_obligations",
        ["organization_id", "billing_system", "billing_item_ref"],
    )

    op.add_column(
        "contract_allocations",
        sa.Column(
            "billing_system",
            sa.Enum(*_BILLING_SYSTEM_VALUES, name="billingsystem", create_type=False),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_contract_allocations_billing_system",
        "contract_allocations",
        ["billing_system"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_contract_allocations_billing_system", table_name="contract_allocations"
    )
    op.drop_column("contract_allocations", "billing_system")

    op.drop_index(
        "ix_performance_obligations_org_billing_item",
        table_name="performance_obligations",
    )
    op.drop_index(
        "ix_performance_obligations_org_billing_price",
        table_name="performance_obligations",
    )
    op.drop_index(
        "ix_performance_obligations_billing_system",
        table_name="performance_obligations",
    )
    op.drop_column("performance_obligations", "billing_meter_ref")
    op.drop_column("performance_obligations", "billing_item_ref")
    op.drop_column("performance_obligations", "billing_price_ref")
    op.drop_column("performance_obligations", "billing_product_ref")
    op.drop_column("performance_obligations", "billing_system")

    op.drop_index("ix_contracts_org_billing_contract", table_name="contracts")
    op.drop_index("ix_contracts_billing_system", table_name="contracts")
    op.drop_column("contracts", "billing_account_ref")
    op.drop_column("contracts", "billing_contract_ref")
    op.drop_column("contracts", "billing_system")

    # NOTE: Postgres cannot drop enum values — we leave the extended
    # ``contractsource`` / ``contractallocationsource`` values in place on
    # downgrade. The ``billingsystem`` enum is removed only if no other
    # migrations still depend on it.
    bind = op.get_bind()
    sa.Enum(name="billingsystem").drop(bind, checkfirst=True)
