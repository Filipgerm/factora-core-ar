"""Unique (schedule_id, period_month) on revenue recognition schedule lines

Revision ID: e8f9a0b1c2d3
Revises: c7d8e9f0a1b2
Create Date: 2026-04-05

Replaces the non-unique composite index with a unique constraint so each
schedule cannot have two rows for the same calendar month.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "e8f9a0b1c2d3"
down_revision: Union[str, Sequence[str], None] = "c7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(
        "ix_gl_rev_sched_lines_sched_month",
        table_name="gl_revenue_recognition_schedule_lines",
    )
    op.create_unique_constraint(
        "uq_gl_rev_sched_lines_sched_month",
        "gl_revenue_recognition_schedule_lines",
        ["schedule_id", "period_month"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_gl_rev_sched_lines_sched_month",
        "gl_revenue_recognition_schedule_lines",
        type_="unique",
    )
    op.create_index(
        "ix_gl_rev_sched_lines_sched_month",
        "gl_revenue_recognition_schedule_lines",
        ["schedule_id", "period_month"],
        unique=False,
    )
