"""FileService — manages document retrieval from Supabase storage.

Scope: Handles fetching and identifying files from external object storage.
Contract: Accepts filename strings, returns file metadata/data dicts or None.
Architectural Notes: Uses asyncio.run_in_executor to prevent the synchronous
Supabase Python client from blocking the FastAPI async event loop.
"""

"""FileService — manages document retrieval from Supabase storage."""

from __future__ import annotations

import asyncio
import logging
import mimetypes
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.postgres import get_supabase, SUPABASE_BUCKET

logger = logging.getLogger(__name__)


class FileService:
    """Service for managing files and documents via Supabase Storage."""

    def __init__(
        self, db: AsyncSession, organization_id: str
    ) -> None:
        """Initialize the FileService.

        TODO: When storage has org-scoped metadata, validate file belongs to organization_id.
        """
        self.db = db
        self.organization_id = organization_id
        self.supabase = get_supabase()
        self.bucket = SUPABASE_BUCKET

    async def fetch_file(self, filename: str) -> Optional[dict]:
        """Fetch a file asynchronously from Supabase storage.

        Args:
            filename: The original name/path of the file in the bucket.

        Returns:
            A dict with ``data``, ``content_type``, ``original_name``, and ``size``,
            or ``None`` if the file is missing or unreadable.
        """
        try:
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
