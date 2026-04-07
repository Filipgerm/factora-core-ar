"""Build Celery ingestion task payloads; stage oversized attachments to Supabase Storage.

**Scope:** Keeps Redis broker messages small by uploading large base64 bodies to
``ingestion-staging/{organization_id}/…`` and passing ``attachment_storage_path``.

**Contract:** Returns a dict accepted by ``run_ingestion_task`` / ``IngestionService``.
"""

from __future__ import annotations

import base64
import uuid
from typing import Any

from app.clients.storage_client import upload_bytes

# ~300 KiB raw → ~400k base64 chars — broker-safe default
_ATTACHMENT_B64_THRESHOLD = 400_000


async def build_ingestion_celery_payload(
    *,
    organization_id: str,
    raw_text: str = "",
    attachment_base64: str | None = None,
    attachment_mime_type: str | None = None,
    email_subject: str | None = None,
    email_from: str | None = None,
    include_vector_hints: bool = True,
    trigger: str = "celery",
) -> dict[str, Any]:
    """Return payload dict; may upload attachment and clear inline base64."""
    path: str | None = None
    b64 = attachment_base64
    mime = attachment_mime_type
    if b64 and len(b64) > _ATTACHMENT_B64_THRESHOLD:
        raw = base64.b64decode(b64)
        path = f"ingestion-staging/{organization_id}/{uuid.uuid4().hex}"
        await upload_bytes(path, raw, mime or "application/octet-stream")
        b64 = None

    return {
        "raw_text": raw_text,
        "attachment_base64": b64,
        "attachment_storage_path": path,
        "attachment_mime_type": mime,
        "email_subject": email_subject,
        "email_from": email_from,
        "include_vector_hints": include_vector_hints,
        "trigger": trigger,
    }
