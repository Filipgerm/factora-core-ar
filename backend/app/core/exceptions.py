"""Domain exception hierarchy for the Factora backend.

All service-layer errors inherit from ``AppError``.  A global exception handler
registered in ``app.main`` converts them to structured JSON responses so
controllers never need to catch and re-raise.

Each error carries:
  - ``status_code`` — the HTTP status code to return
  - ``detail``      — human-readable message (safe for the browser)
  - ``code``        — machine-readable dot-namespaced slug for the frontend
                       (e.g. ``"auth.invalid_credentials"``)

``ValidationError`` additionally carries ``fields`` — a mapping of field
names to their failure reason, matching the Pydantic 422 contract so the
frontend can highlight the exact inputs.

Usage in a service::

    raise AuthError("Invalid credentials", code="auth.invalid_credentials")

The controller simply re-raises domain exceptions; the global handler takes
care of the HTTP response.
"""
from __future__ import annotations

from typing import Any


class AppError(Exception):
    """Base class for all Factora domain exceptions."""

    status_code: int = 500

    def __init__(
        self,
        detail: str,
        *,
        code: str = "internal_error",
        **extra: Any,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.code = code
        self.extra = extra


# ---------------------------------------------------------------------------
# Auth / session errors
# ---------------------------------------------------------------------------


class AuthError(AppError):
    """Wrong password, expired token, or invalid credentials.  HTTP 401."""

    status_code = 401

    def __init__(self, detail: str = "Authentication failed", *, code: str = "auth.unauthorized", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


class ForbiddenError(AppError):
    """Caller is authenticated but lacks the required role.  HTTP 403."""

    status_code = 403

    def __init__(self, detail: str = "Insufficient permissions", *, code: str = "auth.forbidden", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


# ---------------------------------------------------------------------------
# Resource errors
# ---------------------------------------------------------------------------


class NotFoundError(AppError):
    """Requested resource does not exist.  HTTP 404."""

    status_code = 404

    def __init__(self, detail: str = "Resource not found", *, code: str = "resource.not_found", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


class ConflictError(AppError):
    """Operation conflicts with existing state (e.g. duplicate email).  HTTP 409."""

    status_code = 409

    def __init__(self, detail: str = "Resource already exists", *, code: str = "resource.conflict", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


class ClientBadRequestError(AppError):
    """Malformed or untrusted client input (e.g. invalid webhook signature).  HTTP 400."""

    status_code = 400

    def __init__(self, detail: str, *, code: str = "request.bad_request", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


# ---------------------------------------------------------------------------
# Domain validation errors
# ---------------------------------------------------------------------------


class ValidationError(AppError):
    """Input passes Pydantic but fails a business rule.  HTTP 422.

    Args:
        fields: Mapping of field name → failure reason for the frontend to
                highlight specific inputs, e.g. ``{"vat_number": "Invalid format"}``.
    """

    status_code = 422

    def __init__(
        self,
        detail: str = "Validation failed",
        *,
        code: str = "validation.failed",
        fields: dict[str, str] | None = None,
        **extra: Any,
    ) -> None:
        super().__init__(detail, code=code, **extra)
        self.fields: dict[str, str] = fields or {}


# ---------------------------------------------------------------------------
# External integration errors
# ---------------------------------------------------------------------------


class ExternalServiceError(AppError):
    """Third-party API returned an unexpected error.  HTTP 502."""

    status_code = 502

    def __init__(self, detail: str = "External service error", *, code: str = "external.error", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


class AadeError(ExternalServiceError):
    """AADE / myDATA specific failure."""

    def __init__(self, detail: str = "AADE service error", *, code: str = "external.aade", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


class SaltEdgeError(ExternalServiceError):
    """SaltEdge Open Banking specific failure."""

    def __init__(self, detail: str = "SaltEdge service error", *, code: str = "external.saltedge", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


class GemiError(ExternalServiceError):
    """GEMI business registry specific failure."""

    def __init__(self, detail: str = "GEMI service error", *, code: str = "external.gemi", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)


class StripeError(ExternalServiceError):
    """Stripe API or webhook processing failure."""

    def __init__(self, detail: str = "Stripe service error", *, code: str = "external.stripe", **extra: Any) -> None:
        super().__init__(detail, code=code, **extra)
