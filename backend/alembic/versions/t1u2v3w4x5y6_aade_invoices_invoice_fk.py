"""aade_invoices: add invoice_id FK to unified invoices

Step 4 of the AADE slim-lookup refactor. Adds a nullable ``invoice_id``
foreign key on ``aade_invoices`` pointing at ``invoices.id`` so the
mirror row has a direct, structural link to the unified invoice the
bridge service already creates via dual-write (Step 1) and the backfill
script populates (Step 2).

The column is nullable because historical rows have not been backfilled
yet; once the backfill run completes in each environment the column can
be flipped to ``NOT NULL`` in a follow-up migration (out of scope here).

Safe in both **offline** (``--sql``) and **online** modes: ``ADD COLUMN``
and ``ADD CONSTRAINT`` are pure DDL, no bind introspection.

Revision ID: t1u2v3w4x5y6
Revises: s0t1u2v3w4x5
Create Date: 2026-04-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "t1u2v3w4x5y6"
down_revision = "s0t1u2v3w4x5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "aade_invoices",
        sa.Column("invoice_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_aade_invoices_invoice_id_invoices",
        source_table="aade_invoices",
        referent_table="invoices",
        local_cols=["invoice_id"],
        remote_cols=["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_aade_invoices_invoice_id",
        "aade_invoices",
        ["invoice_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_aade_invoices_invoice_id", table_name="aade_invoices")
    op.drop_constraint(
        "fk_aade_invoices_invoice_id_invoices",
        "aade_invoices",
        type_="foreignkey",
    )
    op.drop_column("aade_invoices", "invoice_id")
