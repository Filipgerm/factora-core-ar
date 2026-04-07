"""Celery tasks for Gmail message → invoice pipeline (worker-owned DB session).

**Scope:** Run ``GmailSyncService.process_reserved_gmail_message`` after the API
reserved a ``GmailProcessedMessage`` row.

**Contract:** JSON-serializable args only; no Gmail tokens on the broker.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.db.postgres import AsyncSessionLocal
from app.services.gmail_sync_service import GmailSyncService
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


async def _process_async(organization_id: str, processed_message_id: str) -> dict[str, Any]:
    async with AsyncSessionLocal() as session:
        sync = GmailSyncService(session)
        detail = await sync.process_reserved_gmail_message(processed_message_id)
        return detail.model_dump()


@celery_app.task(name="gmail.process_message", bind=True, max_retries=3, default_retry_delay=120)
def process_gmail_message_task(self, organization_id: str, processed_message_id: str) -> dict[str, Any]:
    """Fetch Gmail content in the worker, run ingestion, create invoice + embedding."""
    try:
        return asyncio.run(_process_async(organization_id, processed_message_id))
    except Exception as exc:  # noqa: BLE001
        logger.exception(
            "gmail process task failed org=%s row=%s task_id=%s",
            organization_id,
            processed_message_id,
            self.request.id,
        )
        raise self.retry(exc=exc) from exc
