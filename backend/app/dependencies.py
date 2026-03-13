"""
Dependencies module for FastAPI application.
Centralizes all dependency injection to avoid circular imports.
"""

from typing import Optional, Annotated
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.db.postgres import get_db_session
from app.services.user_service import UserService
from app.services.notification_service import NotificationService
from app.controllers.user_controller import UserController


# --- low-level factory (can be called directly) ---
def _ensure_db(db: Optional[AsyncSession]) -> AsyncSession:
    if db is None:
        raise HTTPException(status_code=503, detail="Database not initialized")
    return db


def get_db(
    db: Annotated[Optional[AsyncSession], Depends(get_db_session)] = None,
) -> AsyncSession:
    """Return the injected database session, raising 503 if unavailable.

    Args:
        db: AsyncSession provided by FastAPI dependency injection.

    Returns:
        A valid :class:`AsyncSession` instance.

    Raises:
        HTTPException: 503 if the database session is not available.
    """
    return _ensure_db(db)


def get_user_service(
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> UserService:
    """Create a :class:`UserService` scoped to the current request's DB session.

    Args:
        db: AsyncSession injected by :func:`get_db`.

    Returns:
        A :class:`UserService` instance with the request-scoped session.

    Raises:
        HTTPException: 500 if ``CODE_PEPPER`` is missing or shorter than 16 chars.
        HTTPException: 503 if the database session is unavailable.
    """
    db = _ensure_db(db)
    if not settings.CODE_PEPPER or len(settings.CODE_PEPPER) < 16:
        raise HTTPException(
            status_code=500,
            detail="CODE_PEPPER missing or too short (>=16 chars required)",
        )
    # TODO(redis): swap for rate-limited version once Redis is integrated:
    # return UserService(db, code_pepper=settings.CODE_PEPPER, rate_limiter=_limiter)
    return UserService(db, code_pepper=settings.CODE_PEPPER)


def get_user_controller(
    user_service: Annotated[UserService, Depends(get_user_service)] = None,
) -> UserController:
    return UserController(user_service or get_user_service())


def get_notification_service(
    svc: Annotated[Optional[NotificationService], Depends(lambda: None)] = None,
) -> NotificationService:
    return svc or NotificationService()
