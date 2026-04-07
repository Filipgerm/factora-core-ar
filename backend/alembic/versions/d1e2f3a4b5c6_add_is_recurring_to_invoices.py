"""add_is_recurring_to_invoices

Revision ID: d1e2f3a4b5c6
Revises: c9f1e2a3b4d5
Create Date: 2026-03-31

Adds a non-nullable boolean ``is_recurring`` column to ``invoices`` with
server-default ``false``.  Populated at ingest time by the ingestion agent's
``check_recurrence`` node after a DB-pattern check (>=3 distinct billing months
for the same vendor).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: str | None = "c9f1e2a3b4d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column(
            "is_recurring",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("invoices", "is_recurring")
