"""Domain exception hierarchy for the Factora backend.

All service-layer errors inherit from ``FactoraError`` so controllers can
catch them with a single ``except FactoraError`` clause and map them to the
appropriate ``HTTPException``.

Usage in a controller::

    try:
        result = await service.some_method(...)
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except FactoraError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
"""
from __future__ import annotations


class FactoraError(Exception):
    """Base class for all Factora domain exceptions."""


# ---------------------------------------------------------------------------
# Auth / session errors (HTTP 401 / 403)
# ---------------------------------------------------------------------------


class AuthenticationError(FactoraError):
    """Raised when credentials are missing, expired, or invalid."""


class AuthorizationError(FactoraError):
    """Raised when the caller lacks permission for the requested resource."""


# ---------------------------------------------------------------------------
# Resource errors (HTTP 404 / 409)
# ---------------------------------------------------------------------------


class NotFoundError(FactoraError):
    """Raised when a requested resource does not exist."""


class ConflictError(FactoraError):
    """Raised when an operation conflicts with existing state (e.g. duplicate)."""


# ---------------------------------------------------------------------------
# Validation / business-logic errors (HTTP 400 / 422)
# ---------------------------------------------------------------------------


class ValidationError(FactoraError):
    """Raised when input passes Pydantic but fails business-rule validation."""


class OnboardingError(FactoraError):
    """Raised for invalid state transitions during the buyer KYC flow."""


# ---------------------------------------------------------------------------
# External integration errors (HTTP 502 / 503)
# ---------------------------------------------------------------------------


class ExternalServiceError(FactoraError):
    """Raised when a third-party API returns an unexpected error."""


class AadeError(ExternalServiceError):
    """Raised for AADE/myDATA specific failures."""


class SaltEdgeError(ExternalServiceError):
    """Raised for SaltEdge Open Banking specific failures."""
