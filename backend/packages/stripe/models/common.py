"""Pydantic request/response schemas for Stripe mirror tables (local ERP cache).

Amounts are integers in the smallest currency unit (e.g. cents), matching Stripe
and our ORM. Responses map 1:1 to persisted columns via ``from_attributes``.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class _StripeMirrorTimestamps(BaseModel):
    created_at: datetime
    updated_at: datetime


class _StripeMirrorCore(BaseModel):
    """Shared fields for org-scoped Stripe mirror rows (except balance snapshots)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


# ---------------------------------------------------------------------------
# BalanceTransaction
# ---------------------------------------------------------------------------


class StripeBalanceTransactionCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    amount: int
    currency: str = Field(..., min_length=3, max_length=3)
    description: str | None = None
    fee: int = 0
    net: int
    status: str | None = Field(None, max_length=64)
    type: str | None = Field(None, max_length=64)
    reporting_category: str | None = Field(None, max_length=128)
    source: str | None = Field(None, max_length=255)
    stripe_created: datetime | None = None
    available_on: datetime | None = None
    exchange_rate: float | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeBalanceTransactionUpdate(BaseModel):
    amount: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    description: str | None = None
    fee: int | None = None
    net: int | None = None
    status: str | None = Field(None, max_length=64)
    type: str | None = Field(None, max_length=64)
    reporting_category: str | None = Field(None, max_length=128)
    source: str | None = Field(None, max_length=255)
    stripe_created: datetime | None = None
    available_on: datetime | None = None
    exchange_rate: float | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeBalanceTransactionResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    amount: int
    currency: str
    description: str | None = None
    fee: int
    net: int
    status: str | None = None
    type: str | None = None
    reporting_category: str | None = None
    source: str | None = None
    stripe_created: datetime | None = None
    available_on: datetime | None = None
    exchange_rate: float | None = None


# ---------------------------------------------------------------------------
# Payout
# ---------------------------------------------------------------------------


class StripePayoutCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    amount: int
    currency: str = Field(..., min_length=3, max_length=3)
    status: str | None = Field(None, max_length=32)
    arrival_date: datetime | None = None
    automatic: bool | None = None
    balance_transaction_id: str | None = Field(None, max_length=255)
    destination: str | None = Field(None, max_length=255)
    failure_code: str | None = Field(None, max_length=128)
    failure_message: str | None = None
    method: str | None = Field(None, max_length=32)
    payout_type: str | None = Field(None, max_length=32)
    statement_descriptor: str | None = Field(None, max_length=255)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripePayoutUpdate(BaseModel):
    amount: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    status: str | None = Field(None, max_length=32)
    arrival_date: datetime | None = None
    automatic: bool | None = None
    balance_transaction_id: str | None = Field(None, max_length=255)
    destination: str | None = Field(None, max_length=255)
    failure_code: str | None = Field(None, max_length=128)
    failure_message: str | None = None
    method: str | None = Field(None, max_length=32)
    payout_type: str | None = Field(None, max_length=32)
    statement_descriptor: str | None = Field(None, max_length=255)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripePayoutResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    amount: int
    currency: str
    status: str | None = None
    arrival_date: datetime | None = None
    automatic: bool | None = None
    balance_transaction_id: str | None = None
    destination: str | None = None
    failure_code: str | None = None
    failure_message: str | None = None
    method: str | None = None
    stripe_type: str | None = None
    statement_descriptor: str | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# Balance snapshot (point-in-time; not a Stripe object id mirror)
# ---------------------------------------------------------------------------


class StripeBalanceSnapshotCreate(BaseModel):
    organization_id: UUID
    available: list[Any] | dict[str, Any]
    pending: list[Any] | dict[str, Any]
    connect_reserved: list[Any] | dict[str, Any] | None = None
    instant_available: list[Any] | dict[str, Any] | None = None
    livemode: bool | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeBalanceSnapshotUpdate(BaseModel):
    available: list[Any] | dict[str, Any] | None = None
    pending: list[Any] | dict[str, Any] | None = None
    connect_reserved: list[Any] | dict[str, Any] | None = None
    instant_available: list[Any] | dict[str, Any] | None = None
    livemode: bool | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeBalanceSnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    available: list[Any] | dict[str, Any]
    pending: list[Any] | dict[str, Any]
    connect_reserved: list[Any] | dict[str, Any] | None = None
    instant_available: list[Any] | dict[str, Any] | None = None
    livemode: bool | None = None
    raw_stripe_object: dict[str, Any] | None = None
    retrieved_at: datetime


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------


class StripeCustomerCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    email: str | None = Field(None, max_length=255)
    name: str | None = Field(None, max_length=512)
    phone: str | None = Field(None, max_length=64)
    description: str | None = None
    balance: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    delinquent: bool | None = None
    invoice_prefix: str | None = Field(None, max_length=32)
    tax_exempt: str | None = Field(None, max_length=32)
    default_source: str | None = Field(None, max_length=255)
    address: dict[str, Any] | None = None
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeCustomerUpdate(BaseModel):
    email: str | None = Field(None, max_length=255)
    name: str | None = Field(None, max_length=512)
    phone: str | None = Field(None, max_length=64)
    description: str | None = None
    balance: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    delinquent: bool | None = None
    invoice_prefix: str | None = Field(None, max_length=32)
    tax_exempt: str | None = Field(None, max_length=32)
    default_source: str | None = Field(None, max_length=255)
    address: dict[str, Any] | None = None
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeCustomerResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    email: str | None = None
    name: str | None = None
    phone: str | None = None
    description: str | None = None
    balance: int | None = None
    currency: str | None = None
    delinquent: bool | None = None
    invoice_prefix: str | None = None
    tax_exempt: str | None = None
    default_source: str | None = None
    address: dict[str, Any] | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# Subscription
# ---------------------------------------------------------------------------


class StripeSubscriptionCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    customer_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool | None = None
    canceled_at: datetime | None = None
    collection_method: str | None = Field(None, max_length=32)
    default_payment_method: str | None = Field(None, max_length=255)
    items_data: dict[str, Any] | list[Any] | None = None
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeSubscriptionUpdate(BaseModel):
    customer_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool | None = None
    canceled_at: datetime | None = None
    collection_method: str | None = Field(None, max_length=32)
    default_payment_method: str | None = Field(None, max_length=255)
    items_data: dict[str, Any] | list[Any] | None = None
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeSubscriptionResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    customer_stripe_id: str | None = None
    status: str | None = None
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool | None = None
    canceled_at: datetime | None = None
    collection_method: str | None = None
    default_payment_method: str | None = None
    items_data: dict[str, Any] | list[Any] | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# Invoice
# ---------------------------------------------------------------------------


class StripeInvoiceCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    customer_stripe_id: str | None = Field(None, max_length=255)
    subscription_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    currency: str | None = Field(None, min_length=3, max_length=3)
    amount_due: int | None = None
    amount_paid: int | None = None
    amount_remaining: int | None = None
    subtotal: int | None = None
    total: int | None = None
    tax: int | None = None
    billing_reason: str | None = Field(None, max_length=64)
    collection_method: str | None = Field(None, max_length=32)
    hosted_invoice_url: str | None = None
    invoice_pdf: str | None = None
    number: str | None = Field(None, max_length=128)
    paid: bool | None = None
    period_start: datetime | None = None
    period_end: datetime | None = None
    stripe_created: datetime | None = None
    due_date: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeInvoiceUpdate(BaseModel):
    customer_stripe_id: str | None = Field(None, max_length=255)
    subscription_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    currency: str | None = Field(None, min_length=3, max_length=3)
    amount_due: int | None = None
    amount_paid: int | None = None
    amount_remaining: int | None = None
    subtotal: int | None = None
    total: int | None = None
    tax: int | None = None
    billing_reason: str | None = Field(None, max_length=64)
    collection_method: str | None = Field(None, max_length=32)
    hosted_invoice_url: str | None = None
    invoice_pdf: str | None = None
    number: str | None = Field(None, max_length=128)
    paid: bool | None = None
    period_start: datetime | None = None
    period_end: datetime | None = None
    stripe_created: datetime | None = None
    due_date: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeInvoiceResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    customer_stripe_id: str | None = None
    subscription_stripe_id: str | None = None
    status: str | None = None
    currency: str | None = None
    amount_due: int | None = None
    amount_paid: int | None = None
    amount_remaining: int | None = None
    subtotal: int | None = None
    total: int | None = None
    tax: int | None = None
    billing_reason: str | None = None
    collection_method: str | None = None
    hosted_invoice_url: str | None = None
    invoice_pdf: str | None = None
    number: str | None = None
    paid: bool | None = None
    period_start: datetime | None = None
    period_end: datetime | None = None
    stripe_created: datetime | None = None
    due_date: datetime | None = None


# ---------------------------------------------------------------------------
# Invoice line item
# ---------------------------------------------------------------------------


class StripeInvoiceLineItemCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    invoice_stripe_id: str = Field(..., max_length=255)
    amount: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    description: str | None = None
    quantity: int | None = None
    price_stripe_id: str | None = Field(None, max_length=255)
    product_stripe_id: str | None = Field(None, max_length=255)
    unit_amount: int | None = None
    discountable: bool | None = None
    line_type: str | None = Field(None, max_length=32)
    period: dict[str, Any] | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeInvoiceLineItemUpdate(BaseModel):
    invoice_stripe_id: str | None = Field(None, max_length=255)
    amount: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    description: str | None = None
    quantity: int | None = None
    price_stripe_id: str | None = Field(None, max_length=255)
    product_stripe_id: str | None = Field(None, max_length=255)
    unit_amount: int | None = None
    discountable: bool | None = None
    line_type: str | None = Field(None, max_length=32)
    period: dict[str, Any] | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeInvoiceLineItemResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    invoice_stripe_id: str
    amount: int | None = None
    currency: str | None = None
    description: str | None = None
    quantity: int | None = None
    price_stripe_id: str | None = None
    product_stripe_id: str | None = None
    unit_amount: int | None = None
    discountable: bool | None = None
    stripe_type: str | None = None
    period: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Credit note
# ---------------------------------------------------------------------------


class StripeCreditNoteCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    invoice_stripe_id: str | None = Field(None, max_length=255)
    customer_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    currency: str | None = Field(None, min_length=3, max_length=3)
    amount: int | None = None
    subtotal: int | None = None
    total: int | None = None
    reason: str | None = Field(None, max_length=64)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeCreditNoteUpdate(BaseModel):
    invoice_stripe_id: str | None = Field(None, max_length=255)
    customer_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    currency: str | None = Field(None, min_length=3, max_length=3)
    amount: int | None = None
    subtotal: int | None = None
    total: int | None = None
    reason: str | None = Field(None, max_length=64)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeCreditNoteResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    invoice_stripe_id: str | None = None
    customer_stripe_id: str | None = None
    status: str | None = None
    currency: str | None = None
    amount: int | None = None
    subtotal: int | None = None
    total: int | None = None
    reason: str | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------


class StripeProductCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    name: str | None = Field(None, max_length=512)
    active: bool | None = None
    description: str | None = None
    default_price_id: str | None = Field(None, max_length=255)
    images: list[Any] | None = None
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeProductUpdate(BaseModel):
    name: str | None = Field(None, max_length=512)
    active: bool | None = None
    description: str | None = None
    default_price_id: str | None = Field(None, max_length=255)
    images: list[Any] | None = None
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeProductResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    name: str | None = None
    active: bool | None = None
    description: str | None = None
    default_price_id: str | None = None
    images: list[Any] | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# Price
# ---------------------------------------------------------------------------


class StripePriceCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    product_stripe_id: str | None = Field(None, max_length=255)
    active: bool | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    unit_amount: int | None = None
    billing_scheme: str | None = Field(None, max_length=32)
    price_type: str | None = Field(None, max_length=32)
    recurring: dict[str, Any] | None = None
    tax_behavior: str | None = Field(None, max_length=32)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripePriceUpdate(BaseModel):
    product_stripe_id: str | None = Field(None, max_length=255)
    active: bool | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    unit_amount: int | None = None
    billing_scheme: str | None = Field(None, max_length=32)
    price_type: str | None = Field(None, max_length=32)
    recurring: dict[str, Any] | None = None
    tax_behavior: str | None = Field(None, max_length=32)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripePriceResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    product_stripe_id: str | None = None
    active: bool | None = None
    currency: str | None = None
    unit_amount: int | None = None
    billing_scheme: str | None = None
    stripe_type: str | None = None
    recurring: dict[str, Any] | None = None
    tax_behavior: str | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# PaymentIntent
# ---------------------------------------------------------------------------


class StripePaymentIntentCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    amount: int | None = None
    amount_received: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    customer_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    description: str | None = None
    invoice_stripe_id: str | None = Field(None, max_length=255)
    latest_charge: str | None = Field(None, max_length=255)
    payment_method: str | None = Field(None, max_length=255)
    receipt_email: str | None = Field(None, max_length=255)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripePaymentIntentUpdate(BaseModel):
    amount: int | None = None
    amount_received: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    customer_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    description: str | None = None
    invoice_stripe_id: str | None = Field(None, max_length=255)
    latest_charge: str | None = Field(None, max_length=255)
    payment_method: str | None = Field(None, max_length=255)
    receipt_email: str | None = Field(None, max_length=255)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripePaymentIntentResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    amount: int | None = None
    amount_received: int | None = None
    currency: str | None = None
    customer_stripe_id: str | None = None
    status: str | None = None
    description: str | None = None
    invoice_stripe_id: str | None = None
    latest_charge: str | None = None
    payment_method: str | None = None
    receipt_email: str | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# Refund
# ---------------------------------------------------------------------------


class StripeRefundCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    amount: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    charge_stripe_id: str | None = Field(None, max_length=255)
    payment_intent_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    reason: str | None = Field(None, max_length=64)
    failure_reason: str | None = Field(None, max_length=128)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeRefundUpdate(BaseModel):
    amount: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    charge_stripe_id: str | None = Field(None, max_length=255)
    payment_intent_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    reason: str | None = Field(None, max_length=64)
    failure_reason: str | None = Field(None, max_length=128)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeRefundResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    amount: int | None = None
    currency: str | None = None
    charge_stripe_id: str | None = None
    payment_intent_stripe_id: str | None = None
    status: str | None = None
    reason: str | None = None
    failure_reason: str | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# Dispute
# ---------------------------------------------------------------------------


class StripeDisputeCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    amount: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    charge_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    reason: str | None = Field(None, max_length=64)
    evidence_due_by: datetime | None = None
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeDisputeUpdate(BaseModel):
    amount: int | None = None
    currency: str | None = Field(None, min_length=3, max_length=3)
    charge_stripe_id: str | None = Field(None, max_length=255)
    status: str | None = Field(None, max_length=32)
    reason: str | None = Field(None, max_length=64)
    evidence_due_by: datetime | None = None
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeDisputeResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    amount: int | None = None
    currency: str | None = None
    charge_stripe_id: str | None = None
    status: str | None = None
    reason: str | None = None
    evidence_due_by: datetime | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# TaxRate
# ---------------------------------------------------------------------------


class StripeTaxRateCreate(BaseModel):
    organization_id: UUID
    stripe_id: str = Field(..., max_length=255)
    display_name: str | None = Field(None, max_length=255)
    description: str | None = None
    percentage: Decimal | None = None
    inclusive: bool | None = None
    active: bool | None = None
    jurisdiction: str | None = Field(None, max_length=128)
    tax_type: str | None = Field(None, max_length=64)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None


class StripeTaxRateUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=255)
    description: str | None = None
    percentage: Decimal | None = None
    inclusive: bool | None = None
    active: bool | None = None
    jurisdiction: str | None = Field(None, max_length=128)
    tax_type: str | None = Field(None, max_length=64)
    stripe_created: datetime | None = None
    stripe_metadata: dict[str, Any] | None = None
    raw_stripe_object: dict[str, Any] | None = None
    deleted_at: datetime | None = None


class StripeTaxRateResponse(_StripeMirrorCore, _StripeMirrorTimestamps):
    display_name: str | None = None
    description: str | None = None
    percentage: Decimal | None = None
    inclusive: bool | None = None
    active: bool | None = None
    jurisdiction: str | None = None
    tax_type: str | None = None
    stripe_created: datetime | None = None


# ---------------------------------------------------------------------------
# Sync stats (API responses)
# ---------------------------------------------------------------------------


class StripeSyncStatsResponse(BaseModel):
    """Counts returned after a pull sync operation."""

    fetched: int = 0
    upserted: int = 0
    skipped_no_org_metadata: int = 0

