"""user_organization_memberships for multi-org users

Revision ID: c4a8f2b1d0e3
Revises: 1bf2ae9903b6
Create Date: 2026-03-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c4a8f2b1d0e3"
down_revision: Union[str, Sequence[str], None] = "1bf2ae9903b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    userrole = postgresql.ENUM(
        "OWNER",
        "ADMIN",
        "EXTERNAL_ACCOUNTANT",
        "VIEWER",
        name="userrole",
        create_type=False,
    )
    op.create_table(
        "user_organization_memberships",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("role", userrole, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_user_organization_memberships_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_user_organization_memberships_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_user_organization_memberships")),
        sa.UniqueConstraint(
            "user_id",
            "organization_id",
            name="uq_user_organization_membership",
        ),
    )
    op.create_index(
        op.f("ix_user_organization_memberships_organization_id"),
        "user_organization_memberships",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_organization_memberships_user_id"),
        "user_organization_memberships",
        ["user_id"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO user_organization_memberships (id, user_id, organization_id, role, created_at)
        SELECT gen_random_uuid(), u.id, u.organization_id, u.role, u.created_at
        FROM users u
        WHERE u.organization_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_user_organization_memberships_user_id"),
        table_name="user_organization_memberships",
    )
    op.drop_index(
        op.f("ix_user_organization_memberships_organization_id"),
        table_name="user_organization_memberships",
    )
    op.drop_table("user_organization_memberships")
