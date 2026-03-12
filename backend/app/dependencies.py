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
    """
    If FastAPI DI runs, it will keep 'db' as None and we resolve it internally.
    If you call this yourself and pass a db, use that.
    """
    return _ensure_db(db)


def get_user_service(
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> UserService:
    db = _ensure_db(db)  # allows manual use if you passed db explicitly
    # Fail fast if pepper is missing/weak
    if not settings.CODE_PEPPER or len(settings.CODE_PEPPER) < 16:
        raise HTTPException(
            status_code=500,
            detail="CODE_PEPPER missing or too short (>=16 chars required)",
        )

    # return UserService(db, code_pepper=settings.CODE_PEPPER, rate_limiter=_limiter) Later improved version - Redis
    return UserService(
        db, code_pepper=settings.CODE_PEPPER
    )  # if you’re not using Redis yet)

    # return UserService(db, code_pepper=settings.CODE_PEPPER, rate_limiter=_limiter) Later improved version - Redis
    return UserService(
        db, code_pepper=settings.CODE_PEPPER
    )  # if you’re not using Redis yet


def get_user_controller(
    user_service: Annotated[UserService, Depends(get_user_service)] = None,
) -> UserController:
    return UserController(user_service or get_user_service())


def get_notification_service(
    svc: Annotated[Optional[NotificationService], Depends(lambda: None)] = None,
) -> NotificationService:
    return svc or NotificationService()
