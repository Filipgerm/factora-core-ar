"""add stripe/hubspot/chargebee values to invoicesource enum

Extends the unified ``invoices.source`` enum with billing-engine values so
the Stripe→unified invoice bridge (and future HubSpot / Chargebee bridges)
can write through the same table without a new migration per engine.

Revision ID: q8r9s0t1u2v3
Revises: p7q8r9s0t1u2
Create Date: 2026-04-21
"""

from __future__ import annotations

from alembic import op

revision = "q8r9s0t1u2v3"
down_revision = "p7q8r9s0t1u2"
branch_labels = None
depends_on = None


_NEW_VALUES = ("stripe", "hubspot", "chargebee")


def upgrade() -> None:
    for value in _NEW_VALUES:
        op.execute(f"ALTER TYPE invoicesource ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # Postgres cannot drop enum values; leave the extended enum in place.
    pass
