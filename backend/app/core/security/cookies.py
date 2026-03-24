"""HTTP cookie helpers for auth (refresh token transport)."""

from __future__ import annotations

from datetime import timedelta

from starlette.responses import Response

from app.config import settings

REFRESH_TOKEN_COOKIE = "refresh_token"
REFRESH_TOKEN_COOKIE_PATH = "/v1/auth"
REFRESH_TOKEN_MAX_AGE = int(timedelta(days=7).total_seconds())


def _refresh_cookie_secure() -> bool:
    """Use Secure flag in production so cookies are HTTPS-only."""
    return settings.is_production


def set_refresh_token_cookie(response: Response, raw_refresh: str) -> None:
    """Attach rotated refresh token (opaque string) as an httpOnly cookie."""
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE,
        value=raw_refresh,
        max_age=REFRESH_TOKEN_MAX_AGE,
        httponly=True,
        secure=_refresh_cookie_secure(),
        samesite="lax",
        path=REFRESH_TOKEN_COOKIE_PATH,
    )


def clear_refresh_token_cookie(response: Response) -> None:
    """Remove the refresh cookie (same path/flags as set)."""
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE,
        path=REFRESH_TOKEN_COOKIE_PATH,
        samesite="lax",
        secure=_refresh_cookie_secure(),
    )
