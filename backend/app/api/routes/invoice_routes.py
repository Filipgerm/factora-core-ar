"""Unified invoice routes (all ingestion sources)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.dependencies import InvoiceCtrl, require_auth
from app.models.invoices import InvoiceCreateRequest, InvoiceResponse

router = APIRouter(dependencies=[Depends(require_auth)])


@router.post(
    "",
    response_model=InvoiceResponse,
    summary="Create an invoice",
)
async def create_invoice(
    body: InvoiceCreateRequest,
    ctl: InvoiceCtrl,
):
    return await ctl.create(body)


@router.get(
    "",
    response_model=list[InvoiceResponse],
    summary="List invoices for the organization",
)
async def list_invoices(
    ctl: InvoiceCtrl,
    source: str | None = Query(
        None,
        description="Filter by source: manual, aade, ocr_pdf, csv_import, gmail",
    ),
):
    return await ctl.list_invoices(source=source)
