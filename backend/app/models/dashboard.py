from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum
from decimal import Decimal

# from uuid import UUID  # No longer needed


class DashboardMetricsRequest(BaseModel):
    customer_id: str  # Changed to string
    days: int = 30
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    currency: str = "EUR"


class DashboardMetricsResponse(BaseModel):
    net_cash_flow: float
    total_revenue: float
    total_expenses: float
    net_income: float
    average_margin: Optional[float] = None
    balance: float
    currency: str
    period_days: int
    monthly_revenue: List[Dict[str, Any]] = Field(default_factory=list)
    monthly_expenses: List[Dict[str, Any]] = Field(default_factory=list)
    monthly_net_income: List[Dict[str, Any]] = Field(default_factory=list)
    monthly_margin: List[Dict[str, Any]] = Field(default_factory=list)


class TransactionsRequest(BaseModel):
    customer_id: str
    account_id: Optional[str]
    status: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    max_amount: Optional[float]
    min_amount: Optional[float]
    currency_code: Optional[str]
    category: Optional[str]
    merchant_id: Optional[str]
    mcc: Optional[str]
    limit: Optional[int]


class TransactionsResponse(BaseModel):
    id: str
    account_id: str
    status: str
    made_on: date
    posted_date: Optional[date] = None
    amount: float
    currency_code: str
    category: str
    merchant_id: Optional[str] = None
    mcc: Optional[str] = None
    description: str
    iban: Optional[str] = None


class SellerMetricsRequest(BaseModel):
    """Empty request model. The organization_id is handled natively by the Service DI."""

    pass


class SellerMetricsResponse(BaseModel):
    total_counterparties: int
    total_active_alerts: int


# -----------------------------
# AADE Documents Models
# -----------------------------
class AadeDocumentsRequest(BaseModel):
    """Request model for querying AADE documents with filters and pagination."""

    date_from: Optional[date] = Field(
        None, description="Filter invoices from this date"
    )
    date_to: Optional[date] = Field(None, description="Filter invoices to this date")
    invoice_type: Optional[str] = Field(None, description="Filter by invoice type")
    issuer_vat: Optional[str] = Field(None, description="Filter by issuer VAT number")
    counterpart_vat: Optional[str] = Field(
        None, description="Filter by counterpart VAT number"
    )
    limit: int = Field(
        50, ge=1, le=1000, description="Maximum number of invoices to return"
    )
    offset: int = Field(
        0, ge=0, description="Number of invoices to skip for pagination"
    )


class AadeInvoiceItem(BaseModel):
    """Normalized invoice item for dashboard display."""

    id: str
    document_id: str
    uid: Optional[str] = None
    mark: Optional[int] = None
    authentication_code: Optional[str] = None
    issuer_vat: Optional[str] = None
    issuer_country: Optional[str] = None
    issuer_branch: Optional[int] = None
    counterpart_vat: Optional[str] = None
    counterpart_country: Optional[str] = None
    counterpart_branch: Optional[int] = None
    series: Optional[str] = None
    aa: Optional[str] = None
    issue_date: Optional[date] = None
    invoice_type: Optional[str] = None
    currency: Optional[str] = None
    total_net_value: Optional[Decimal] = None
    total_vat_amount: Optional[Decimal] = None
    total_gross_value: Optional[Decimal] = None
    created_at: datetime


class AadeDocumentsResponse(BaseModel):
    """Paginated response for AADE documents."""

    invoices: List[AadeInvoiceItem] = Field(default_factory=list)
    total: int = Field(..., description="Total number of invoices matching filters")
    limit: int
    offset: int


# -----------------------------
# AADE Summary Models
# -----------------------------
class PartySummary(BaseModel):
    """Income/expense breakdown per counterparty."""

    vat: Optional[str] = Field(None, description="Supplier VAT number")
    invoice_count: int = Field(..., description="Number of invoices")
    total_net_value_sum: Decimal = Field(..., description="Sum of net values")
    total_vat_amount_sum: Decimal = Field(..., description="Sum of VAT amounts")
    total_gross_value_sum: Decimal = Field(..., description="Sum of gross values")


class AadeSummaryResponse(BaseModel):
    """Aggregated statistics for AADE invoices of a business."""

    # Global totals across all invoices
    total_net_value_sum: Decimal = Field(..., description="Sum of all net values")
    total_vat_amount_sum: Decimal = Field(..., description="Sum of all VAT amounts")
    total_gross_value_sum: Decimal = Field(..., description="Sum of all gross values")

    # Supplier and customer counts
    supplier_count: int = Field(
        ...,
        description="Number of distinct suppliers (issuer_vat for received invoices)",
    )
    customer_count: int = Field(
        ...,
        description="Number of distinct customers (counterpart_vat for transmitted invoices)",
    )

    # Per-customer income breakdown (for transmitted invoices)
    customer_breakdown: List[PartySummary] = Field(
        default_factory=list, description="Income breakdown per customer"
    )

    # Per-supplier expense breakdown (for received invoices)
    supplier_breakdown: List[PartySummary] = Field(
        default_factory=list, description="Expense breakdown per supplier"
    )
