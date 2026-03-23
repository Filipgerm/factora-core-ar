"""File routes — upload and serve stored files from Supabase storage."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.dependencies import FileCtrl, require_auth
from app.models.files import FileUploadResponse

router = APIRouter(dependencies=[Depends(require_auth)])


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    ctl: FileCtrl,
    file: UploadFile = File(..., description="File to store (e.g. PDF bill)"),
    purpose: str | None = Form(
        None,
        description="Optional tag e.g. ap_bill for downstream processing",
    ),
):
    """Multipart upload: stores bytes in Supabase and creates a ``documents`` row."""
    return await ctl.upload_document(file=file, purpose=purpose)


@router.get("/{filename}")
async def get_file(filename: str, ctl: FileCtrl):
    """Serve a stored file by filename (e.g. GEMI documents, PDFs)."""
    return await ctl.get_file(filename)
