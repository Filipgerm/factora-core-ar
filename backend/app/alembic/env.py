import asyncio
import os
from logging.config import fileConfig
from sqlalchemy import create_engine, pool

from alembic import context
from app.config import settings
from app.db.base import Base

# Import all domain model modules so SQLAlchemy's metadata is fully populated
# before Alembic inspects it for autogenerate.
import app.db.models.identity       # noqa: F401
import app.db.models.counterparty   # noqa: F401
import app.db.models.alerts         # noqa: F401
import app.db.models.banking        # noqa: F401
import app.db.models.aade           # noqa: F401
import app.db.models.files          # noqa: F401
import app.db.models.embeddings     # noqa: F401

target_metadata = Base.metadata

db_url = (
    settings.ALEMBIC_DATABASE_URL
    or settings.SUPABASE_URI
)
if not db_url:
    raise RuntimeError("No database URL found in settings.")

db_url = db_url.replace("postgresql://", "postgresql+psycopg://")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection needed)."""
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    engine = create_engine(
        db_url,
        poolclass=pool.NullPool,
        future=True,
    )
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
