"""Lightweight Celery Beat hooks (health / future cron wiring)."""

from __future__ import annotations

from app.workers.celery_app import celery_app


@celery_app.task(name="maintenance.worker_heartbeat")
def worker_heartbeat() -> dict[str, str]:
    """Hourly no-op so Beat + monitoring can verify workers are schedulable."""
    return {"status": "ok"}
