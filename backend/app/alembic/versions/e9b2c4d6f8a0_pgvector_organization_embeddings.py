"""pgvector extension and organization_embeddings

Revision ID: e9b2c4d6f8a0
Revises: c4a8f2b1d0e3
Create Date: 2026-03-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "e9b2c4d6f8a0"
down_revision: Union[str, Sequence[str], None] = "c4a8f2b1d0e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))
    op.create_table(
        "organization_embeddings",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column(
            "embedding_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_organization_embeddings_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organization_embeddings")),
    )
    op.create_index(
        op.f("ix_organization_embeddings_organization_id"),
        "organization_embeddings",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_org_embeddings_org_created",
        "organization_embeddings",
        ["organization_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_org_embeddings_org_created",
        table_name="organization_embeddings",
    )
    op.drop_index(
        op.f("ix_organization_embeddings_organization_id"),
        table_name="organization_embeddings",
    )
    op.drop_table("organization_embeddings")
    op.execute(sa.text("DROP EXTENSION IF EXISTS vector"))
