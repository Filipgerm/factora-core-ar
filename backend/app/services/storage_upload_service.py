"""Storage upload orchestration — Supabase object store plus ``documents`` rows.

Scope: Normalize upload sources, delegate bytes upload to ``storage_client``,
    persist ``Document`` metadata via ``AsyncSessionLocal``.
Contract: Returns a dict suitable for API layers; raises ``ValueError`` for bad inputs.
"""
from __future__ import annotations

from typing import IO, Any, Dict, Optional, Union
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.storage_client import (
    build_storage_path,
    storage_public_url,
    upload_bytes,
)
from app.db.models.files import Document
from app.db.postgres import SUPABASE_BUCKET, AsyncSessionLocal


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
        _metadata=metadata or {},
    )
    session.add(doc)
    await session.commit()
    await session.refresh(doc)
    return doc


async def upload_file_to_storage(
    src: Union[UploadFile, bytes, bytearray, IO[bytes]],
    *,
    bucket: Optional[str] = None,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
    upsert: bool = False,
    make_public_url: bool = True,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    bucket = bucket or SUPABASE_BUCKET

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
        if not filename:
            raise ValueError("filename is required when uploading a file-like object")
        data = src.read()
        fname = filename
        ct = content_type or "application/octet-stream"

    storage_path = build_storage_path(fname)
    await upload_bytes(
        storage_path, data, ct, bucket=bucket, upsert=upsert
    )

    url = storage_public_url(storage_path, bucket=bucket) if make_public_url else None

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
        }
