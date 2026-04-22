"""Add ar_demo_context JSONB to counterparties (demo AR UI seed data).

Revision ID: y1z2a3b4c5d6
Revises: x5y6z7a8b9c0
Create Date: 2026-04-22
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "y1z2a3b4c5d6"
down_revision = "x5y6z7a8b9c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "counterparties",
        sa.Column("ar_demo_context", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("counterparties", "ar_demo_context")
