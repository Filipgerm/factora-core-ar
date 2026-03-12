from __future__ import annotations
from typing import Optional, List, Union, Dict, Any
from datetime import date, datetime
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    condecimal,
    field_validator,
    model_validator,
)

from packages.aade.models.common import ContinuationTokenType
from packages.aade.utils.dates import _to_ddmmyyyy

# XSD: <xs:element name="Vat301" type="xs:decimal" minOccurs="0"/>
# Decimal amounts with 2 decimal places, non-negative
Money = condecimal(max_digits=18, decimal_places=2, ge=0)


# ---------- Query DTO ----------


class RequestVatInfoQuery(BaseModel):
    """Query parameters for GET /myDATA/RequestVatInfo"""

    model_config = ConfigDict(extra="forbid")

    dateFrom: Union[str, date, datetime]
    dateTo: Union[str, date, datetime]
    entityVatNumber: Optional[str] = None
    GroupedPerDay: Optional[bool] = (
        None  # AADE accepts this as a boolean-like query param
    )
    nextPartitionKey: Optional[str] = None  # used when GroupedPerDay == False
    nextRowKey: Optional[str] = None

    @field_validator("dateFrom", "dateTo", mode="before")
    @classmethod
    def _normalize_dates(cls, v):
        return _to_ddmmyyyy(v) if v is not None else v


# ---------- Row & Response ----------


class VatInfoRow(BaseModel):
    """
    One VAT info row (InvoiceVatDetailType from XSD).
    XSD field names are capitalized: Mark, IsCancelled, IssueDate, Vat301, etc.
    When GroupedPerDay=false (per-invoice): 'Mark' and 'IsCancelled' may be present.
    When GroupedPerDay=true (daily aggregation): 'Mark' is typically absent.
    """

    model_config = ConfigDict(extra="allow")

    # per-invoice identifiers (optional in grouped results)
    # XSD: <xs:element name="Mark" type="xs:string" minOccurs="0"/>
    Mark: Optional[str] = None
    # XSD: <xs:element name="IsCancelled" type="xs:boolean" minOccurs="0"/>
    IsCancelled: Optional[bool] = None

    # XSD: <xs:element name="IssueDate" type="xs:dateTime"/> (required)
    IssueDate: datetime

    # VAT amount fields - all optional per XSD (minOccurs="0")
    # XSD: <xs:element name="Vat301" type="xs:decimal" minOccurs="0"/>
    Vat301: Optional[Money] = None
    Vat302: Optional[Money] = None
    Vat303: Optional[Money] = None
    Vat304: Optional[Money] = None
    Vat305: Optional[Money] = None
    Vat306: Optional[Money] = None

    Vat331: Optional[Money] = None
    Vat332: Optional[Money] = None
    Vat333: Optional[Money] = None
    Vat334: Optional[Money] = None
    Vat335: Optional[Money] = None
    Vat336: Optional[Money] = None

    Vat361: Optional[Money] = None
    Vat362: Optional[Money] = None
    Vat363: Optional[Money] = None
    Vat364: Optional[Money] = None
    Vat365: Optional[Money] = None
    Vat366: Optional[Money] = None

    Vat381: Optional[Money] = None
    Vat382: Optional[Money] = None
    Vat383: Optional[Money] = None
    Vat384: Optional[Money] = None
    Vat385: Optional[Money] = None
    Vat386: Optional[Money] = None

    Vat342: Optional[Money] = None
    Vat345: Optional[Money] = None
    Vat348: Optional[Money] = None
    Vat349: Optional[Money] = None
    Vat310: Optional[Money] = None

    Vat402: Optional[Money] = None
    Vat407: Optional[Money] = None
    Vat411: Optional[Money] = None
    Vat423: Optional[Money] = None
    Vat422: Optional[Money] = None

    VatUnclassified361: Optional[Money] = None
    VatUnclassified381: Optional[Money] = None


class RequestVatInfoResponse(BaseModel):
    """Response container for GET /myDATA/RequestVatInfo"""

    model_config = ConfigDict(extra="allow")

    rows: List[VatInfoRow] = Field(default_factory=list)
    continuationToken: Optional[ContinuationTokenType] = None
