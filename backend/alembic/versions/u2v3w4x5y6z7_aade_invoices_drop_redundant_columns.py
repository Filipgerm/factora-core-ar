"""aade_invoices: drop redundant columns (issue_date, currency, total_gross_value)

Step 5 of the AADE slim-lookup refactor. After the dual-write bridge
(Step 1), the backfill script (Step 2) and the ``invoice_id`` FK
(Step 4), the AADE mirror no longer needs to carry canonical financial
fields — they now live on the unified ``invoices`` row.

Kept on the mirror:
* ``total_net_value`` / ``total_vat_amount`` — Greek-tax-specific VAT
  breakdown (no equivalent on the unified ``Invoice`` contract).
* AADE identifiers (``mark``, ``uid``, ``authentication_code``),
  direction, series/aa, issuer/counterpart VAT+country+branch.

Dropped here:
* ``issue_date``   → ``invoices.issue_date``
* ``currency``     → ``invoices.currency``
* ``total_gross_value`` → ``invoices.amount``

Pre-flight: production MUST run
``scripts/backfill_aade_to_invoices.py`` before applying this migration
so every historical AADE row has a unified peer. Rows without a peer
will still survive the drop — the unified total lives only on new rows
— but any downstream code that read the dropped columns will silently
see ``None`` for legacy data. ``dashboard_service.py`` has already been
ported to read gross/currency/issue_date from ``invoices`` directly.

Safe in both **offline** (``--sql``) and **online** modes.

Revision ID: u2v3w4x5y6z7
Revises: t1u2v3w4x5y6
Create Date: 2026-04-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "u2v3w4x5y6z7"
down_revision = "t1u2v3w4x5y6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the lone index on issue_date first so ``DROP COLUMN`` cannot
    # complain about a dependent object in strict environments.
    op.execute("DROP INDEX IF EXISTS ix_aade_invoices_issue_date")
    op.drop_column("aade_invoices", "issue_date")
    op.drop_column("aade_invoices", "currency")
    op.drop_column("aade_invoices", "total_gross_value")


def downgrade() -> None:
    op.add_column(
        "aade_invoices",
        sa.Column("total_gross_value", sa.Numeric(18, 2), nullable=True),
    )
    op.add_column(
        "aade_invoices",
        sa.Column("currency", sa.String(length=3), nullable=True),
    )
    op.add_column(
        "aade_invoices",
        sa.Column("issue_date", sa.Date(), nullable=True),
    )
    op.create_index(
        "ix_aade_invoices_issue_date",
        "aade_invoices",
        ["issue_date"],
        unique=False,
    )
