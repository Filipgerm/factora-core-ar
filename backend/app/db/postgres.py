from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from supabase import create_client, Client
from typing import Union, IO, Optional, Dict, Any
import anyio
from app.db.base import Base
from sqlalchemy import pool
import ssl


# Import all models to ensure they are registered with Base
# Note: Import happens after Base is defined to avoid circular imports

supabase: Optional[Client] = None

# Initialize these at runtime to avoid import-time errors
SUPABASE_BUCKET = None
DATABASE_URI = None
SUPABASE_URI_SHARED_POOLER = None
SUPABASE_URL = None
SUPABASE_SECRET_KEY = None
engine = None
AsyncSessionLocal = None


def _initialize_database():
    """Initialize database connection and settings"""
    global SUPABASE_BUCKET, DATABASE_URI, SUPABASE_URL, SUPABASE_SECRET_KEY, engine, AsyncSessionLocal

    try:
        from app.config import settings

        SUPABASE_BUCKET = settings.SUPABASE_BUCKET
        DATABASE_URI = settings.SUPABASE_URI_SHARED_POOLER or settings.SUPABASE_URI
        SUPABASE_URL = settings.SUPABASE_URL
        SUPABASE_SECRET_KEY = settings.SUPABASE_SECRET_KEY

        # Ensure the URI is in the correct format for asyncpg
        if not DATABASE_URI.startswith("postgresql+asyncpg://"):
            DATABASE_URI = DATABASE_URI.replace(
                "postgresql://", "postgresql+asyncpg://"
            )
        # engine = create_async_engine(
        #     DATABASE_URI,
        #     echo=False,
        #     future=True,
        #     poolclass=pool.NullPool,
        #     pool_pre_ping=True,  # kill stale sockets early
        #     connect_args={
        #         "statement_cache_size": 0,
        #         "prepared_statement_cache_size": 0,
        #         "server_settings": {
        #             "jit": "off",  # Disable JIT for more predictable behavior
        #         },
        #     },
        # ).execution_options(compiled_cache=None)

        engine = create_async_engine(
            DATABASE_URI,
            # echo=False,
            # future=True,
            pool_size=5,
            max_overflow=0,
            pool_timeout=5,
            pool_pre_ping=True,
            connect_args={
                "statement_cache_size": 0,
                "prepared_statement_cache_size": 0,
            },
        ).execution_options(compiled_cache=None)

        AsyncSessionLocal = async_sessionmaker(
            bind=engine, expire_on_commit=False, class_=AsyncSession
        )

    except Exception as e:
        print(f"❌ Failed to initialize database settings: {e}")
        raise RuntimeError(
            "Failed to load required environment variables. Please check your .env file."
        )


# Initialize on first import
_initialize_database()


async def connect_to_database():
    """Test DB connection and create tables."""
    try:

        async with engine.begin() as conn:
            # optional: guard by env, e.g., if settings.ENV == "dev":
            # await conn.run_sync(Base.metadata.create_all)
            print("✅ PostgreSQL connected & tables ensured")

        # Initialize Supabase client for file storage
        connect_to_supabase()

    except Exception as e:
        print(f"❌ Failed to connect to database: {e}")
        raise


async def close_database_connection():
    """Close engine on shutdown."""
    await engine.dispose()
    print("🛑 PostgreSQL connection closed")


async def get_db_session():
    """FastAPI dependency: yields a new session per request."""
    async with AsyncSessionLocal() as session:
        yield session


# ---- Supabase (Storage) ----


def connect_to_supabase():
    """
    Initialize the Supabase client for DB helpers, Storage, etc.
    """
    global supabase
    if supabase is None:
        url = SUPABASE_URL
        key = SUPABASE_SECRET_KEY
        if not url or not key:
            raise RuntimeError("SUPABASE_URL or SUPABASE_SECRET_KEY missing")
        supabase = create_client(url, key)
        print("✅ Supabase client initialized")
    return supabase


def get_supabase() -> Client:
    global supabase
    if supabase is None:
        raise RuntimeError(
            "Supabase not initialized — call connect_to_supabase() first"
        )
    return supabase


# async def ensure_supabase_bucket() -> None:
#     """
#     Optional: call at startup to make sure the bucket exists.
#     Requires service role key.
#     """
#     supabase = get_supabase()

#     def _ensure_bucket_sync():
#         storage = supabase.storage
#         # list buckets and create if missing
#         buckets = storage.list_buckets()
#         names = {b["name"] for b in buckets} if buckets else set()
#         if SUPABASE_BUCKET not in names:
#             storage.create_bucket(SUPABASE_BUCKET, public=True)

#     await anyio.to_thread.run_sync(_ensure_bucket_sync)
#     print(f"✅ Supabase bucket ready: {SUPABASE_BUCKET}")

# app/services/storage_service.py
