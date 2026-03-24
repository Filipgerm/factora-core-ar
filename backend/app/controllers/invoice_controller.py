"""InvoiceController — HTTP-facing orchestration for unified invoices."""

from __future__ import annotations

from app.core.exceptions import ValidationError
from app.db.models.invoices import InvoiceSource
from app.models.invoices import InvoiceCreateRequest, InvoiceResponse
from app.services.invoice_service import InvoiceService


class InvoiceController:
    def __init__(self, service: InvoiceService) -> None:
        self.service = service

    async def create(self, body: InvoiceCreateRequest) -> InvoiceResponse:
        row = await self.service.create(body)
        return InvoiceResponse.model_validate(row)

    async def list_invoices(
        self,
        *,
        source: str | None = None,
    ) -> list[InvoiceResponse]:
        filter_src: InvoiceSource | None = None
        if source is not None and source.strip() != "":
            raw = source.strip().lower()
            try:
                filter_src = InvoiceSource(raw)
            except ValueError as exc:
                raise ValidationError(
                    f"Invalid invoice source: {source}",
                    code="validation.invalid_enum",
                    fields={
                        "source": "Expected one of: manual, aade, ocr_pdf, csv_import",
                    },
                ) from exc
        rows = await self.service.list_for_org(source=filter_src)
        return [InvoiceResponse.model_validate(r) for r in rows]
