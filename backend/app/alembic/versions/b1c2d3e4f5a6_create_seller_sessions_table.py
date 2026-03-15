"""Create seller_sessions table for JWT refresh-token store

Revision ID: b1c2d3e4f5a6
Revises: a08bc05b4f47
Create Date: 2026-03-13 00:00:00.000000

Replaces the single last_access_token column on sellers with a proper
per-session table that stores one hashed refresh token per active session.
The JWT access token is stateless (30-min TTL) and is never stored.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = "a08bc05b4f47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create seller_sessions table and remove legacy token columns from sellers."""
    op.create_table(
        "seller_sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("seller_id", sa.String(32), nullable=False),
        # SHA-256 hex of the opaque refresh token (64 chars)
        sa.Column("refresh_token_hash", sa.String(64), nullable=False),
        # SHA-256 hex of the JWT jti claim — used for forced revocation only
        sa.Column("jti_hash", sa.String(64), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.ForeignKeyConstraint(
            ["seller_id"],
            ["sellers.id"],
            name=op.f("fk_seller_sessions_seller_id_sellers"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_seller_sessions")),
        sa.UniqueConstraint(
            "refresh_token_hash", name=op.f("uq_seller_sessions_refresh_token_hash")
        ),
    )
    op.create_index(
        "ix_seller_sessions_seller_id", "seller_sessions", ["seller_id"], unique=False
    )
    op.create_index(
        "ix_seller_sessions_refresh_token_hash",
        "seller_sessions",
        ["refresh_token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_seller_sessions_expires_at", "seller_sessions", ["expires_at"], unique=False
    )

    # Remove the legacy single-session columns from sellers now that
    # multi-session support lives in seller_sessions.
    op.drop_column("sellers", "last_access_token")
    op.drop_column("sellers", "access_token_expires_at")


def downgrade() -> None:
    """Restore legacy token columns and drop seller_sessions."""
    op.add_column(
        "sellers",
        sa.Column("access_token_expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "sellers",
        sa.Column("last_access_token", sa.String(255), nullable=True),
    )

    op.drop_index("ix_seller_sessions_expires_at", table_name="seller_sessions")
    op.drop_index("ix_seller_sessions_refresh_token_hash", table_name="seller_sessions")
    op.drop_index("ix_seller_sessions_seller_id", table_name="seller_sessions")
    op.drop_table("seller_sessions")
