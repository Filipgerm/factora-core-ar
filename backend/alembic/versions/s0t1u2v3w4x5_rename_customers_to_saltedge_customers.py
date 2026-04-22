"""rename customers → saltedge_customers

SaltEdge's customer concept is a banking integration detail, not a business
"customer". Rename the table (and rename indexes / FKs / constraints /
sequences) so the schema self-describes. The ORM class stays as
``CustomerModel`` to minimize caller churn; only the underlying table changes.

Works in both **offline** (``--sql``) and **online** Alembic modes by
using Postgres-native ``IF EXISTS`` guards and DO blocks (no Python-side
introspection of the bind, which returns ``None`` in offline mode).

Revision ID: s0t1u2v3w4x5
Revises: r9s0t1u2v3w4
Create Date: 2026-04-21
"""

from __future__ import annotations

from alembic import op

revision = "s0t1u2v3w4x5"
down_revision = "r9s0t1u2v3w4"
branch_labels = None
depends_on = None


_OLD = "customers"
_NEW = "saltedge_customers"


def _rename_constraint_if_exists(table: str, old: str, new: str) -> str:
    """Return a DO block that renames a table constraint iff it exists."""
    return f"""
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = '{old}'
    ) THEN
        EXECUTE 'ALTER TABLE "{table}" RENAME CONSTRAINT "{old}" TO "{new}"';
    END IF;
END
$$;
"""


def upgrade() -> None:
    op.execute(f'ALTER TABLE IF EXISTS "{_OLD}" RENAME TO "{_NEW}"')

    index_renames: list[tuple[str, str]] = [
        ("ix_customers_identifier", "ix_saltedge_customers_identifier"),
        ("ix_customers_email", "ix_saltedge_customers_email"),
        ("ix_customers_organization_id", "ix_saltedge_customers_organization_id"),
    ]
    for old, new in index_renames:
        op.execute(f'ALTER INDEX IF EXISTS "{old}" RENAME TO "{new}"')

    constraint_renames: list[tuple[str, str, str]] = [
        (_NEW, "uq_customers_identifier", "uq_saltedge_customers_identifier"),
        (_NEW, "uq_customers_email", "uq_saltedge_customers_email"),
        (
            _NEW,
            "customer_categorization_chk",
            "saltedge_customer_categorization_chk",
        ),
        (
            "connections",
            "fk_connections_customer_id_customers",
            "fk_connections_customer_id_saltedge_customers",
        ),
    ]
    for table, old, new in constraint_renames:
        op.execute(_rename_constraint_if_exists(table, old, new))


def downgrade() -> None:
    op.execute(f'ALTER TABLE IF EXISTS "{_NEW}" RENAME TO "{_OLD}"')

    index_renames: list[tuple[str, str]] = [
        ("ix_saltedge_customers_identifier", "ix_customers_identifier"),
        ("ix_saltedge_customers_email", "ix_customers_email"),
        ("ix_saltedge_customers_organization_id", "ix_customers_organization_id"),
    ]
    for old, new in index_renames:
        op.execute(f'ALTER INDEX IF EXISTS "{old}" RENAME TO "{new}"')

    constraint_renames: list[tuple[str, str, str]] = [
        (_OLD, "uq_saltedge_customers_identifier", "uq_customers_identifier"),
        (_OLD, "uq_saltedge_customers_email", "uq_customers_email"),
        (
            _OLD,
            "saltedge_customer_categorization_chk",
            "customer_categorization_chk",
        ),
        (
            "connections",
            "fk_connections_customer_id_saltedge_customers",
            "fk_connections_customer_id_customers",
        ),
    ]
    for table, old, new in constraint_renames:
        op.execute(_rename_constraint_if_exists(table, old, new))
