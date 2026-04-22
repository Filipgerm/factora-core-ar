"""Celery application factory — Redis broker/result backend from ``Settings``.

**Scope:** Single shared ``Celery`` instance for background jobs (ingestion, future
bulk agents, scheduled sync).

**Contract:** Configured from environment; tasks live under ``app.workers.tasks``.

**Architectural notes:** Workers run in a separate process from Uvicorn. Tasks that
need the DB must open their own ``AsyncSession`` (see ingestion task). Use
``--pool=solo`` when tasks call ``asyncio.run`` so each worker process handles one
task at a time without nested event-loop issues.
"""

from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "factora",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.tasks.ingestion",
        "app.workers.tasks.gmail",
        "app.workers.tasks.future_agents",
        "app.workers.tasks.maintenance",
        "app.workers.tasks.stripe",
        "app.workers.tasks.hubspot",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=900,
    task_soft_time_limit=840,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    beat_schedule={
        "maintenance-hourly-heartbeat": {
            "task": "maintenance.worker_heartbeat",
            "schedule": crontab(minute=0),
        },
        # Eventually-consistent HubSpot mirror — webhooks are best-effort,
        # so poll every 15 min and backfill stale connections. The
        # fan-out task itself is cheap (one SELECT); per-connection
        # backfills run as separate tasks so one slow tenant can't
        # block the others.
        "hubspot-poll-connections": {
            "task": "hubspot.poll_connections",
            "schedule": crontab(minute="*/15"),
        },
    },
)
