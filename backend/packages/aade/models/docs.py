from __future__ import annotations
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Any, Optional, List, Union
from datetime import datetime, date
from packages.aade.models.common import ContinuationTokenType
from packages.aade.models.invoice_types import (
    AadeBookInvoiceType,
    CancelledInvoiceType,
    IncomeClassificationType,
    ExpensesClassificationType,
    PaymentMethodDetailType,
)
from packages.aade.utils.dates import _to_ddmmyyyy


# --- Query DTOs ---


class DocsQuery(BaseModel):
    """
    Query parameters for GET /myDATA/RequestDocs
    """

    model_config = ConfigDict(extra="forbid")

    mark: int
    entityVatNumber: Optional[str] = None
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None
    receiverVatNumber: Optional[str] = None
    invType: Optional[str] = None
    maxMark: Optional[int] = None
    nextPartitionKey: Optional[str] = None
    nextRowKey: Optional[str] = None

    @field_validator("dateFrom", "dateTo", mode="before")
    @classmethod
    def _normalize_dates(cls, v):
        if v is None:
            return v
        return _to_ddmmyyyy(v)


RequestDocsQuery = DocsQuery
RequestTransmittedDocsQuery = DocsQuery

# --- Section models used only inside Request*Docs responses ---


class PaymentMethodType(BaseModel):
    """
    Wrapper used by paymentMethodsDoc in Request*Docs responses.
    It ties one or more payment method details to an invoice via invoiceMark.
    """

    model_config = ConfigDict(extra="allow")

    invoiceMark: int
    paymentMethodDetails: List[PaymentMethodDetailType] = Field(default_factory=list)


# --- Response container ---


class RequestedDocsResponse(BaseModel):
    """
    Container returned by both RequestDocs and RequestTransmittedDocs.
    Each section may or may not be present; default to empty lists for convenience.
    """

    model_config = ConfigDict(extra="allow")

    continuationToken: Optional[ContinuationTokenType] = None
    invoicesDoc: List[AadeBookInvoiceType] = Field(default_factory=list)
    cancelledInvoicesDoc: List[CancelledInvoiceType] = Field(default_factory=list)
    incomeClassificationsDoc: List[IncomeClassificationType] = Field(
        default_factory=list
    )
    expensesClassificationsDoc: List[ExpensesClassificationType] = Field(
        default_factory=list
    )
    paymentMethodsDoc: List[PaymentMethodType] = Field(default_factory=list)
