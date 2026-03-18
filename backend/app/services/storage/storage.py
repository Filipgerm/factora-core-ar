from fastapi import UploadFile
import os
from datetime import datetime, timezone
from typing import Union, IO, Optional, Dict, Any
from uuid import uuid4
import re
import anyio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.postgres import (
    get_supabase,
    SUPABASE_BUCKET,
    AsyncSessionLocal,
    get_db_session,
)
from app.db.models.files import Document

# --- Small helpers ---


def _secure_filename(name: str) -> str:
    """
    Basic filename sanitizer; keeps extensions and removes funky chars.
    """
    # strip path separators
    name = name.split("/")[-1].split("\\")[-1]
    # collapse disallowed chars
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    # avoid empty
    return name or f"file_{uuid4().hex}"


def _build_storage_path(filename: str) -> str:
    """
    Date-partitioned + uuid to avoid collisions.
    e.g., 2025/10/19/uuid_filename.pdf
    """
    today = datetime.now(timezone.utc)
    return f"{today:%Y/%m/%d}/{uuid4().hex}_{_secure_filename(filename)}"


async def _upload_bytes_to_supabase(
    path: str, data: bytes, content_type: str, upsert: bool = False
) -> None:
    """
    Supabase Python client is sync; run it in a worker thread so we don't block the event loop.
    """
    supabase = get_supabase()
    bucket = SUPABASE_BUCKET

    def _do_upload():
        supabase.storage.from_(bucket).upload(
            path,
            data,
            file_options={
                "contentType": content_type,
                "cacheControl": "3600",
                "upsert": upsert,
            },
        )

    await anyio.to_thread.run_sync(_do_upload)


def _public_url(path: str) -> str:
    supabase = get_supabase()
    return supabase.storage.from_(SUPABASE_BUCKET).get_public_url(path)


async def upload_file_to_storage(
    src: Union[UploadFile, bytes, bytearray, IO[bytes]],
    *,
    bucket: Optional[str] = None,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
    upsert: bool = False,
    make_public_url: bool = True,  # if bucket is public; for private use signed URLs instead
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Complete file upload workflow:
    - Normalize input to (bytes, filename, content_type)
    - Upload to Supabase Storage
    - Store metadata in PostgreSQL for future access
    - Return bucket/path, size, URL, and document ID
    """
    supabase = get_supabase()
    bucket = bucket or SUPABASE_BUCKET

    # Normalize inputs
    if isinstance(src, UploadFile):
        data = await src.read()
        fname = src.filename or filename or f"file_{uuid4().hex}"
        ct = src.content_type or content_type or "application/octet-stream"
    elif isinstance(src, (bytes, bytearray)):
        if not filename:
            raise ValueError("filename is required when uploading raw bytes")
        data = bytes(src)
        fname = filename
        ct = content_type or "application/octet-stream"
    else:
        # Assume IO[bytes]
        if not filename:
            raise ValueError("filename is required when uploading a file-like object")
        data = src.read()
        fname = filename
        ct = content_type or "application/octet-stream"

    # Upload to Supabase Storage
    storage_path = _build_storage_path(fname)
    await _upload_bytes_to_supabase(storage_path, data, ct, upsert=upsert)

    url = _public_url(storage_path) if make_public_url else None

    # Store metadata in PostgreSQL for future access
    async with AsyncSessionLocal() as session:
        doc = await store_document_row(
            session=session,
            bucket=bucket,
            path=storage_path,
            original_name=fname,
            content_type=ct,
            size=len(data),
            public_url=url,
            metadata=metadata or {},
        )

        return {
            "document_id": doc.id,
            "bucket": bucket,
            "path": storage_path,
            "original_name": fname,
            "content_type": ct,
            "size": len(data),
            "public_url": url,
            "metadata": metadata or {},
            # "signed_url": create_signed_url(supabase, bucket, path, expires=600),  if desired for private buckets
        }


# Postgres Storage
async def store_document_row(
    session: AsyncSession,
    *,
    bucket: str,
    path: str,
    original_name: str,
    content_type: Optional[str],
    size: int,
    public_url: Optional[str],
    metadata: Optional[Dict[str, Any]] = None,
) -> Document:
    doc = Document(
        bucket=bucket,
        path=path,
        original_name=original_name,
        content_type=content_type,
        size=size,
        public_url=public_url,
        metadata=metadata or {},
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc
