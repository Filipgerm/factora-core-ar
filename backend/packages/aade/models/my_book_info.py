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
from packages.aade.utils.dates import _to_ddmmyyyy
from packages.aade.models.common import ContinuationTokenType

# Reuse a money-like decimal (AADE amounts are decimals; 2dp is typical but not guaranteed in text).
Money = condecimal(max_digits=18, decimal_places=2, ge=0)


# ---------- Query DTO ----------


class BookInfoQuery(BaseModel):
    """Query parameters for GET /myDATA/RequestMyIncome and GET /myDATA/RequestMyExpenses"""

    model_config = ConfigDict(extra="forbid")

    dateFrom: str
    dateTo: str
    counterVatNumber: Optional[str] = None
    entityVatNumber: Optional[str] = None
    invType: Optional[str] = None
    nextPartitionKey: Optional[str] = None
    nextRowKey: Optional[str] = None

    @field_validator("dateFrom", "dateTo", mode="before")
    @classmethod
    def _normalize_dates(cls, v):
        return _to_ddmmyyyy(v) if v is not None else v


# Keep the familiar names via aliases:
RequestMyIncomeQuery = BookInfoQuery
RequestMyExpensesQuery = BookInfoQuery


# ---------- Row & Response ----------


class BookInfoRow(BaseModel):
    """
    One aggregated income/expenses row (BookInfo from XML).
    AADE groups by (counterVatNumber?, issueDate, invType, entity VAT).
    All amount fields are optional decimals.

    XML structure from RequestedBookInfo:
    <bookInfo>
      <counterVatNumber>...</counterVatNumber>?
      <issueDate>...</issueDate> (required)
      <invType>...</invType> (required)
      <selfpricing>...</selfpricing>? (lowercase in XML)
      <invoiceDetailType>...</invoiceDetailType>?
      <netValue>...</netValue>?
      <vatAmount>...</vatAmount>?
      <withheldAmount>...</withheldAmount>?
      <otherTaxesAmount>...</otherTaxesAmount>?
      <stampDutyAmount>...</stampDutyAmount>?
      <feesAmount>...</feesAmount>?
      <deductionsAmount>...</deductionsAmount>?
      <thirdPartyAmount>...</thirdPartyAmount>?
      <grossValue>...</grossValue>?
      <count>...</count> (required)
      <minMark>...</minMark>?
      <maxMark>...</maxMark>?
    </bookInfo>
    """

    model_config = ConfigDict(extra="allow")

    # Keys / descriptors
    counterVatNumber: Optional[str] = None
    issueDate: date  # Required per XML
    invType: str  # Required per XML (InvoiceType enum value)
    selfPricing: Optional[bool] = Field(
        default=None, alias="selfpricing"
    )  # XML uses lowercase "selfpricing"
    invoiceDetailType: Optional[int] = None

    # Amounts (aggregated) - all optional per XML
    netValue: Optional[Money] = None
    vatAmount: Optional[Money] = None
    withheldAmount: Optional[Money] = None
    otherTaxesAmount: Optional[Money] = None
    stampDutyAmount: Optional[Money] = None
    feesAmount: Optional[Money] = None
    deductionsAmount: Optional[Money] = None
    thirdPartyAmount: Optional[Money] = None
    grossValue: Optional[Money] = None

    # Aggregation helpers
    count: int  # Required per XML
    minMark: Optional[str] = None  # String in XML (can be large numbers)
    maxMark: Optional[str] = None  # String in XML (can be large numbers)


# ---------- Unified Response + Aliases ----------


class RequestBookInfoResponse(BaseModel):
    """Response container for both /myDATA/RequestMyIncome and /myDATA/RequestMyExpenses"""

    model_config = ConfigDict(extra="allow")

    bookInfo: List[BookInfoRow] = Field(default_factory=list)
    continuationToken: Optional[ContinuationTokenType] = None


# Keep explicit endpoint-style names as aliases for readability
RequestMyIncomeResponse = RequestBookInfoResponse
RequestMyExpensesResponse = RequestBookInfoResponse
