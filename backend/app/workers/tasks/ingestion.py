"""Celery tasks for document / email ingestion (LangGraph + ``IngestionService``).

**Scope:** Execute ``IngestionService.run_ingestion`` outside the FastAPI event loop.

**Contract:** JSON-serializable payload only; opens a fresh ``AsyncSession`` per task.

**Flow:**
    1. Celery worker receives ``organization_id`` + kwargs dict.
    2. ``asyncio.run`` drives ``AsyncSessionLocal`` context + ``IngestionService``.
    3. Returns the graph ``result`` dict (stored in the result backend if callers use ``.get()``).

**Architectural notes:** Mirrors the service/agent boundary: no imports from
``agents/`` beyond what ``IngestionService`` already uses. Large ``attachment_base64``
payloads may exceed Redis message limits — prefer object storage + URI in a follow-up.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.db.postgres import AsyncSessionLocal
from app.services.ingestion_service import IngestionService
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _run_ingestion_async(organization_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    async with AsyncSessionLocal() as session:
        svc = IngestionService(session, organization_id)
        return await svc.run_ingestion(
            raw_text=payload.get("raw_text") or "",
            attachment_base64=payload.get("attachment_base64"),
            attachment_mime_type=payload.get("attachment_mime_type"),
            email_subject=payload.get("email_subject"),
            email_from=payload.get("email_from"),
            include_vector_hints=bool(payload.get("include_vector_hints", True)),
            trigger=str(payload.get("trigger") or "celery"),
        )


@celery_app.task(name="ingestion.run", bind=True, max_retries=3, default_retry_delay=60)
def run_ingestion_task(self, organization_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Run ingestion graph for one organization (worker process)."""
    try:
        return asyncio.run(_run_ingestion_async(organization_id, payload))
    except Exception as exc:  # noqa: BLE001 — Celery retry needs broad catch
        logger.exception("ingestion task failed org=%s task_id=%s", organization_id, self.request.id)
        raise self.retry(exc=exc) from exc
