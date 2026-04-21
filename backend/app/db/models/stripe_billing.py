"""Stripe billing and treasury ORM models (multi-tenant).

All rows are scoped by ``organization_id``. Amounts follow Stripe conventions:
integer values in the smallest currency unit (e.g. cents). ``raw_stripe_object``
stores the last synced Stripe object for audit and forward-compatible fields.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models._utils import utcnow


class _StripeOrgScoped(Base):
    """Shared columns for Stripe mirror tables."""

    __abstract__ = True

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stripe_id: Mapped[str] = mapped_column(String(255), nullable=False)
    stripe_metadata: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    raw_stripe_object: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=func.now()
    )


class StripeBalanceTransaction(_StripeOrgScoped):
    """Stripe BalanceTransaction — ledger movements (GL reconciliation source)."""

    __tablename__ = "stripe_balance_transactions"

    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fee: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    net: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    reporting_category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    available_on: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    exchange_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_bt_org_stripe_id"),
        Index("ix_stripe_bt_org_created", "organization_id", "stripe_created"),
    )


class StripePayout(_StripeOrgScoped):
    """Stripe Payout — bank transfers for treasury reconciliation."""

    __tablename__ = "stripe_payouts"

    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    arrival_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    automatic: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    balance_transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    destination: Mapped[str | None] = mapped_column(String(255), nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String(128), nullable=True)
    failure_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    stripe_type: Mapped[str | None] = mapped_column("payout_type", String(32), nullable=True)
    statement_descriptor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_payout_org_stripe_id"),
        Index("ix_stripe_payout_org_status", "organization_id", "status"),
    )


class StripeBalanceSnapshot(Base):
    """Point-in-time Stripe Balance for an organization (treasury)."""

    __tablename__ = "stripe_balance_snapshots"

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    available: Mapped[list | dict] = mapped_column(JSONB, nullable=False, default=list)
    pending: Mapped[list | dict] = mapped_column(JSONB, nullable=False, default=list)
    connect_reserved: Mapped[list | dict | None] = mapped_column(JSONB, nullable=True)
    instant_available: Mapped[list | dict | None] = mapped_column(JSONB, nullable=True)
    livemode: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    raw_stripe_object: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    retrieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    __table_args__ = (Index("ix_stripe_balance_snap_org_retrieved", "organization_id", "retrieved_at"),)


class StripeCustomer(_StripeOrgScoped):
    """Stripe Customer — AR/billing counterpart."""

    __tablename__ = "stripe_customers"

    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    balance: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    delinquent: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    invoice_prefix: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tax_exempt: Mapped[str | None] = mapped_column(String(32), nullable=True)
    default_source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_cus_org_stripe_id"),
        Index("ix_stripe_cus_org_email", "organization_id", "email"),
    )


class StripeSubscription(_StripeOrgScoped):
    """Stripe Subscription."""

    __tablename__ = "stripe_subscriptions"

    customer_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    collection_method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    default_payment_method: Mapped[str | None] = mapped_column(String(255), nullable=True)
    items_data: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_sub_org_stripe_id"),
        Index("ix_stripe_sub_org_customer", "organization_id", "customer_stripe_id"),
    )


class StripeInvoice(_StripeOrgScoped):
    """Stripe Invoice — accrual / revenue recognition."""

    __tablename__ = "stripe_invoices"

    customer_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    subscription_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    amount_due: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount_paid: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount_remaining: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subtotal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tax: Mapped[int | None] = mapped_column(Integer, nullable=True)
    billing_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    collection_method: Mapped[str | None] = mapped_column(String(32), nullable=True)
    hosted_invoice_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    invoice_pdf: Mapped[str | None] = mapped_column(Text, nullable=True)
    number: Mapped[str | None] = mapped_column(String(128), nullable=True)
    paid: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_inv_org_stripe_id"),
        Index("ix_stripe_inv_org_status", "organization_id", "status"),
    )


class StripeInvoiceLineItem(_StripeOrgScoped):
    """Line item on a Stripe Invoice."""

    __tablename__ = "stripe_invoice_line_items"

    invoice_stripe_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    product_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    discountable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    stripe_type: Mapped[str | None] = mapped_column("line_type", String(32), nullable=True)
    period: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "stripe_id",
            name="uq_stripe_inv_line_org_stripe_id",
        ),
        Index("ix_stripe_inv_line_org_invoice", "organization_id", "invoice_stripe_id"),
    )


class StripeCreditNote(_StripeOrgScoped):
    """Stripe CreditNote — adjustments to invoices."""

    __tablename__ = "stripe_credit_notes"

    invoice_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    customer_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    subtotal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_cn_org_stripe_id"),
    )


class StripeProduct(_StripeOrgScoped):
    """Stripe Product — catalog."""

    __tablename__ = "stripe_products"

    name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_price_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    images: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_prod_org_stripe_id"),
        Index("ix_stripe_prod_org_active", "organization_id", "active"),
    )


class StripePrice(_StripeOrgScoped):
    """Stripe Price — catalog pricing."""

    __tablename__ = "stripe_prices"

    product_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    unit_amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    billing_scheme: Mapped[str | None] = mapped_column(String(32), nullable=True)
    stripe_type: Mapped[str | None] = mapped_column("price_type", String(32), nullable=True)
    recurring: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tax_behavior: Mapped[str | None] = mapped_column(String(32), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_price_org_stripe_id"),
        Index("ix_stripe_price_org_product", "organization_id", "product_stripe_id"),
    )


class StripePaymentIntent(_StripeOrgScoped):
    """Stripe PaymentIntent — payment lifecycle."""

    __tablename__ = "stripe_payment_intents"

    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount_received: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    customer_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    invoice_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    latest_charge: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_method: Mapped[str | None] = mapped_column(String(255), nullable=True)
    receipt_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_pi_org_stripe_id"),
        Index("ix_stripe_pi_org_status", "organization_id", "status"),
    )


class StripeRefund(_StripeOrgScoped):
    """Stripe Refund."""

    __tablename__ = "stripe_refunds"

    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    charge_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    payment_intent_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(128), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_refund_org_stripe_id"),
    )


class StripeDispute(_StripeOrgScoped):
    """Stripe Dispute (chargeback)."""

    __tablename__ = "stripe_disputes"

    amount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    charge_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    evidence_due_by: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_dispute_org_stripe_id"),
        Index("ix_stripe_dispute_org_status", "organization_id", "status"),
    )


class StripeSubscriptionItem(_StripeOrgScoped):
    """Stripe SubscriptionItem — one per Price inside a Subscription.

    Each row is the atomic unit of revenue a subscription emits; for IFRS 15
    mapping, a ``PerformanceObligation`` typically points at one of these via
    ``performance_obligations.stripe_subscription_item_id``.
    """

    __tablename__ = "stripe_subscription_items"

    subscription_stripe_id: Mapped[str] = mapped_column(
        String(255), nullable=False, index=True
    )
    price_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    product_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    billing_thresholds: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tax_rates: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "stripe_id", name="uq_stripe_sub_item_org_stripe_id"
        ),
        Index(
            "ix_stripe_sub_item_org_sub",
            "organization_id",
            "subscription_stripe_id",
        ),
        Index(
            "ix_stripe_sub_item_org_price",
            "organization_id",
            "price_stripe_id",
        ),
    )


class StripeSubscriptionSchedule(_StripeOrgScoped):
    """Stripe SubscriptionSchedule — multi-phase contracts with planned transitions.

    Crucial for IFRS 15 modification accounting: the ``phases`` JSONB preserves
    the full timeline so we can compute prospective vs cumulative-catch-up
    without re-fetching from Stripe.
    """

    __tablename__ = "stripe_subscription_schedules"

    customer_stripe_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    subscription_stripe_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    current_phase: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    phases: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    end_behavior: Mapped[str | None] = mapped_column(String(32), nullable=True)
    canceled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    released_subscription_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    stripe_created: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "stripe_id", name="uq_stripe_sub_sched_org_stripe_id"
        ),
        Index(
            "ix_stripe_sub_sched_org_status", "organization_id", "status"
        ),
    )


class StripeMeter(_StripeOrgScoped):
    """Stripe Billing Meter — definition of a usage event (e.g. ``api_requests``)."""

    __tablename__ = "stripe_meters"

    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_name: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    event_time_window: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    customer_mapping: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    default_aggregation: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    value_settings: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    status_transitions: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    livemode: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "stripe_id", name="uq_stripe_meter_org_stripe_id"
        ),
        Index("ix_stripe_meter_org_status", "organization_id", "status"),
    )


class StripeMeterEventSummary(Base):
    """Aggregated usage per (meter, customer, window) — drives usage-based revrec."""

    __tablename__ = "stripe_meter_event_summaries"

    id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    organization_id: Mapped[str] = mapped_column(
        PGUUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    meter_stripe_id: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_stripe_id: Mapped[str] = mapped_column(String(255), nullable=False)
    aggregated_value: Mapped[float | None] = mapped_column(Numeric(20, 6), nullable=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    livemode: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    raw_stripe_object: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "meter_stripe_id",
            "customer_stripe_id",
            "start_time",
            name="uq_stripe_meter_summary_org_meter_cust_start",
        ),
        Index(
            "ix_stripe_meter_summary_org_meter",
            "organization_id",
            "meter_stripe_id",
        ),
        Index(
            "ix_stripe_meter_summary_org_customer",
            "organization_id",
            "customer_stripe_id",
        ),
    )


class StripeTaxTransaction(_StripeOrgScoped):
    """Stripe Tax API — Tax.Transaction (calculated/committed tax per invoice)."""

    __tablename__ = "stripe_tax_transactions"

    transaction_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)
    customer_stripe_id: Mapped[str | None] = mapped_column(
        String(255), nullable=True, index=True
    )
    customer_details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ship_from_details: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tax_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    line_items: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    shipping_cost: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reversal: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    livemode: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "stripe_id", name="uq_stripe_tax_tx_org_stripe_id"
        ),
        Index(
            "ix_stripe_tax_tx_org_reference",
            "organization_id",
            "reference",
        ),
    )


class StripeRevrecReport(_StripeOrgScoped):
    """Stripe Revenue Recognition — exported report snapshot.

    Stripe's native revrec engine produces periodic reports (deferred balance,
    recognized revenue) as finance-grade numbers. We mirror those so our own
    scheduler can reconcile its output vs Stripe's — closing the loop on the
    "one number" problem for AR/AP teams.
    """

    __tablename__ = "stripe_revrec_reports"

    report_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    interval_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    interval_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    result_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    parameters: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    succeeded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        UniqueConstraint(
            "organization_id", "stripe_id", name="uq_stripe_revrec_report_org_stripe_id"
        ),
        Index(
            "ix_stripe_revrec_report_org_interval",
            "organization_id",
            "interval_end",
        ),
    )


class StripeTaxRate(_StripeOrgScoped):
    """Stripe TaxRate."""

    __tablename__ = "stripe_tax_rates"

    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    percentage: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    inclusive: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(128), nullable=True)
    tax_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    stripe_created: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("organization_id", "stripe_id", name="uq_stripe_tr_org_stripe_id"),
        Index("ix_stripe_tr_org_active", "organization_id", "active"),
    )
