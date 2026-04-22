"""rename customers → saltedge_customers

SaltEdge's customer concept is a banking integration detail, not a business
"customer". Rename the table (and rename indexes / FKs / constraints /
sequences) so the schema self-describes. The ORM class stays as
``CustomerModel`` to minimize caller churn; only the underlying table changes.

Revision ID: s0t1u2v3w4x5
Revises: r9s0t1u2v3w4
Create Date: 2026-04-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "s0t1u2v3w4x5"
down_revision = "r9s0t1u2v3w4"
branch_labels = None
depends_on = None


_OLD = "customers"
_NEW = "saltedge_customers"


def _exists(bind, kind: str, name: str) -> bool:
    """Return True if a Postgres object of the given kind/name exists."""
    if kind == "index":
        q = sa.text(
            "SELECT 1 FROM pg_indexes WHERE indexname = :n LIMIT 1"
        )
    elif kind == "constraint":
        q = sa.text(
            "SELECT 1 FROM pg_constraint WHERE conname = :n LIMIT 1"
        )
    elif kind == "table":
        q = sa.text(
            "SELECT 1 FROM information_schema.tables WHERE table_name = :n LIMIT 1"
        )
    else:
        raise ValueError(f"unknown kind: {kind}")
    return bind.execute(q, {"n": name}).first() is not None


def upgrade() -> None:
    bind = op.get_bind()
    if not _exists(bind, "table", _OLD):
        return

    op.rename_table(_OLD, _NEW)

    # Rename sequences/PKs/FKs/indexes/constraints deterministically so pg_dump
    # output is stable and callers querying pg_catalog by name keep working.
    rename_map: list[tuple[str, str, str]] = [
        # (kind, old, new)
        ("index", "ix_customers_identifier", "ix_saltedge_customers_identifier"),
        ("index", "ix_customers_email", "ix_saltedge_customers_email"),
        (
            "index",
            "ix_customers_organization_id",
            "ix_saltedge_customers_organization_id",
        ),
        (
            "constraint",
            "uq_customers_identifier",
            "uq_saltedge_customers_identifier",
        ),
        ("constraint", "uq_customers_email", "uq_saltedge_customers_email"),
        (
            "constraint",
            "customer_categorization_chk",
            "saltedge_customer_categorization_chk",
        ),
    ]

    for kind, old, new in rename_map:
        if kind == "index" and _exists(bind, "index", old):
            op.execute(sa.text(f'ALTER INDEX "{old}" RENAME TO "{new}"'))
        elif kind == "constraint" and _exists(bind, "constraint", old):
            op.execute(
                sa.text(
                    f'ALTER TABLE "{_NEW}" RENAME CONSTRAINT "{old}" TO "{new}"'
                )
            )

    # Rename the connections→customers FK so it reflects the new parent.
    fk_old = "fk_connections_customer_id_customers"
    fk_new = "fk_connections_customer_id_saltedge_customers"
    if _exists(bind, "constraint", fk_old):
        op.execute(
            sa.text(
                f'ALTER TABLE "connections" RENAME CONSTRAINT "{fk_old}" TO "{fk_new}"'
            )
        )


def downgrade() -> None:
    bind = op.get_bind()
    if not _exists(bind, "table", _NEW):
        return

    op.rename_table(_NEW, _OLD)

    rename_map: list[tuple[str, str, str]] = [
        ("index", "ix_saltedge_customers_identifier", "ix_customers_identifier"),
        ("index", "ix_saltedge_customers_email", "ix_customers_email"),
        (
            "index",
            "ix_saltedge_customers_organization_id",
            "ix_customers_organization_id",
        ),
        (
            "constraint",
            "uq_saltedge_customers_identifier",
            "uq_customers_identifier",
        ),
        ("constraint", "uq_saltedge_customers_email", "uq_customers_email"),
        (
            "constraint",
            "saltedge_customer_categorization_chk",
            "customer_categorization_chk",
        ),
    ]

    for kind, old, new in rename_map:
        if kind == "index" and _exists(bind, "index", old):
            op.execute(sa.text(f'ALTER INDEX "{old}" RENAME TO "{new}"'))
        elif kind == "constraint" and _exists(bind, "constraint", old):
            op.execute(
                sa.text(
                    f'ALTER TABLE "{_OLD}" RENAME CONSTRAINT "{old}" TO "{new}"'
                )
            )

    fk_old = "fk_connections_customer_id_saltedge_customers"
    fk_new = "fk_connections_customer_id_customers"
    if _exists(bind, "constraint", fk_old):
        op.execute(
            sa.text(
                f'ALTER TABLE "connections" RENAME CONSTRAINT "{fk_old}" TO "{fk_new}"'
            )
        )
