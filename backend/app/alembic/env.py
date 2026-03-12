import asyncio
import os
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import pool, create_engine
from sqlalchemy.engine import Connection, URL
from sqlalchemy.ext.asyncio import async_engine_from_config
import app.db.database_models
from app.db.base import Base

from alembic import context
from app.config import settings

target_metadata = Base.metadata

# # this is the Alembic Config object, which provides
# # access to the values within the .ini file in use.
# config = context.config

# # Interpret the config file for Python logging.
# # This line sets up loggers basically.
# if config.config_file_name is not None:
#     fileConfig(config.config_file_name)


# --- Resolve DB URL from your settings ---
db_url = (
    settings.ALEMBIC_DATABASE_URL
    or settings.SUPABASE_URI
    or getattr(settings, "DATABASE_URL", None)
)
if not db_url:
    raise RuntimeError("No database URL found in settings.")

db_url = db_url.replace("postgresql://", "postgresql+psycopg://")


# config.set_main_option("sqlalchemy.url", db_url)

# --- Import your metadata (Base) and register all models ---
from app.db.base import Base  # noqa: E402
import app.db.database_models  # noqa: F401,E402


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# def do_run_migrations(connection: Connection):
#     context.configure(
#         connection=connection,
#         target_metadata=target_metadata,
#         compare_type=True,
#         compare_server_default=True,
#     )
#     with context.begin_transaction():
#         context.run_migrations()


def run_migrations_online():
    engine = create_engine(
        db_url,
        poolclass=pool.NullPool,  # pgbouncer-safe
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
