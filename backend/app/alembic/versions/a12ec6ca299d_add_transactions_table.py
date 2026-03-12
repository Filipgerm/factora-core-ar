"""add transactions table

Revision ID: a12ec6ca299d
Revises: add_providers_table
Create Date: 2025-11-01 16:17:53.864698
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a12ec6ca299d"
down_revision: Union[str, Sequence[str], None] = "add_providers_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Ensure ENUM types exist exactly once (idempotent) ---
    # transaction_status: 'posted' | 'pending'
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'transaction_status'
                ) THEN
                    CREATE TYPE transaction_status AS ENUM ('posted', 'pending');
                END IF;
            END$$;
            """
        )
    )

    # transaction_mode: 'normal' | 'fee' | 'transfer'
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_type WHERE typname = 'transaction_mode'
                ) THEN
                    CREATE TYPE transaction_mode AS ENUM ('normal', 'fee', 'transfer');
                END IF;
            END$$;
            """
        )
    )

    # Use existing types on columns (do NOT try to (re)create them)
    transaction_status_col = postgresql.ENUM(
        name="transaction_status", create_type=False
    )
    transaction_mode_col = postgresql.ENUM(name="transaction_mode", create_type=False)

    # --- Table: transactions ---
    op.create_table(
        "transactions",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "account_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("bank_accounts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", transaction_status_col, nullable=False),
        sa.Column("mode", transaction_mode_col, nullable=False),
        sa.Column(
            "duplicated", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("made_on", sa.Date(), nullable=False),
        sa.Column("posting_date", sa.Date(), nullable=True),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column(
            "currency_code",
            sa.String(length=3),
            nullable=False,
            server_default=sa.text("'EUR'"),
        ),
        sa.Column("category", sa.String(), nullable=True),
        sa.Column("merchant_id", sa.String(), nullable=True),
        sa.Column("mcc", sa.String(length=4), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("original_amount", sa.Numeric(18, 2), nullable=True),
        sa.Column("original_currency_code", sa.String(length=3), nullable=True),
        sa.Column(
            "extra",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    # --- Indexes ---
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"])
    op.create_index("ix_transactions_status", "transactions", ["status"])
    op.create_index("ix_transactions_mode", "transactions", ["mode"])
    op.create_index("ix_transactions_made_on", "transactions", ["made_on"])
    op.create_index("ix_transactions_category", "transactions", ["category"])
    op.create_index("ix_transactions_merchant_id", "transactions", ["merchant_id"])
    op.create_index("ix_transactions_mcc", "transactions", ["mcc"])

    # GIN on JSONB extra (jsonb_path_ops)
    op.create_index(
        "ix_transactions_extra_gin",
        "transactions",
        ["extra"],
        postgresql_using="gin",
        postgresql_ops={"extra": "jsonb_path_ops"},
    )

    # Compound index for windowed scans
    op.create_index(
        "ix_transactions_account_made_on",
        "transactions",
        ["account_id", "made_on"],
    )

    # Partial index for posted-only analytics
    op.create_index(
        "ix_transactions_made_on_posted_only",
        "transactions",
        ["made_on"],
        postgresql_where=sa.text("status = 'posted'"),
    )


def downgrade() -> None:
    # Drop indexes first
    op.drop_index("ix_transactions_made_on_posted_only", table_name="transactions")
    op.drop_index("ix_transactions_account_made_on", table_name="transactions")
    op.drop_index("ix_transactions_extra_gin", table_name="transactions")
    op.drop_index("ix_transactions_mcc", table_name="transactions")
    op.drop_index("ix_transactions_merchant_id", table_name="transactions")
    op.drop_index("ix_transactions_category", table_name="transactions")
    op.drop_index("ix_transactions_made_on", table_name="transactions")
    op.drop_index("ix_transactions_mode", table_name="transactions")
    op.drop_index("ix_transactions_status", table_name="transactions")
    op.drop_index("ix_transactions_account_id", table_name="transactions")

    # Drop table
    op.drop_table("transactions")

    # Drop ENUM types only if nothing depends on them
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
                -- drop transaction_mode if unused
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_depend d
                    JOIN pg_type t ON d.refobjid = t.oid
                    WHERE t.typname = 'transaction_mode'
                      AND d.deptype = 'a'
                ) THEN
                    DROP TYPE IF EXISTS transaction_mode;
                END IF;

                -- drop transaction_status if unused
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_depend d
                    JOIN pg_type t ON d.refobjid = t.oid
                    WHERE t.typname = 'transaction_status'
                      AND d.deptype = 'a'
                ) THEN
                    DROP TYPE IF EXISTS transaction_status;
                END IF;
            END$$;
            """
        )
    )
