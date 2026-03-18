"""FastAPI dependency injection — database sessions, controllers, services, and auth guards.

Architecture Flow:
  Router -> injects Controller -> injects Service -> injects DB Session.

All dependencies follow the single-responsibility principle:
  - ``get_db``          — returns a request-scoped ``AsyncSession``
  - ``get_auth_service`` — instantiates ``AuthService`` with the session
  - ``get_org_service``  — instantiates ``OrganizationService`` with the session
  - ``require_auth``     — validates Bearer JWT; returns the decoded payload
  - ``require_role``     — RBAC gate; raises 403 if the user lacks a required role

Usage in a route::

    @router.post("/bank-accounts", dependencies=[require_role(UserRole.OWNER)])
    async def connect_bank(db: DB, user: AuthUser): ...
"""

from __future__ import annotations

from typing import Annotated, Callable, Optional

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import AuthError, ForbiddenError
from app.core.security.jwt import decode_access_token
from app.db.models.identity import UserRole
from app.db.postgres import get_db_session
from app.services.auth_service import AuthService
from app.services.notification_service import NotificationService
from app.services.organization_service import OrganizationService
from app.controllers.organization_controller import OrganizationController

_bearer_scheme = HTTPBearer(auto_error=True)


# ---------------------------------------------------------------------------
# Database session
# ---------------------------------------------------------------------------


def _ensure_db(db: Optional[AsyncSession]) -> AsyncSession:
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialized")
    return db


def get_db(
    db: Annotated[Optional[AsyncSession], Depends(get_db_session)] = None,
) -> AsyncSession:
    """Return the request-scoped async DB session, raising 503 if unavailable."""
    return _ensure_db(db)


# ---------------------------------------------------------------------------
# Service factories
# ---------------------------------------------------------------------------


def get_auth_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AuthService:
    """Create a request-scoped ``AuthService``."""
    if not settings.CODE_PEPPER or len(settings.CODE_PEPPER) < 16:
        raise HTTPException(
            status_code=500,
            detail="CODE_PEPPER missing or too short (>=16 chars required)",
        )
    return AuthService(db, code_pepper=settings.CODE_PEPPER)


def get_org_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationService:
    """Create a request-scoped ``OrganizationService``."""
    return OrganizationService(db)


def get_notification_service() -> NotificationService:
    return NotificationService()


# ---------------------------------------------------------------------------
# Controller factories (The 3-Tier Bridge)
# ---------------------------------------------------------------------------


def get_org_controller(
    service: Annotated[OrganizationService, Depends(get_org_service)],
) -> OrganizationController:
    """Create a request-scoped ``OrganizationController`` injecting its service."""
    return OrganizationController(service)


# def get_auth_controller(
#     service: Annotated[AuthService, Depends(get_auth_service)],
# ) -> AuthController:
#     return AuthController(service)


# ---------------------------------------------------------------------------
# Type aliases for route annotations
# ---------------------------------------------------------------------------

DB = Annotated[AsyncSession, Depends(get_db)]
# Services
AuthSvc = Annotated[AuthService, Depends(get_auth_service)]
OrgSvc = Annotated[OrganizationService, Depends(get_org_service)]


# Controllers
OrgCtrl = Annotated[OrganizationController, Depends(get_org_controller)]
# AuthCtrl = Annotated[AuthController, Depends(get_auth_controller)]

# ---------------------------------------------------------------------------
# JWT authentication
# ---------------------------------------------------------------------------


def require_auth(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
) -> dict:
    """Decode and validate the Bearer JWT.

    Returns:
        The validated payload dict, which contains at minimum:
          - ``sub``             — user UUID string
          - ``role``            — UserRole value (e.g. ``"owner"``)
          - ``organization_id`` — UUID string or ``None``
          - ``jti``             — JWT ID for revocation checks

    Raises:
        HTTPException 401: Token missing, expired, or malformed.
    """
    try:
        return decode_access_token(creds.credentials)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=exc.detail)


AuthUser = Annotated[dict, Depends(require_auth)]


# ---------------------------------------------------------------------------
# RBAC
# ---------------------------------------------------------------------------


def require_role(*roles: UserRole) -> Depends:
    """Dependency factory that enforces one of the specified RBAC roles.

    Usage::

        @router.post(
            "/bank-accounts",
            dependencies=[Depends(require_role(UserRole.OWNER, UserRole.ADMIN))],
        )

    Args:
        *roles: One or more ``UserRole`` values that are permitted.

    Returns:
        A FastAPI ``Depends`` that validates the authenticated user's role.

    Raises:
        HTTPException 401: No valid JWT present.
        HTTPException 403: User's role is not in the allowed list.
    """
    allowed = {r.value for r in roles}

    def _check(user: AuthUser) -> dict:
        if user.get("role") not in allowed:
            raise HTTPException(
                status_code=403,
                detail=f"Required role(s): {', '.join(allowed)}. Your role: {user.get('role')}",
            )
        return user

    return Depends(_check)


def get_current_org_id(user: AuthUser) -> str:
    """Extract and validate the organization_id from the JWT payload.

    Raises:
        HTTPException 403: User has not set up an organization yet.
    """
    org_id = user.get("organization_id")
    if not org_id:
        raise HTTPException(
            status_code=403,
            detail="Organization setup required. Please complete your organization profile.",
        )
    return org_id


CurrentOrgId = Annotated[str, Depends(get_current_org_id)]
