"""embeddings_counterparty_fk

Revision ID: c9f1e2a3b4d5
Revises: 0acc8731db0b
Create Date: 2026-03-31

Adds a nullable ``counterparty_id`` FK column to ``organization_embeddings``.

Rationale:
- Enables vendor-scoped similarity search (WHERE counterparty_id = X) in O(log n)
  rather than full-table scans or expensive GIN/JSONB queries.
- Required for recurring-invoice detection: compare embeddings from the same
  counterparty across billing months.
- ``ON DELETE SET NULL`` preserves historical embedding rows even when a
  counterparty is soft-deleted or permanently removed.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c9f1e2a3b4d5"
down_revision: str | None = "0acc8731db0b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "organization_embeddings",
        sa.Column(
            "counterparty_id",
            sa.dialects.postgresql.UUID(as_uuid=False),
            sa.ForeignKey("counterparties.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_org_embeddings_counterparty",
        "organization_embeddings",
        ["counterparty_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_org_embeddings_counterparty", table_name="organization_embeddings")
    op.drop_column("organization_embeddings", "counterparty_id")
