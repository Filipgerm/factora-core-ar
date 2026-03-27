"""Gmail OAuth tables, invoicesource gmail, embeddings vector(768)

Revision ID: b3c4d5e6f7a8
Revises: f8e1c2d9b0a4
Create Date: 2026-03-26

**PostgreSQL enum:** ``ALTER TYPE invoicesource ADD VALUE IF NOT EXISTS 'gmail'`` is
idempotent (safe if ``gmail`` already exists).

**organization_embeddings.embedding (1536 → 768):**

- This revision uses ``USING subvector(embedding::vector, 1, 768)``, which **truncates**
  each stored vector to the first 768 dimensions. Semantic meaning of old rows changes;
  for production you may prefer ``TRUNCATE organization_embeddings`` (or delete-all) and
  **re-embed** after deploy so neighbors match the new model.
- **Indexes:** No HNSW/IVFFlat index exists on ``embedding`` in prior migrations—only
  B-tree indexes on ``organization_id`` and ``(organization_id, created_at)``, so no
  vector index drop/recreate is required.
- **Application:** Set ``EMBEDDING_DIMENSIONS=768`` and an embedding provider that outputs
  768 floats (Gemini ``text-embedding-004``, matching ``all-mpnet-base-v2``, etc.).

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, Sequence[str], None] = "f8e1c2d9b0a4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TYPE invoicesource ADD VALUE IF NOT EXISTS 'gmail'"))

    op.execute(
        sa.text(
            """
            ALTER TABLE organization_embeddings
            ALTER COLUMN embedding TYPE vector(768)
            USING subvector(embedding::vector, 1, 768)
            """
        )
    )

    op.create_table(
        "gmail_mailbox_connections",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("google_email", sa.String(length=320), nullable=False),
        sa.Column("encrypted_refresh_token", sa.Text(), nullable=False),
        sa.Column("scopes", sa.Text(), nullable=False, server_default=""),
        sa.Column("history_id", sa.String(length=32), nullable=True),
        sa.Column("watch_expiration", sa.DateTime(timezone=True), nullable=True),
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
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gmail_mailbox_connections_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_gmail_mailbox_connections_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gmail_mailbox_connections")),
        sa.UniqueConstraint(
            "organization_id",
            "google_email",
            name="uq_gmail_mailbox_org_email",
        ),
    )
    op.create_index(
        op.f("ix_gmail_mailbox_connections_organization_id"),
        "gmail_mailbox_connections",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_gmail_mailbox_connections_user_id"),
        "gmail_mailbox_connections",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_gmail_mailbox_google_email",
        "gmail_mailbox_connections",
        ["google_email"],
        unique=False,
    )

    op.create_table(
        "gmail_processed_messages",
        sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("organization_id", sa.UUID(as_uuid=False), nullable=False),
        sa.Column("gmail_message_id", sa.String(length=128), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_gmail_processed_messages_organization_id_organizations"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_gmail_processed_messages")),
        sa.UniqueConstraint(
            "organization_id",
            "gmail_message_id",
            name="uq_gmail_processed_org_message",
        ),
    )
    op.create_index(
        op.f("ix_gmail_processed_messages_organization_id"),
        "gmail_processed_messages",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_gmail_processed_org_created",
        "gmail_processed_messages",
        ["organization_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    """Drop Gmail tables only. Enum value ``gmail`` and ``vector(768)`` are not reverted."""
    op.drop_index(
        "ix_gmail_processed_org_created",
        table_name="gmail_processed_messages",
    )
    op.drop_index(
        op.f("ix_gmail_processed_messages_organization_id"),
        table_name="gmail_processed_messages",
    )
    op.drop_table("gmail_processed_messages")

    op.drop_index(
        "ix_gmail_mailbox_google_email",
        table_name="gmail_mailbox_connections",
    )
    op.drop_index(
        op.f("ix_gmail_mailbox_connections_user_id"),
        table_name="gmail_mailbox_connections",
    )
    op.drop_index(
        op.f("ix_gmail_mailbox_connections_organization_id"),
        table_name="gmail_mailbox_connections",
    )
    op.drop_table("gmail_mailbox_connections")
