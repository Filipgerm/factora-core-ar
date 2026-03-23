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

from packages.stripe.api.client import StripeClient

from app.config import settings
from app.core.exceptions import AuthError, ForbiddenError
from app.core.security.jwt import decode_access_token
from app.db.models.identity import UserRole
from app.db.postgres import get_db_session
from app.services.auth_service import AuthService
from app.services.notification_service import NotificationService
from app.services.membership_service import MembershipService
from app.services.organization_service import OrganizationService
from app.services.saltedge_service import SaltEdgeService
from app.services.dashboard_service import DashboardService
from app.services.gemi_service import GemiService
from app.services.mydata_service import MyDataService
from app.services.ai_service import AIService
from app.services.file_service import FileService
from app.services.stripe_sync_service import StripeSyncService
from app.services.stripe_webhook_service import StripeWebhookService
from app.controllers.membership_controller import MembershipController
from app.controllers.stripe_controller import StripeController
from app.controllers.organization_controller import OrganizationController
from app.controllers.saltedge_controller import SaltEdgeController
from app.controllers.dashboard_controller import DashboardController
from app.controllers.gemi_controller import GemiController
from app.controllers.mydata_controller import MyDataController
from app.controllers.ai_controller import AIController
from app.controllers.file_controller import FileController

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


def get_membership_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MembershipService:
    """Create a request-scoped ``MembershipService`` (no org filter)."""
    return MembershipService(db)


def get_org_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: CurrentOrgIdOptional,
) -> OrganizationService:
    """Create a request-scoped ``OrganizationService``.

    org_id is None for setup flow (user has no org yet); set for org-scoped ops.
    """
    return OrganizationService(db, organization_id=org_id)


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


def get_membership_controller(
    membership_service: Annotated[MembershipService, Depends(get_membership_service)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> MembershipController:
    return MembershipController(membership_service, auth_service)


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
MembCtrl = Annotated[MembershipController, Depends(get_membership_controller)]
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


def require_role(*roles: UserRole):
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

    return _check


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


def get_current_org_id_optional(user: AuthUser) -> str | None:
    """Extract organization_id from JWT if present; returns None for setup flow."""
    return user.get("organization_id")


CurrentOrgId = Annotated[str, Depends(get_current_org_id)]
CurrentOrgIdOptional = Annotated[str | None, Depends(get_current_org_id_optional)]


# ---------------------------------------------------------------------------
# SaltEdge 3-Tier DI chain
# ---------------------------------------------------------------------------


def get_saltedge_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: CurrentOrgId,
) -> SaltEdgeService:
    """Create a request-scoped ``SaltEdgeService`` with db and organization_id."""
    return SaltEdgeService(db, settings, org_id)


def get_saltedge_controller(
    service: Annotated[SaltEdgeService, Depends(get_saltedge_service)],
) -> SaltEdgeController:
    """Create a request-scoped ``SaltEdgeController`` injecting its service."""
    return SaltEdgeController(service)


SaltEdgeCtrl = Annotated[SaltEdgeController, Depends(get_saltedge_controller)]


# ---------------------------------------------------------------------------
# Dashboard 3-Tier DI chain
# ---------------------------------------------------------------------------


def get_dashboard_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: CurrentOrgId,
) -> DashboardService:
    """Create a request-scoped ``DashboardService`` with db and organization_id."""
    return DashboardService(db, org_id)


def get_dashboard_controller(
    service: Annotated[DashboardService, Depends(get_dashboard_service)],
) -> DashboardController:
    """Create a request-scoped ``DashboardController`` injecting its service."""
    return DashboardController(service)


DashboardCtrl = Annotated[DashboardController, Depends(get_dashboard_controller)]


# ---------------------------------------------------------------------------
# GEMI 3-Tier DI chain (public endpoints; org_id optional)
# ---------------------------------------------------------------------------


def get_gemi_service(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GemiService:
    """Create a request-scoped ``GemiService``. GEMI endpoints are public; org_id=None."""
    return GemiService(db, organization_id=None)


def get_gemi_controller(
    service: Annotated[GemiService, Depends(get_gemi_service)],
) -> GemiController:
    """Create a request-scoped ``GemiController`` injecting its service."""
    return GemiController(service)


GemiCtrl = Annotated[GemiController, Depends(get_gemi_controller)]


# ---------------------------------------------------------------------------
# MyData 3-Tier DI chain
# ---------------------------------------------------------------------------


def get_mydata_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: CurrentOrgIdOptional,
) -> MyDataService:
    """Create a request-scoped ``MyDataService``. org_id optional for read-only."""
    return MyDataService(db, org_id, settings)


def get_mydata_controller(
    service: Annotated[MyDataService, Depends(get_mydata_service)],
) -> MyDataController:
    """Create a request-scoped ``MyDataController`` injecting its service."""
    return MyDataController(service)


MyDataCtrl = Annotated[MyDataController, Depends(get_mydata_controller)]


# ---------------------------------------------------------------------------
# File 3-Tier DI chain
# ---------------------------------------------------------------------------


def get_file_service(
    db: Annotated[AsyncSession, Depends(get_db)],
    org_id: CurrentOrgId,
) -> FileService:
    """Create a request-scoped ``FileService`` with db and organization_id."""
    return FileService(db, org_id)


def get_ai_service(org_id: CurrentOrgId) -> AIService:
    return AIService(org_id)


def get_file_controller(
    service: Annotated[FileService, Depends(get_file_service)],
) -> FileController:
    """Create a request-scoped ``FileController`` injecting its service."""
    return FileController(service)


def get_ai_controller(
    service: Annotated[AIService, Depends(get_ai_service)],
) -> AIController:
    return AIController(service)


FileCtrl = Annotated[FileController, Depends(get_file_controller)]
AICtrl = Annotated[AIController, Depends(get_ai_controller)]


# ---------------------------------------------------------------------------
# Stripe mirror + webhook
# ---------------------------------------------------------------------------

_stripe_client_singleton: StripeClient | None = None


def get_stripe_client() -> StripeClient:
    """Process-wide Stripe SDK wrapper (keys from ``settings``)."""
    global _stripe_client_singleton
    if _stripe_client_singleton is None:
        _stripe_client_singleton = StripeClient(
            secret_key=settings.STRIPE_SECRET_KEY or "",
            api_version=settings.STRIPE_API_VERSION or "",
            webhook_secret=settings.STRIPE_WEBHOOK_SECRET or "",
        )
    return _stripe_client_singleton


def get_stripe_webhook_service(db: DB) -> StripeWebhookService:
    return StripeWebhookService(db)


def get_stripe_sync_service(
    db: DB,
    org_id: CurrentOrgId,
) -> StripeSyncService:
    return StripeSyncService(db, org_id)


def get_stripe_controller(
    db: DB,
    org_id: CurrentOrgId,
    webhook_service: Annotated[StripeWebhookService, Depends(get_stripe_webhook_service)],
    stripe_client: Annotated[StripeClient, Depends(get_stripe_client)],
) -> StripeController:
    return StripeController(
        StripeSyncService(db, org_id), webhook_service, stripe_client
    )


def get_stripe_controller_for_webhook(
    db: DB,
    webhook_service: Annotated[StripeWebhookService, Depends(get_stripe_webhook_service)],
    stripe_client: Annotated[StripeClient, Depends(get_stripe_client)],
) -> StripeController:
    return StripeController(
        StripeSyncService(db, organization_id=None), webhook_service, stripe_client
    )


StripeCtrl = Annotated[StripeController, Depends(get_stripe_controller)]
StripeWebhookCtrl = Annotated[StripeController, Depends(get_stripe_controller_for_webhook)]
