from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date, timezone
from enum import Enum
from decimal import Decimal


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    PARTIAL = "partial"


class InvoiceType(str, Enum):
    SALES = "sales"
    PURCHASE = "purchase"
    CREDIT_NOTE = "credit_note"
    DEBIT_NOTE = "debit_note"


class CustomerReliability(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    AVERAGE = "average"
    POOR = "poor"
    UNKNOWN = "unknown"


class Invoice(BaseModel):
    """Model for invoice data"""
    id: Optional[str] = None
    invoice_number: str
    customer_id: str
    customer_name: str
    # Optional attributes to support grouping/segmentation
    region: Optional[str] = None
    invoice_date: date
    due_date: date
    amount: Decimal = Field(..., decimal_places=2)
    tax_amount: Decimal = Field(default=Decimal('0.00'), decimal_places=2)
    total_amount: Decimal = Field(..., decimal_places=2)
    status: PaymentStatus
    invoice_type: InvoiceType
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Financial analysis fields
    days_overdue: Optional[int] = None
    customer_reliability: CustomerReliability = CustomerReliability.UNKNOWN
    payment_terms: Optional[int] = None  # days


class AccountReceivable(BaseModel):
    """Model for accounts receivable"""
    id: Optional[str] = None
    customer_id: str
    customer_name: str
    invoice_id: str
    amount: Decimal = Field(..., decimal_places=2)
    due_date: date
    status: PaymentStatus
    days_overdue: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AccountPayable(BaseModel):
    """Model for accounts payable"""
    id: Optional[str] = None
    supplier_id: str
    supplier_name: str
    invoice_id: str
    amount: Decimal = Field(..., decimal_places=2)
    due_date: date
    status: PaymentStatus
    days_until_due: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FinancialMetrics(BaseModel):
    """Model for key financial metrics"""
    id: Optional[str] = None
    period_start: date
    period_end: date
    total_revenue: Decimal = Field(..., decimal_places=2)
    total_expenses: Decimal = Field(..., decimal_places=2)
    net_profit: Decimal = Field(..., decimal_places=2)
    gross_profit: Decimal = Field(..., decimal_places=2)
    operating_expenses: Decimal = Field(..., decimal_places=2)
    accounts_receivable_total: Decimal = Field(..., decimal_places=2)
    accounts_payable_total: Decimal = Field(..., decimal_places=2)
    cash_flow: Decimal = Field(..., decimal_places=2)
    profit_margin: Decimal = Field(..., decimal_places=2)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Customer(BaseModel):
    """Model for customer data"""
    id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    reliability_score: CustomerReliability = CustomerReliability.UNKNOWN
    total_purchases: Decimal = Field(default=Decimal('0.00'), decimal_places=2)
    average_payment_days: Optional[int] = None
    last_purchase_date: Optional[date] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Supplier(BaseModel):
    """Model for supplier data"""
    id: Optional[str] = None
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    total_purchases: Decimal = Field(default=Decimal('0.00'), decimal_places=2)
    average_payment_days: Optional[int] = None
    last_purchase_date: Optional[date] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChatbotQuery(BaseModel):
    """Model for chatbot query requests"""
    query: str = Field(..., min_length=1, max_length=1000)
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class ChatbotResponse(BaseModel):
    """Model for chatbot responses"""
    answer: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    data_sources: List[str] = []
    calculations: Optional[Dict[str, Any]] = None
    suggestions: Optional[List[str]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FinancialAnalysisRequest(BaseModel):
    """Model for financial analysis requests"""
    analysis_type: str
    parameters: Dict[str, Any]
    date_range: Optional[Dict[str, date]] = None
    filters: Optional[Dict[str, Any]] = None


class FinancialAnalysisResponse(BaseModel):
    """Model for financial analysis responses"""
    analysis_type: str
    results: Dict[str, Any]
    summary: str
    insights: List[str]
    recommendations: List[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
