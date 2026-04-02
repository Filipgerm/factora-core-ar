"""Fixed-window rate limiting backed by Redis (fail-open when Redis is down).

**Scope:** Auth-sensitive POST endpoints (login, signup brute-force dampening).

**Contract:** ``allow`` returns False when the key has exceeded ``limit`` within
``window_sec``; returns True when allowed or when Redis errors (logged).
"""

from __future__ import annotations

import logging

from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)


class RateLimitService:
    """INCR + EXPIRE fixed window per logical key."""

    def __init__(self, *, key_prefix: str = "factora:rl") -> None:
        self._prefix = key_prefix

    def allow(self, bucket: str, *, limit: int, window_sec: int) -> bool:
        key = f"{self._prefix}:{bucket}"
        try:
            r = get_redis_client()
            n = int(r.incr(key))
            if n == 1:
                r.expire(key, window_sec)
            return n <= limit
        except Exception as e:
            logger.warning("rate_limit redis fail-open key=%s err=%s", key, e)
            return True


def get_rate_limit_service() -> RateLimitService:
    return RateLimitService()
