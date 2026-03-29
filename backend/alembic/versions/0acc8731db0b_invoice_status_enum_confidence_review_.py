"""invoice_status_enum_confidence_review_fields

Revision ID: 0acc8731db0b
Revises: b3c4d5e6f7a8
Create Date: 2026-03-27 18:23:50.359527

Creates PostgreSQL enum ``invoicestatus`` explicitly before altering ``invoices.status``
(Alembic ``alter_column`` to ``sa.Enum`` does not emit ``CREATE TYPE`` reliably).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0acc8731db0b"
down_revision: Union[str, Sequence[str], None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DO $$ BEGIN
                CREATE TYPE invoicestatus AS ENUM (
                    'draft', 'pending_review', 'finalized', 'synced'
                );
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END $$;
            """
        )
    )
    op.add_column("invoices", sa.Column("confidence", sa.Float(), nullable=True))
    op.add_column(
        "invoices",
        sa.Column(
            "requires_human_review",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    # VARCHAR default ('draft') cannot be cast to invoicestatus automatically; drop first.
    op.execute(sa.text("ALTER TABLE invoices ALTER COLUMN status DROP DEFAULT"))
    op.execute(
        sa.text(
            """
            ALTER TABLE invoices
            ALTER COLUMN status TYPE invoicestatus
            USING (
                CASE trim(lower(status::text))
                    WHEN 'draft' THEN 'draft'::invoicestatus
                    WHEN 'pending_review' THEN 'pending_review'::invoicestatus
                    WHEN 'finalized' THEN 'finalized'::invoicestatus
                    WHEN 'synced' THEN 'synced'::invoicestatus
                    ELSE 'draft'::invoicestatus
                END
            );
            """
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'draft'::invoicestatus"
        )
    )
    op.create_index("ix_invoices_status", "invoices", ["status"], unique=False)
    op.create_index(
        "ix_invoices_pending_review",
        "invoices",
        ["organization_id", "status"],
        unique=False,
        postgresql_where=sa.text(
            "status = 'pending_review'::invoicestatus AND deleted_at IS NULL"
        ),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_invoices_pending_review",
        table_name="invoices",
        postgresql_where=sa.text(
            "status = 'pending_review'::invoicestatus AND deleted_at IS NULL"
        ),
    )
    op.drop_index("ix_invoices_status", table_name="invoices")
    op.drop_column("invoices", "requires_human_review")
    op.drop_column("invoices", "confidence")
    op.execute(sa.text("ALTER TABLE invoices ALTER COLUMN status DROP DEFAULT"))
    op.execute(
        sa.text("ALTER TABLE invoices ALTER COLUMN status TYPE VARCHAR(32) USING status::text;")
    )
    op.execute(sa.text("ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'draft'"))
    op.execute(sa.text("DROP TYPE IF EXISTS invoicestatus;"))
