"""Pydantic request/response schemas for the unified ``invoices`` API."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class InvoiceSourceEnum(str, Enum):
    """Wire format matches ``InvoiceSource`` ORM enum values."""

    MANUAL = "manual"
    AADE = "aade"
    OCR_PDF = "ocr_pdf"
    CSV_IMPORT = "csv_import"


class InvoiceCreateRequest(BaseModel):
    """Create an invoice row (dashboard manual entry by default)."""

    source: InvoiceSourceEnum = InvoiceSourceEnum.MANUAL
    external_id: str | None = Field(None, max_length=255)
    counterparty_id: str | None = Field(None, description="UUID of linked counterparty")
    counterparty_display_name: str | None = Field(None, max_length=255)
    customer_name: str | None = Field(
        None,
        max_length=255,
        description="Alias for counterparty_display_name (frontend convenience)",
    )
    amount: Decimal = Field(..., gt=0)
    currency: str = Field(default="EUR", min_length=3, max_length=3)
    issue_date: date
    due_date: date | None = None
    status: str = Field(default="draft", max_length=32)

    @model_validator(mode="after")
    def _manual_requires_label(self) -> InvoiceCreateRequest:
        if self.source == InvoiceSourceEnum.MANUAL and not self.counterparty_id:
            label = (
                (self.counterparty_display_name or "").strip()
                or (self.customer_name or "").strip()
            )
            if not label:
                raise ValueError(
                    "Manual invoices require counterparty_display_name or customer_name "
                    "when counterparty_id is omitted."
                )
        return self

    def resolved_counterparty_display_name(self) -> str | None:
        return (
            (self.counterparty_display_name or "").strip()
            or (self.customer_name or "").strip()
            or None
        )


class InvoiceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    organization_id: str
    source: InvoiceSourceEnum
    external_id: str | None
    counterparty_id: str | None
    counterparty_display_name: str | None
    amount: Decimal
    currency: str
    issue_date: date
    due_date: date | None
    status: str
