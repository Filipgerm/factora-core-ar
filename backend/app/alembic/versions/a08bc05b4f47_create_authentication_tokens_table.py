"""Create authentication tokens table

Revision ID: a08bc05b4f47
Revises: e1b9d32e4fc7
Create Date: 2025-11-06 18:37:58.129643

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a08bc05b4f47"
down_revision: Union[str, Sequence[str], None] = "e1b9d32e4fc7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "onboarding_tokens",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("buyer_id", sa.String(length=32), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["buyer_id"],
            ["buyers.id"],
            name=op.f("fk_onboarding_tokens_buyer_id_buyers"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_onboarding_tokens")),
    )
    op.create_index(
        "ix_onboarding_tokens_token", "onboarding_tokens", ["token"], unique=False
    )
    op.create_index(
        "ix_onboarding_tokens_buyer_id", "onboarding_tokens", ["buyer_id"], unique=False
    )
    op.create_index(
        "ix_onboarding_tokens_expires_at",
        "onboarding_tokens",
        ["expires_at"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_onboarding_tokens_expires_at", table_name="onboarding_tokens")
    op.drop_index("ix_onboarding_tokens_buyer_id", table_name="onboarding_tokens")
    op.drop_index("ix_onboarding_tokens_token", table_name="onboarding_tokens")
    op.drop_table("onboarding_tokens")
