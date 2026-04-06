"""Detect whether general ledger tables exist in the connected database.

Used to avoid 500s when migrations have not been applied yet; GL list endpoints
return empty payloads instead.
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

_GL_LEGAL_ENTITIES = text(
    "SELECT to_regclass('public.gl_legal_entities') IS NOT NULL"
)


async def gl_ledger_schema_installed(db: AsyncSession) -> bool:
    """Return True if the GL migration has been applied (anchor table exists)."""
    result = await db.execute(_GL_LEGAL_ENTITIES)
    return bool(result.scalar())
