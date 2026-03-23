"""Supabase Storage client — upload and URL helpers (no DB).

Scope: Thread-pooled object storage calls so the async event loop is not blocked.
Contract: Uses ``get_supabase()`` from ``app.db.postgres``; raises underlying client errors.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import uuid4

import anyio

from app.db.postgres import SUPABASE_BUCKET, get_supabase


def secure_filename(name: str) -> str:
    name = name.split("/")[-1].split("\\")[-1]
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    return name or f"file_{uuid4().hex}"


def build_storage_path(filename: str) -> str:
    today = datetime.now(timezone.utc)
    return f"{today:%Y/%m/%d}/{uuid4().hex}_{secure_filename(filename)}"


async def upload_bytes(
    storage_path: str,
    data: bytes,
    content_type: str,
    *,
    bucket: str | None = None,
    upsert: bool = False,
) -> None:
    supabase = get_supabase()
    b = bucket or SUPABASE_BUCKET

    def _do_upload() -> None:
        supabase.storage.from_(b).upload(
            storage_path,
            data,
            file_options={
                "contentType": content_type,
                "cacheControl": "3600",
                "upsert": upsert,
            },
        )

    await anyio.to_thread.run_sync(_do_upload)


def storage_public_url(storage_path: str, *, bucket: str | None = None) -> str:
    supabase = get_supabase()
    b = bucket or SUPABASE_BUCKET
    return supabase.storage.from_(b).get_public_url(storage_path)
