"""stripe_account_connections (Stripe Connect OAuth linkages)

Creates the ``stripe_account_connections`` table storing one row per
(organization, connected Stripe account). Standard Connect flow only
persists ``stripe_account_id``; Express / Custom flows may populate
``refresh_token_encrypted``.

Revision ID: r9s0t1u2v3w4
Revises: q8r9s0t1u2v3
Create Date: 2026-04-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "r9s0t1u2v3w4"
down_revision = "q8r9s0t1u2v3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stripe_account_connections",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=False),
            primary_key=True,
            nullable=False,
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=False),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("stripe_account_id", sa.String(length=64), nullable=False),
        sa.Column(
            "scope",
            sa.String(length=32),
            nullable=False,
            server_default="read_write",
        ),
        sa.Column("token_type", sa.String(length=32), nullable=True),
        sa.Column(
            "livemode",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "refresh_token_encrypted", sa.String(length=2048), nullable=True
        ),
        sa.Column(
            "connected_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "disconnected_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            "last_webhook_at", sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column("extra", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.UniqueConstraint(
            "organization_id",
            "stripe_account_id",
            name="uq_stripe_acct_org_stripe_account",
        ),
    )
    op.create_index(
        "ix_stripe_account_connections_organization_id",
        "stripe_account_connections",
        ["organization_id"],
    )
    op.create_index(
        "ix_stripe_acct_org_active",
        "stripe_account_connections",
        ["organization_id"],
        postgresql_where=sa.text("disconnected_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_stripe_acct_org_active",
        table_name="stripe_account_connections",
    )
    op.drop_index(
        "ix_stripe_account_connections_organization_id",
        table_name="stripe_account_connections",
    )
    op.drop_table("stripe_account_connections")
