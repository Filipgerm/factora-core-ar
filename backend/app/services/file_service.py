"""FileService — manages document retrieval and upload to Supabase storage.

Scope: Handles fetching and identifying files from external object storage,
and uploading new files with tenant-scoped metadata on the ``documents`` row.
Contract: Accepts filename strings, returns file metadata/data dicts or None;
upload raises ``ValidationError`` for empty inputs.
Architectural Notes: Uses asyncio.run_in_executor to prevent the synchronous
Supabase Python client from blocking the FastAPI async event loop.
"""

from __future__ import annotations

import asyncio
import logging
import mimetypes
from typing import Any, Optional

from fastapi import UploadFile
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.storage_client import build_storage_path, storage_public_url, upload_bytes
from app.core.exceptions import NotFoundError, ValidationError
from app.db.models.files import Document
from app.db.postgres import get_supabase, SUPABASE_BUCKET

logger = logging.getLogger(__name__)


class FileService:
    """Service for managing files and documents via Supabase Storage."""

    def __init__(self, db: AsyncSession, organization_id: str) -> None:
        """Initialize the FileService scoped to one organization."""
        self.db = db
        self.organization_id = organization_id
        self.supabase = get_supabase()
        self.bucket = SUPABASE_BUCKET

    async def _assert_file_access_allowed(self, filename: str) -> None:
        """Deny download when a ``documents`` row exists with a different ``organization_id``."""
        result = await self.db.execute(
            select(Document).where(
                or_(
                    Document.path == filename,
                    Document.original_name == filename,
                )
            )
        )
        doc = result.scalar_one_or_none()
        if doc is None:
            return
        meta = doc._metadata or {}
        owner = meta.get("organization_id")
        if owner is not None and str(owner) != str(self.organization_id):
            raise NotFoundError("File not found.", code="resource.not_found")

    async def fetch_file(self, filename: str) -> Optional[dict]:
        """Fetch a file asynchronously from Supabase storage.

        Args:
            filename: The original name/path of the file in the bucket.

        Returns:
            A dict with ``data``, ``content_type``, ``original_name``, and ``size``,
            or ``None`` if the file is missing or unreadable.
        """
        try:
            await self._assert_file_access_allowed(filename)
            loop = asyncio.get_running_loop()

            # CRITICAL FIX: run_in_executor pushes the slow, synchronous
            # Supabase network call to a background thread.
            file_data = await loop.run_in_executor(
                None,
                lambda: self.supabase.storage.from_(self.bucket).download(filename),
            )

            # AI/Frontend Fix: Guess the correct mime-type so the browser/AI
            # knows if it's looking at a PDF, PNG, or XML file.
            mime_type, _ = mimetypes.guess_type(filename)

            return {
                "data": file_data,
                "content_type": mime_type or "application/octet-stream",
                "original_name": filename,
                "size": len(file_data) if file_data else 0,
            }
        except Exception as e:
            logger.warning("Failed to download file '%s' from storage: %s", filename, e)
            return None

    async def upload_document(
        self,
        upload: UploadFile,
        *,
        purpose: str | None = None,
    ) -> dict[str, Any]:
        """Store multipart upload in the default bucket and persist a ``Document`` row.

        Raises:
            ValidationError: Empty file or missing filename.
        """
        data = await upload.read()
        if not data:
            raise ValidationError(
                "File is empty.",
                code="validation.empty_file",
                fields={"file": "Upload a non-empty file"},
            )
        fname = (upload.filename or "").strip() or "upload"
        ct = upload.content_type or mimetypes.guess_type(fname)[0] or "application/octet-stream"

        storage_path = build_storage_path(fname)
        await upload_bytes(storage_path, data, ct, bucket=self.bucket)

        url = storage_public_url(storage_path, bucket=self.bucket)
        meta: dict[str, Any] = {"organization_id": str(self.organization_id)}
        if purpose:
            meta["purpose"] = purpose

        doc = Document(
            bucket=self.bucket,
            path=storage_path,
            original_name=fname,
            content_type=ct,
            size=len(data),
            public_url=url,
            _metadata=meta,
        )
        self.db.add(doc)
        await self.db.commit()
        await self.db.refresh(doc)

        return {
            "document_id": doc.id,
            "bucket": doc.bucket,
            "path": doc.path,
            "original_name": doc.original_name,
            "content_type": doc.content_type,
            "size": doc.size,
            "public_url": doc.public_url,
            "metadata": doc._metadata or {},
        }
