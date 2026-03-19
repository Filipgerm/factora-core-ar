"""File routes — serve stored files from Supabase storage."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import FileCtrl, require_auth

router = APIRouter(dependencies=[Depends(require_auth)])


@router.get("/{filename}")
async def get_file(filename: str, ctl: FileCtrl):
    """Serve a stored file by filename (e.g. GEMI documents, PDFs)."""
    return await ctl.get_file(filename)
