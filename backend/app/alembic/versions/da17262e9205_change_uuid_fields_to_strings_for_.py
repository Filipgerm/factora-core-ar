"""Change UUID fields to strings for SaltEdge compatibility

Revision ID: da17262e9205
Revises: 3a02d2336c09
Create Date: 2025-11-04 19:57:17.156864

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "da17262e9205"
down_revision: Union[str, Sequence[str], None] = "3a02d2336c09"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1) Drop FKs
    op.drop_constraint(
        "fk_transactions_account_id_bank_accounts", "transactions", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_bank_accounts_connection_id_connections",
        "bank_accounts",
        type_="foreignkey",
    )
    op.drop_constraint("consents_connection_id_fkey", "consents", type_="foreignkey")
    op.drop_constraint(
        "fk_connections_customer_id_customers", "connections", type_="foreignkey"
    )

    # 2) Alter columns (parent & child) with explicit casts
    op.alter_column(
        "bank_accounts",
        "id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="id::text",
        existing_nullable=False,
    )
    op.alter_column(
        "bank_accounts",
        "external_connection_id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="external_connection_id::text",
        existing_nullable=False,
    )
    op.alter_column(
        "bank_accounts",
        "connection_id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="connection_id::text",
        existing_nullable=False,
    )

    op.alter_column(
        "connections",
        "id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="id::text",
        existing_nullable=False,
    )
    op.alter_column(
        "connections",
        "customer_id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="customer_id::text",
        existing_nullable=False,
    )

    op.alter_column(
        "consents",
        "id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="id::text",
        existing_nullable=False,
    )
    op.alter_column(
        "consents",
        "connection_id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="connection_id::text",
        existing_nullable=False,
    )

    op.alter_column(
        "customers",
        "id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="id::text",
        existing_nullable=False,
    )

    op.alter_column(
        "transactions",
        "account_id",
        existing_type=sa.UUID(),
        type_=sa.String(),
        postgresql_using="account_id::text",
        existing_nullable=False,
    )
    # (transactions.id is already VARCHAR per your schema, so no change)

    # 3) Recreate FKs (you can keep same names)
    op.create_foreign_key(
        "fk_transactions_account_id_bank_accounts",
        "transactions",
        "bank_accounts",
        ["account_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_bank_accounts_connection_id_connections",
        "bank_accounts",
        "connections",
        ["connection_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "consents_connection_id_fkey",
        "consents",
        "connections",
        ["connection_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_connections_customer_id_customers",
        "connections",
        "customers",
        ["customer_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign key constraints first
    op.drop_constraint(
        "fk_transactions_account_id_bank_accounts", "transactions", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_bank_accounts_connection_id_connections",
        "bank_accounts",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_consents_connection_id_connections", "consents", type_="foreignkey"
    )
    op.drop_constraint(
        "fk_connections_customer_id_customers", "connections", type_="foreignkey"
    )

    # Change column types back
    op.alter_column(
        "transactions",
        "account_id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )
    op.alter_column(
        "customers",
        "id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )
    op.alter_column(
        "consents",
        "connection_id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )
    op.alter_column(
        "consents",
        "id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )
    op.alter_column(
        "connections",
        "customer_id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )
    op.alter_column(
        "connections", "customer_identifier", existing_type=sa.VARCHAR(), nullable=False
    )
    op.alter_column(
        "connections",
        "id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )
    op.alter_column(
        "bank_accounts",
        "connection_id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )
    op.alter_column(
        "bank_accounts",
        "external_connection_id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )
    op.alter_column(
        "bank_accounts",
        "id",
        existing_type=sa.String(),
        type_=sa.UUID(),
        existing_nullable=False,
    )

    # Recreate foreign key constraints
    op.create_foreign_key(
        "fk_transactions_account_id_bank_accounts",
        "transactions",
        "bank_accounts",
        ["account_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_bank_accounts_connection_id_connections",
        "bank_accounts",
        "connections",
        ["connection_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_consents_connection_id_connections",
        "consents",
        "connections",
        ["connection_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_connections_customer_id_customers",
        "connections",
        "customers",
        ["customer_id"],
        ["id"],
    )
    # ### end Alembic commands ###
