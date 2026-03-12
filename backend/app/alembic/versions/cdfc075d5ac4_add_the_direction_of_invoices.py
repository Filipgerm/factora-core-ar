"""Add the direction of invoices

Revision ID: cdfc075d5ac4
Revises: 3f46d120dd40
Create Date: 2025-11-13 16:47:14.971438

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "cdfc075d5ac4"
down_revision: Union[str, Sequence[str], None] = "3f46d120dd40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1) Create enum type
    op.execute("CREATE TYPE invoice_direction AS ENUM ('RECEIVED', 'TRANSMITTED');")

    invoice_direction_enum = sa.Enum(
        "RECEIVED", "TRANSMITTED", name="invoice_direction"
    )

    # 2) Add column as NULLable first
    op.add_column(
        "aade_invoices",
        sa.Column(
            "direction",
            invoice_direction_enum,
            nullable=True,
        ),
    )

    # 3) Set some value for existing rows
    op.execute(
        "UPDATE aade_invoices " "SET direction = 'RECEIVED' " "WHERE direction IS NULL;"
    )

    # 4) Now enforce NOT NULL
    op.alter_column(
        "aade_invoices",
        "direction",
        existing_type=invoice_direction_enum,
        nullable=False,
    )


def downgrade() -> None:
    invoice_direction_enum = sa.Enum(
        "RECEIVED", "TRANSMITTED", name="invoice_direction"
    )

    op.drop_column("aade_invoices", "direction")
    op.execute("DROP TYPE invoice_direction;")
