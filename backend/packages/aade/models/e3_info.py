from __future__ import annotations
from typing import Optional, List, Union
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, Field, condecimal, field_validator

from packages.aade.models.common import ContinuationTokenType
from packages.aade.utils.dates import _to_ddmmyyyy

# XSD: <xs:element name="V_Class_Value" type="xs:decimal" minOccurs="0"/>
# Decimal amounts with 2 decimal places, non-negative
Money = condecimal(max_digits=18, decimal_places=2, ge=0)

# ---------- Query DTO ----------


class RequestE3InfoQuery(BaseModel):
    """Query parameters for GET /myDATA/RequestE3Info"""

    model_config = ConfigDict(extra="forbid")

    dateFrom: Union[str, date, datetime]
    dateTo: Union[str, date, datetime]
    entityVatNumber: Optional[str] = None
    GroupedPerDay: Optional[bool] = None
    nextPartitionKey: Optional[str] = None  # used when GroupedPerDay == False
    nextRowKey: Optional[str] = None

    @field_validator("dateFrom", "dateTo", mode="before")
    @classmethod
    def _normalize_dates(cls, v):
        return _to_ddmmyyyy(v) if v is not None else v


# ---------- Row & Response ----------


class E3InfoRow(BaseModel):
    """
    One E3 info row (InvoiceE3DetailType from XSD).
    XSD field names use specific capitalization: V_Afm, V_Mark, vBook, IsCancelled, IssueDate, etc.
    When GroupedPerDay=false (per-invoice): 'V_Mark' and 'IsCancelled' may be present.
    When GroupedPerDay=true (daily aggregation): 'V_Mark' is typically absent.
    """

    model_config = ConfigDict(extra="allow")

    # XSD: <xs:element name="V_Afm" type="xs:string" minOccurs="0"/>
    V_Afm: Optional[str] = None
    # XSD: <xs:element name="V_Mark" type="xs:string" minOccurs="0"/>
    V_Mark: Optional[str] = None
    # XSD: <xs:element name="vBook" type="xs:string" minOccurs="0"/>
    vBook: Optional[str] = None
    # XSD: <xs:element name="IsCancelled" type="xs:boolean" minOccurs="0"/>
    IsCancelled: Optional[bool] = None

    # XSD: <xs:element name="IssueDate" type="xs:dateTime"/> (required)
    IssueDate: datetime

    # XSD: <xs:element name="V_Class_Category" type="xs:string" minOccurs="0"/>
    V_Class_Category: Optional[str] = None
    # XSD: <xs:element name="V_Class_Type" type="xs:string" minOccurs="0"/>
    V_Class_Type: Optional[str] = None
    # XSD: <xs:element name="V_Class_Value" type="xs:decimal" minOccurs="0"/>
    V_Class_Value: Optional[Money] = None


class RequestE3InfoResponse(BaseModel):
    """Response container for GET /myDATA/RequestE3Info"""

    model_config = ConfigDict(extra="allow")

    rows: List[E3InfoRow] = Field(default_factory=list)
    continuationToken: Optional[ContinuationTokenType] = None
