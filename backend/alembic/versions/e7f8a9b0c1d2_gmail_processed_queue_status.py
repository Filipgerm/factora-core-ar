"""gmail_processed_queue_status

Revision ID: e7f8a9b0c1d2
Revises: d1e2f3a4b5c6
Create Date: 2026-04-01

Adds Celery queue observability and mailbox hint to ``gmail_processed_messages``.
Existing rows are backfilled as ``completed`` (historical successful ingests).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "e7f8a9b0c1d2"
down_revision: str | None = "d1e2f3a4b5c6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "gmail_processed_messages",
        sa.Column(
            "ingest_status",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'completed'"),
        ),
    )
    op.add_column(
        "gmail_processed_messages",
        sa.Column("celery_task_id", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "gmail_processed_messages",
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.add_column(
        "gmail_processed_messages",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.add_column(
        "gmail_processed_messages",
        sa.Column("mailbox_google_email", sa.String(length=320), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("gmail_processed_messages", "mailbox_google_email")
    op.drop_column("gmail_processed_messages", "updated_at")
    op.drop_column("gmail_processed_messages", "error_message")
    op.drop_column("gmail_processed_messages", "celery_task_id")
    op.drop_column("gmail_processed_messages", "ingest_status")
