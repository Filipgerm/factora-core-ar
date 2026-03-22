"""FastAPI application factory for Factora backend.

Middleware stack (applied in reverse order — last added = first executed):
  1. RequestIDMiddleware  — injects X-Request-ID for end-to-end tracing
  2. DemoModeMiddleware   — injects X-Demo-Mode: true when ENVIRONMENT=demo
  3. ProxyHeadersMiddleware — reads X-Forwarded-For / X-Forwarded-Proto from
                              nginx so request.client.host and request.url.scheme
                              reflect the real browser values
  4. TrustedHostMiddleware  — validates the Host header against ALLOWED_HOSTS
                               to prevent host-header injection
  5. CORSMiddleware         — handles Access-Control-* headers for browser
                               cross-origin requests

Note on middleware ordering in FastAPI/Starlette:
  ``app.add_middleware(X)`` prepends X to the middleware stack, so the last
  ``add_middleware`` call executes FIRST on incoming requests.  The ordering
  above matches the intended execution order.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.routes.ai_routes import router as ai_router
from app.api.routes.auth_routes import router as auth_router
from app.api.routes.dashboard_routes import router as dashboard_router
from app.api.routes.file_routes import router as file_router
from app.api.routes.gemi_routes import router as companies_router
from app.api.routes.mydata_routes import router as aade_router
from app.api.routes.organization_routes import router as organization_router
from app.api.routes.organizations_routes import router as organizations_router
from app.api.routes.saltedge_routes import router as saltedge_router
from app.config import settings
from app.core.exceptions import AppError, ValidationError
from app.db.postgres import close_database_connection, connect_to_database
from app.middleware.demo import DemoModeMiddleware
from app.middleware.request_id import RequestIDMiddleware

logger = logging.getLogger(__name__)


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
    """Split a comma-separated setting string into a cleaned list."""
    return [item.strip() for item in value.split(",") if item.strip()]


def get_cors_origins() -> list[str]:
    """Parse and return the list of allowed CORS origins from settings."""
    raw = settings.CORS_ORIGINS.strip()
    if not raw:
        return []
    if raw == "*":
        return ["*"]
    return _parse_comma_list(raw)


def get_allowed_hosts() -> list[str]:
    """Parse and return the list of allowed Host header values."""
    raw = settings.ALLOWED_HOSTS.strip()
    if not raw or raw == "*":
        return ["*"]
    return _parse_comma_list(raw)


def get_trusted_proxies() -> list[str]:
    """Parse trusted proxy IPs/CIDRs for ProxyHeadersMiddleware."""
    raw = settings.TRUSTED_PROXIES.strip()
    if not raw or raw == "*":
        return ["*"]
    return _parse_comma_list(raw)


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Factora API",
    description="AI-native ERP and accounting platform.",
    version="2.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Global exception handler — converts AppError → structured JSON
# ---------------------------------------------------------------------------


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Convert any AppError subclass into a structured JSON response.

    Response body:
        {
            "detail": "<human-readable message>",
            "code":   "<machine-readable slug>",
            "fields": {"field_name": "reason"}   # empty {} unless ValidationError
        }
    """
    body: dict = {
        "detail": exc.detail,
        "code": exc.code,
        "fields": exc.fields if isinstance(exc, ValidationError) else {},
    }
    logger.debug("AppError [%s] %s: %s", exc.status_code, exc.code, exc.detail)
    return JSONResponse(status_code=exc.status_code, content=body)


# ---------------------------------------------------------------------------
# Middleware stack
# Note: add_middleware PREPENDS to the stack, so the order below is REVERSED
# at runtime.  CORS must be outermost (added last) to handle preflight before
# TrustedHost rejects unknown hosts.
# ---------------------------------------------------------------------------

# 1. RequestIDMiddleware — innermost, injects X-Request-ID for tracing.
app.add_middleware(RequestIDMiddleware)

# 2. DemoModeMiddleware — adds X-Demo-Mode: true when ENVIRONMENT=demo.
app.add_middleware(DemoModeMiddleware)

# 3. ProxyHeadersMiddleware — reads X-Forwarded-For / X-Forwarded-Proto from nginx.
trusted_proxies = get_trusted_proxies()
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=trusted_proxies)

# 4. TrustedHostMiddleware — validates Host header (production only).
allowed_hosts = get_allowed_hosts()
if allowed_hosts != ["*"]:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# 5. CORS — outermost, handles browser preflight.
# IMPORTANT: allow_credentials=True is incompatible with allow_origins=["*"].
cors_origins = get_cors_origins()
if cors_origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["*"],
    )


# ---------------------------------------------------------------------------
# Routers — all routes versioned under /v1/
# ---------------------------------------------------------------------------
_V1 = "/v1"

app.include_router(auth_router, prefix=f"{_V1}/auth", tags=["Auth"])
app.include_router(organization_router, prefix=f"{_V1}/organization", tags=["Organization"])
app.include_router(organizations_router, prefix=f"{_V1}/organizations", tags=["Organizations"])
app.include_router(companies_router, prefix=f"{_V1}/companies", tags=["External APIs"])
app.include_router(file_router, prefix=f"{_V1}/files", tags=["File Management"])
app.include_router(saltedge_router, prefix=f"{_V1}/saltedge", tags=["SaltEdge"])
app.include_router(aade_router, prefix=f"{_V1}/aade", tags=["AADE"])
app.include_router(dashboard_router, prefix=f"{_V1}/dashboard", tags=["Dashboard"])
app.include_router(ai_router, prefix=f"{_V1}/ai", tags=["AI"])


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
