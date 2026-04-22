"""invoices: composite partial index on (organization_id, source, status) where deleted_at is null

Revision ID: n5o6p7q8r9s0
Revises: m4n5o6p7q8r9
Create Date: 2026-04-21

Introduce ``ix_invoices_org_source_status`` to power the dashboard filters and
ingestion dedup queries that join a tenant's invoices by source + status.
The partial ``WHERE deleted_at IS NULL`` clause keeps the index lean.
"""
from collections.abc import Sequence

from alembic import op

revision: str = "n5o6p7q8r9s0"
down_revision: str | Sequence[str] | None = "m4n5o6p7q8r9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_invoices_org_source_status",
        "invoices",
        ["organization_id", "source", "status"],
        postgresql_where="deleted_at IS NULL",
    )


def downgrade() -> None:
    op.drop_index(
        "ix_invoices_org_source_status",
        table_name="invoices",
    )
