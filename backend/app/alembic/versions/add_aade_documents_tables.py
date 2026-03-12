"""Add AADE documents and invoices tables

Revision ID: b5c8d9e2f1a3
Revises: a08bc05b4f47
Create Date: 2025-11-12 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b5c8d9e2f1a3"
down_revision: Union[str, Sequence[str], None] = "a08bc05b4f47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create aade_documents table
    op.create_table(
        "aade_documents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("buyer_id", sa.String(length=32), nullable=False),
        sa.Column("raw_xml", sa.Text(), nullable=True),
        sa.Column("raw_json", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "query_params", postgresql.JSONB(), nullable=False, server_default="{}"
        ),
        sa.Column("continuation_token", postgresql.JSONB(), nullable=True),
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
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
        sa.ForeignKeyConstraint(
            ["buyer_id"],
            ["buyers.id"],
            name=op.f("fk_aade_documents_buyer_id_buyers"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_aade_documents")),
    )

    # Create indexes for aade_documents
    op.create_index(
        "ix_aade_documents_buyer_id", "aade_documents", ["buyer_id"], unique=False
    )
    op.create_index(
        "ix_aade_documents_fetched_at", "aade_documents", ["fetched_at"], unique=False
    )

    # Create aade_invoices table
    op.create_table(
        "aade_invoices",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("document_id", sa.String(length=32), nullable=False),
        sa.Column("uid", sa.String(length=100), nullable=True),
        sa.Column("mark", sa.Integer(), nullable=True),
        sa.Column("authentication_code", sa.String(length=200), nullable=True),
        sa.Column("issuer_vat", sa.String(length=20), nullable=True),
        sa.Column("issuer_country", sa.String(length=2), nullable=True),
        sa.Column("issuer_branch", sa.Integer(), nullable=True),
        sa.Column("counterpart_vat", sa.String(length=20), nullable=True),
        sa.Column("counterpart_country", sa.String(length=2), nullable=True),
        sa.Column("counterpart_branch", sa.Integer(), nullable=True),
        sa.Column("series", sa.String(length=50), nullable=True),
        sa.Column("aa", sa.String(length=50), nullable=True),
        sa.Column("issue_date", sa.Date(), nullable=True),
        sa.Column("invoice_type", sa.String(length=50), nullable=True),
        sa.Column("currency", sa.String(length=3), nullable=True),
        sa.Column("total_net_value", sa.Numeric(18, 2), nullable=True),
        sa.Column("total_vat_amount", sa.Numeric(18, 2), nullable=True),
        sa.Column("total_gross_value", sa.Numeric(18, 2), nullable=True),
        sa.Column(
            "normalized_data", postgresql.JSONB(), nullable=False, server_default="{}"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["aade_documents.id"],
            name=op.f("fk_aade_invoices_document_id_aade_documents"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_aade_invoices")),
    )

    # Create indexes for aade_invoices
    op.create_index(
        "ix_aade_invoices_document_id", "aade_invoices", ["document_id"], unique=False
    )
    op.create_index("ix_aade_invoices_uid", "aade_invoices", ["uid"], unique=False)
    op.create_index("ix_aade_invoices_mark", "aade_invoices", ["mark"], unique=False)
    op.create_index(
        "ix_aade_invoices_issue_date", "aade_invoices", ["issue_date"], unique=False
    )
    op.create_index(
        "ix_aade_invoices_invoice_type", "aade_invoices", ["invoice_type"], unique=False
    )
    op.create_index(
        "ix_aade_invoices_issuer_vat", "aade_invoices", ["issuer_vat"], unique=False
    )
    op.create_index(
        "ix_aade_invoices_counterpart_vat",
        "aade_invoices",
        ["counterpart_vat"],
        unique=False,
    )
    op.create_index(
        "ix_aade_invoices_date_type",
        "aade_invoices",
        ["issue_date", "invoice_type"],
        unique=False,
    )
    op.drop_index(op.f("ix_buyers_phone"), table_name="buyers")
    op.create_index("ix_buyer_email", "buyers", ["email"], unique=False)
    op.create_index("ix_buyer_phone", "buyers", ["phone_number"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes for aade_invoices
    op.drop_index(op.f("ix_buyers_phone"), table_name="buyers")
    op.create_index("ix_buyer_email", "buyers", ["email"], unique=False)
    op.create_index("ix_buyer_phone", "buyers", ["phone_number"], unique=False)
    op.drop_index("ix_aade_invoices_date_type", table_name="aade_invoices")
    op.drop_index("ix_aade_invoices_counterpart_vat", table_name="aade_invoices")
    op.drop_index("ix_aade_invoices_issuer_vat", table_name="aade_invoices")
    op.drop_index("ix_aade_invoices_invoice_type", table_name="aade_invoices")
    op.drop_index("ix_aade_invoices_issue_date", table_name="aade_invoices")
    op.drop_index("ix_aade_invoices_mark", table_name="aade_invoices")
    op.drop_index("ix_aade_invoices_uid", table_name="aade_invoices")
    op.drop_index("ix_aade_invoices_document_id", table_name="aade_invoices")

    # Drop aade_invoices table
    op.drop_table("aade_invoices")

    # Drop indexes for aade_documents
    op.drop_index("ix_aade_documents_fetched_at", table_name="aade_documents")
    op.drop_index("ix_aade_documents_buyer_id", table_name="aade_documents")

    # Drop aade_documents table
    op.drop_table("aade_documents")
