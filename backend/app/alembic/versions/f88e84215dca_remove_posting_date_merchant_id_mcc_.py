"""Remove posting_date, merchant_id, mcc, original_amount, original_currency_code from transactions table

Revision ID: f88e84215dca
Revises: da17262e9205
Create Date: 2025-11-05 19:27:20.250766

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f88e84215dca"
down_revision: Union[str, Sequence[str], None] = "da17262e9205"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop indexes for the columns being removed
    op.drop_index("ix_transactions_merchant_id", table_name="transactions")
    op.drop_index("ix_transactions_mcc", table_name="transactions")

    # Drop the columns
    op.drop_column("transactions", "posting_date")
    op.drop_column("transactions", "merchant_id")
    op.drop_column("transactions", "mcc")
    op.drop_column("transactions", "original_amount")
    op.drop_column("transactions", "original_currency_code")


def downgrade() -> None:
    """Downgrade schema."""
    # Add back the columns
    op.add_column("transactions", sa.Column("posting_date", sa.Date(), nullable=True))
    op.add_column("transactions", sa.Column("merchant_id", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("mcc", sa.String(length=4), nullable=True))
    op.add_column(
        "transactions", sa.Column("original_amount", sa.Numeric(18, 2), nullable=True)
    )
    op.add_column(
        "transactions",
        sa.Column("original_currency_code", sa.String(length=3), nullable=True),
    )

    # Recreate indexes
    op.create_index("ix_transactions_merchant_id", "transactions", ["merchant_id"])
    op.create_index("ix_transactions_mcc", "transactions", ["mcc"])
