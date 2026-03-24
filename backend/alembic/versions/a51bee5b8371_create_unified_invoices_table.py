"""create unified invoices table

Revision ID: a51bee5b8371
Revises: a691a130c62a
Create Date: 2026-03-24 11:07:31.206395

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a51bee5b8371"
down_revision: Union[str, Sequence[str], None] = "a691a130c62a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    invoicesource = postgresql.ENUM(
        "manual",
        "aade",
        "ocr_pdf",
        "csv_import",
        name="invoicesource",
    )
    invoicesource.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "invoices",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("source", invoicesource, nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("counterparty_id", sa.UUID(as_uuid=False), nullable=True),
        sa.Column("counterparty_display_name", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column(
            "currency",
            sa.String(length=3),
            nullable=False,
            server_default="EUR",
        ),
        sa.Column("issue_date", sa.Date(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["counterparty_id"],
            ["counterparties.id"],
            name=op.f("fk_invoices_counterparty_id_counterparties"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_invoices_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_invoices")),
    )
    op.create_index(
        op.f("ix_invoices_organization_id"),
        "invoices",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invoices_source"),
        "invoices",
        ["source"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invoices_counterparty_id"),
        "invoices",
        ["counterparty_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invoices_issue_date"),
        "invoices",
        ["issue_date"],
        unique=False,
    )
    op.create_index(
        op.f("ix_invoices_deleted_at"),
        "invoices",
        ["deleted_at"],
        unique=False,
    )
    op.create_index(
        "ix_invoices_org_source_external",
        "invoices",
        ["organization_id", "source", "external_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_invoices_org_source_external", table_name="invoices")
    op.drop_index(op.f("ix_invoices_deleted_at"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_issue_date"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_counterparty_id"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_source"), table_name="invoices")
    op.drop_index(op.f("ix_invoices_organization_id"), table_name="invoices")
    op.drop_table("invoices")
    invoicesource = postgresql.ENUM(
        "manual",
        "aade",
        "ocr_pdf",
        "csv_import",
        name="invoicesource",
    )
    invoicesource.drop(op.get_bind(), checkfirst=True)
