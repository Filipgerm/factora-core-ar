"""TaskQueueService — enqueue Celery jobs; the only services-layer entry to the task bus.

**Scope:** Thin facade over named Celery tasks (ingestion today; reconciliation,
exports, and scheduled jobs later).

**Contract:** Returns Celery task id strings; raises ``RuntimeError`` if enqueue fails.
Callers must enforce auth and ``organization_id`` scoping before enqueueing.

**Flow:**
    1. Validate or build a JSON-safe payload dict.
    2. ``task.delay(...)`` — returns immediately after broker accept.

**Architectural notes:** Import task symbols inside methods if needed to keep
``celery_app`` import graph predictable for unit tests. Never import this service
from ``agents/`` or ``workers/tasks/*``.
"""

from __future__ import annotations

from typing import Any

from app.workers.tasks.ingestion import run_ingestion_task


class TaskQueueService:
    """Enqueue background work on Redis-backed Celery."""

    def enqueue_ingestion(
        self,
        organization_id: str,
        *,
        raw_text: str = "",
        attachment_base64: str | None = None,
        attachment_mime_type: str | None = None,
        email_subject: str | None = None,
        email_from: str | None = None,
        include_vector_hints: bool = True,
        trigger: str = "celery",
    ) -> str:
        """Queue ``IngestionService.run_ingestion``; returns Celery task id."""
        payload: dict[str, Any] = {
            "raw_text": raw_text,
            "attachment_base64": attachment_base64,
            "attachment_mime_type": attachment_mime_type,
            "attachment_storage_path": None,
            "email_subject": email_subject,
            "email_from": email_from,
            "include_vector_hints": include_vector_hints,
            "trigger": trigger,
        }
        async_result = run_ingestion_task.delay(organization_id, payload)
        return str(async_result.id)

    def enqueue_ingestion_payload(self, organization_id: str, payload: dict[str, Any]) -> str:
        """Enqueue using a pre-built payload (e.g. after ``build_ingestion_celery_payload``)."""
        async_result = run_ingestion_task.delay(organization_id, dict(payload))
        return str(async_result.id)


def get_task_queue_service() -> TaskQueueService:
    """Factory for DI — stateless, safe to call per request."""
    return TaskQueueService()
