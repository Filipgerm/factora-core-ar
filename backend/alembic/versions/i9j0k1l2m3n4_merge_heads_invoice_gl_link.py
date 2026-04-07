"""merge alembic heads and link invoices to GL journals

Revision ID: i9j0k1l2m3n4
Revises: e7f8a9b0c1d2, f0e1d2c3b4a5
Create Date: 2026-04-05

Merges parallel branches (Gmail queue status vs GL line CHECK constraints), then
adds optional ``gl_journal_entry_id`` and ``accounting_kind`` on ``invoices``.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "i9j0k1l2m3n4"
down_revision: str | Sequence[str] | None = ("e7f8a9b0c1d2", "f0e1d2c3b4a5")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_invoice_accounting_kind = postgresql.ENUM(
    "ap_expense",
    "ar_revenue",
    "unknown",
    name="invoiceaccountingkind",
    create_type=True,
)


def upgrade() -> None:
    _invoice_accounting_kind.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "invoices",
        sa.Column(
            "gl_journal_entry_id",
            sa.UUID(as_uuid=False),
            nullable=True,
        ),
    )
    op.add_column(
        "invoices",
        sa.Column(
            "accounting_kind",
            _invoice_accounting_kind,
            nullable=True,
        ),
    )
    op.create_index(
        "ix_invoices_gl_journal_entry_id",
        "invoices",
        ["gl_journal_entry_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_invoices_gl_journal_entry_id",
        "invoices",
        "gl_journal_entries",
        ["gl_journal_entry_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_invoices_gl_journal_entry_id", "invoices", type_="foreignkey"
    )
    op.drop_index("ix_invoices_gl_journal_entry_id", table_name="invoices")
    op.drop_column("invoices", "accounting_kind")
    op.drop_column("invoices", "gl_journal_entry_id")
    _invoice_accounting_kind.drop(op.get_bind(), checkfirst=True)
