"""GL entry_date, recognition_method, reversed_from_id

Revision ID: c7d8e9f0a1b2
Revises: 4f1f4c1bc0c7
Create Date: 2026-04-05

Adds explicit revenue recognition pattern on schedules, economic event date on
journal entries, and optional link from a reversing entry to the original.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "4f1f4c1bc0c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            DO $$ BEGIN
                CREATE TYPE glrecognitionmethod AS ENUM (
                    'straight_line', 'milestone', 'usage_based'
                );
            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            """
        )
    )
    recognition_enum = postgresql.ENUM(
        "straight_line",
        "milestone",
        "usage_based",
        name="glrecognitionmethod",
        create_type=False,
    )
    op.add_column(
        "gl_revenue_recognition_schedules",
        sa.Column(
            "recognition_method",
            recognition_enum,
            nullable=False,
            server_default=sa.text("'straight_line'::glrecognitionmethod"),
        ),
    )
    op.add_column(
        "gl_journal_entries",
        sa.Column("entry_date", sa.Date(), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE gl_journal_entries
            SET entry_date = COALESCE(
                (posted_at AT TIME ZONE 'UTC')::date,
                (created_at AT TIME ZONE 'UTC')::date
            )
            WHERE entry_date IS NULL
            """
        )
    )
    op.alter_column(
        "gl_journal_entries",
        "entry_date",
        existing_type=sa.Date(),
        nullable=False,
    )
    op.add_column(
        "gl_journal_entries",
        sa.Column("reversed_from_id", sa.UUID(as_uuid=False), nullable=True),
    )
    op.create_foreign_key(
        op.f("fk_gl_journal_entries_reversed_from_id_gl_journal_entries"),
        "gl_journal_entries",
        "gl_journal_entries",
        ["reversed_from_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        op.f("ix_gl_journal_entries_reversed_from_id"),
        "gl_journal_entries",
        ["reversed_from_id"],
        unique=False,
    )
    op.alter_column(
        "gl_revenue_recognition_schedules",
        "recognition_method",
        server_default=None,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_gl_journal_entries_reversed_from_id"),
        table_name="gl_journal_entries",
    )
    op.drop_constraint(
        op.f("fk_gl_journal_entries_reversed_from_id_gl_journal_entries"),
        "gl_journal_entries",
        type_="foreignkey",
    )
    op.drop_column("gl_journal_entries", "reversed_from_id")
    op.drop_column("gl_journal_entries", "entry_date")
    op.drop_column("gl_revenue_recognition_schedules", "recognition_method")
    op.execute(sa.text("DROP TYPE IF EXISTS glrecognitionmethod"))
