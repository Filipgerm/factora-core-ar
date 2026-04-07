"""Celery worker package — broker-backed task execution separate from the ASGI process.

Import ``celery_app`` only from worker entrypoints or ``TaskQueueService``; do not
import from ``agents/``.
"""

from app.workers.celery_app import celery_app

__all__ = ["celery_app"]
