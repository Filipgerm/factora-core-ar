"""gl_revenue_recognition_schedules: contract_id + performance_obligation_id NOT NULL + RESTRICT

A revenue recognition schedule without an owning ``Contract`` and
``PerformanceObligation`` is meaningless — it represents "recognize X
over time for nobody". The IFRS 15 unit of recognition is the PO, so the
FKs must be present on every row.

Changes
-------
* ``contract_id``: NULL → NOT NULL, ``ON DELETE SET NULL`` → ``ON DELETE RESTRICT``
* ``performance_obligation_id``: NULL → NOT NULL, ``ON DELETE SET NULL`` → ``ON DELETE RESTRICT``

``ON DELETE RESTRICT`` prevents a contract / PO from being hard-deleted
while active financial artifacts point at it — the cascade in
``Contract.performance_obligations`` is CASCADE (POs go away when the
contract is deleted) but upstream callers must first void the schedule
(or soft-delete the contract via ``deleted_at``).

Pre-flight
----------
If any schedules exist with NULL keys, they must be backfilled OR
deleted first. The current MVP has **no** production schedules yet
(``RevenueRecognitionService.build_schedule`` is still unimplemented),
so the migration applies cleanly. A ``DELETE FROM
gl_revenue_recognition_schedules WHERE contract_id IS NULL OR
performance_obligation_id IS NULL`` is included as a belt-and-suspenders
step — no-op on clean systems, destructive only for orphans.

Revision ID: w4x5y6z7a8b9
Revises: v3w4x5y6z7a8
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "w4x5y6z7a8b9"
down_revision = "v3w4x5y6z7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Guard against any orphan rows inherited from earlier development
    # data. Safe to run on clean databases — the WHERE clause makes it a
    # no-op. Production MUST NOT hit this branch because the writer has
    # not shipped yet.
    op.execute(
        "DELETE FROM gl_revenue_recognition_schedules "
        "WHERE contract_id IS NULL OR performance_obligation_id IS NULL"
    )

    # --- Drop old FK constraints (named by SQLAlchemy auto-naming).
    op.execute(
        """
        DO $$
        DECLARE
            fk RECORD;
        BEGIN
            FOR fk IN
                SELECT conname
                  FROM pg_constraint
                 WHERE conrelid = 'gl_revenue_recognition_schedules'::regclass
                   AND contype = 'f'
                   AND conname LIKE '%contract_id%'
            LOOP
                EXECUTE format(
                    'ALTER TABLE gl_revenue_recognition_schedules DROP CONSTRAINT %I',
                    fk.conname
                );
            END LOOP;

            FOR fk IN
                SELECT conname
                  FROM pg_constraint
                 WHERE conrelid = 'gl_revenue_recognition_schedules'::regclass
                   AND contype = 'f'
                   AND conname LIKE '%performance_obligation_id%'
            LOOP
                EXECUTE format(
                    'ALTER TABLE gl_revenue_recognition_schedules DROP CONSTRAINT %I',
                    fk.conname
                );
            END LOOP;
        END$$;
        """
    )

    # --- NOT NULL enforcement
    op.alter_column(
        "gl_revenue_recognition_schedules",
        "contract_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=False),
        nullable=False,
    )
    op.alter_column(
        "gl_revenue_recognition_schedules",
        "performance_obligation_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=False),
        nullable=False,
    )

    # --- Recreate FK constraints with RESTRICT semantics
    op.create_foreign_key(
        "fk_gl_rev_sched_contract_id",
        "gl_revenue_recognition_schedules",
        "contracts",
        ["contract_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_gl_rev_sched_po_id",
        "gl_revenue_recognition_schedules",
        "performance_obligations",
        ["performance_obligation_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_gl_rev_sched_po_id",
        "gl_revenue_recognition_schedules",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_gl_rev_sched_contract_id",
        "gl_revenue_recognition_schedules",
        type_="foreignkey",
    )
    op.alter_column(
        "gl_revenue_recognition_schedules",
        "performance_obligation_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=False),
        nullable=True,
    )
    op.alter_column(
        "gl_revenue_recognition_schedules",
        "contract_id",
        existing_type=sa.dialects.postgresql.UUID(as_uuid=False),
        nullable=True,
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
        "fk_gl_rev_sched_po_id",
        "gl_revenue_recognition_schedules",
        "performance_obligations",
        ["performance_obligation_id"],
        ["id"],
        ondelete="SET NULL",
    )
