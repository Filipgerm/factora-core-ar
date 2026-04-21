"""link gl_revenue_recognition_schedules to contracts and performance_obligations

Revision ID: k2l3m4n5o6p7
Revises: j1k2l3m4n5o6
Create Date: 2026-04-21

Adds nullable ``contract_id`` + ``performance_obligation_id`` on
``gl_revenue_recognition_schedules``. Once populated, the revrec scheduler
emits one schedule per PO (not per contract), so an audit trail can be
walked in either direction:

    Contract → PerformanceObligation → GlRevenueRecognitionSchedule → …ScheduleLine

Both columns are nullable to allow legacy schedules (MVP bulk imports)
to coexist until backfilled.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "k2l3m4n5o6p7"
down_revision: str | Sequence[str] | None = "j1k2l3m4n5o6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "gl_revenue_recognition_schedules",
        sa.Column("contract_id", sa.UUID(as_uuid=False), nullable=True),
    )
    op.add_column(
        "gl_revenue_recognition_schedules",
        sa.Column("performance_obligation_id", sa.UUID(as_uuid=False), nullable=True),
    )
    op.create_index(
        "ix_gl_rev_sched_contract_id",
        "gl_revenue_recognition_schedules",
        ["contract_id"],
    )
    op.create_index(
        "ix_gl_rev_sched_performance_obligation_id",
        "gl_revenue_recognition_schedules",
        ["performance_obligation_id"],
    )
    op.create_index(
        "ix_gl_rev_sched_org_contract",
        "gl_revenue_recognition_schedules",
        ["organization_id", "contract_id"],
    )
    op.create_index(
        "ix_gl_rev_sched_org_po",
        "gl_revenue_recognition_schedules",
        ["organization_id", "performance_obligation_id"],
    )
    op.create_foreign_key(
        "fk_gl_rev_sched_contract_id",
        "gl_revenue_recognition_schedules",
        "contracts",
        ["contract_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_gl_rev_sched_performance_obligation_id",
        "gl_revenue_recognition_schedules",
        "performance_obligations",
        ["performance_obligation_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_gl_rev_sched_performance_obligation_id",
        "gl_revenue_recognition_schedules",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_gl_rev_sched_contract_id",
        "gl_revenue_recognition_schedules",
        type_="foreignkey",
    )
    op.drop_index("ix_gl_rev_sched_org_po", table_name="gl_revenue_recognition_schedules")
    op.drop_index(
        "ix_gl_rev_sched_org_contract", table_name="gl_revenue_recognition_schedules"
    )
    op.drop_index(
        "ix_gl_rev_sched_performance_obligation_id",
        table_name="gl_revenue_recognition_schedules",
    )
    op.drop_index(
        "ix_gl_rev_sched_contract_id",
        table_name="gl_revenue_recognition_schedules",
    )
    op.drop_column("gl_revenue_recognition_schedules", "performance_obligation_id")
    op.drop_column("gl_revenue_recognition_schedules", "contract_id")
