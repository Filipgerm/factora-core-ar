"""FastAPI application factory for Factora backend.

Middleware stack (applied in reverse order — last added = first executed):
  1. RequestIDMiddleware  — injects X-Request-ID for end-to-end tracing
  2. ProxyHeadersMiddleware — reads X-Forwarded-For / X-Forwarded-Proto from
                              nginx so request.client.host and request.url.scheme
                              reflect the real browser values
  3. TrustedHostMiddleware  — validates the Host header against ALLOWED_HOSTS
                               to prevent host-header injection
  4. CORSMiddleware         — handles Access-Control-* headers for browser
                               cross-origin requests

Note on middleware ordering in FastAPI/Starlette:
  ``app.add_middleware(X)`` prepends X to the middleware stack, so the last
  ``add_middleware`` call executes FIRST on incoming requests.  The ordering
  above matches the intended execution order.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.routes.auth_routes import router as auth_router
from app.api.routes.dashboard_routes import router as dashboard_router
from app.api.routes.file_routes import router as file_router
from app.api.routes.gemi_routes import router as companies_router
from app.api.routes.mydata_routes import router as aade_router
from app.api.routes.onboarding_routes import router as onboarding_router
from app.api.routes.saltedge_routes import router as saltedge_router
from app.config import settings
from app.db.postgres import close_database_connection, connect_to_database
from app.middleware.request_id import RequestIDMiddleware


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database connection lifecycle for the FastAPI app."""
    await connect_to_database()
    yield
    await close_database_connection()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _parse_comma_list(value: str) -> list[str]:
    """Split a comma-separated setting string into a cleaned list.

    Args:
        value: Raw setting string (e.g. ``"a.eu,b.eu"``).

    Returns:
        List of non-empty stripped strings.
    """
    return [item.strip() for item in value.split(",") if item.strip()]


def get_cors_origins() -> list[str]:
    """Parse and return the list of allowed CORS origins from settings.

    An empty ``CORS_ORIGINS`` string disables cross-origin access (production
    default).  ``"*"`` is accepted for local development only.

    Returns:
        List of allowed origin strings.
    """
    raw = settings.CORS_ORIGINS.strip()
    if not raw:
        return []
    if raw == "*":
        return ["*"]
    return _parse_comma_list(raw)


def get_allowed_hosts() -> list[str]:
    """Parse and return the list of allowed Host header values.

    Returns:
        List of allowed hostnames.  ``["*"]`` permits all hosts (dev only).
    """
    raw = settings.ALLOWED_HOSTS.strip()
    if not raw or raw == "*":
        return ["*"]
    return _parse_comma_list(raw)


def get_trusted_proxies() -> list[str]:
    """Parse trusted proxy IPs/CIDRs for ProxyHeadersMiddleware.

    Returns:
        List of trusted proxy IP strings, or ``["*"]`` to trust all.
    """
    raw = settings.TRUSTED_PROXIES.strip()
    if not raw or raw == "*":
        return ["*"]
    return _parse_comma_list(raw)


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Factora API",
    description="Production-ready accounts-receivable and open banking platform.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware stack
# Note: add_middleware PREPENDS to the stack, so the order below is REVERSED
# at runtime.  CORS must be outermost (added last) to handle preflight before
# TrustedHost rejects unknown hosts.
# ---------------------------------------------------------------------------

# 1. RequestIDMiddleware — innermost, runs last on request / first on response.
# Injects X-Request-ID so all log lines for a request share a traceable ID.
app.add_middleware(RequestIDMiddleware)

# 2. ProxyHeadersMiddleware — reads X-Forwarded-For and X-Forwarded-Proto
# set by nginx so that:
#   - request.client.host == real browser IP (needed for rate limiting & logs)
#   - request.url.scheme  == "https"          (needed for redirect URLs, Secure cookies)
# trusted_hosts restricts which proxy IPs we trust to set these headers.
# Docker bridge network is 172.16.0.0/12 by default; use "*" only in dev.
trusted_proxies = get_trusted_proxies()
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=trusted_proxies)


# 3. TrustedHostMiddleware — prevents Host-header injection attacks.
# Validates the Host: header against ALLOWED_HOSTS before any route logic runs.
# In production set ALLOWED_HOSTS=app.factora.eu,api.factora.eu
allowed_hosts = get_allowed_hosts()
if allowed_hosts != ["*"]:
    # Only activate when specific hosts are configured to avoid false positives
    # in local dev or CI environments where the host is unpredictable.
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)


# 4. CORS — outermost layer, handles browser preflight.
# IMPORTANT: allow_credentials=True is incompatible with allow_origins=["*"].
# When CORS_ORIGINS is the wildcard, credentials are disabled automatically.
cors_origins = get_cors_origins()
if cors_origins == ["*"]:
    # Wildcard origin disallows credentials per CORS spec §7.1.5.
    # Safe for public APIs that do not use cookies or Authorization headers.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )
else:
    # Specific origins allow credentialed requests (Authorization, cookies).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(companies_router, prefix="/companies", tags=["External APIs"])
app.include_router(file_router, prefix="/files", tags=["File Management"])
app.include_router(onboarding_router, prefix="/onboarding", tags=["Onboarding"])
app.include_router(saltedge_router, prefix="/saltedge", tags=["SaltEdge"])
app.include_router(aade_router, prefix="/aade", tags=["AADE"])
app.include_router(dashboard_router, prefix="/dashboard", tags=["Dashboard"])

# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
