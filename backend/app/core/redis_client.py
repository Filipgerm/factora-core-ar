"""Lazy Redis client for rate limiting and lightweight SETNX helpers.

**Scope:** Synchronous ``redis`` connection (matches Celery broker); not used on hot
paths that require async.

**Contract:** ``get_redis_client()`` returns a shared pool; callers must handle
connection errors gracefully (e.g. fail open for rate limits in dev).
"""

from __future__ import annotations

import logging
from functools import lru_cache

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_redis_client():
    """Process-wide Redis client (thread-safe connection pool)."""
    import redis as redis_lib

    client = redis_lib.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=2.5,
        socket_timeout=2.5,
    )
    return client
