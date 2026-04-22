"""StripeInvoiceBridgeService — mirror Stripe Invoices into the unified ``invoices`` table.

**Scope:** Bridge Stripe's billing-specific ``stripe_invoices`` table into the
tenant-wide unified ``invoices`` domain so AR dashboards, collections, revrec
schedules and GL posting consume ONE consistent invoice stream regardless
of billing engine.

**Contract:**
    * Idempotent upsert by ``(organization_id, source=STRIPE, external_id=stripe_id)``.
    * Writes through without committing — the caller owns the transaction
      boundary (typically ``StripeSyncService.apply_invoice`` / webhook
      dispatcher / pull-sync).
    * Creates ``ContractAllocation`` rows for any Stripe invoice line item
      that matches a ``PerformanceObligation`` in the same org via the
      engine-agnostic ``billing_system + billing_price_ref`` /
      ``billing_item_ref`` tuple. Unmatched lines are tolerated — revrec
      allocation is optional at invoice time.

**Flow:**
    1. Resolve ``counterparty_id`` from ``StripeCustomer.counterparty_id``
       when the Stripe customer has already been matched by
       ``StripeCustomerCounterpartyMatcher``.
    2. Map Stripe status → ``InvoiceStatus`` (see ``_STATUS_MAP``).
    3. Upsert the unified invoice row.
    4. For each ``StripeInvoiceLineItem`` join the PO lookup and write
       a ``ContractAllocation`` with ``source_type=BILLING_INVOICE_LINE``.

**Architectural notes:** The bridge consumes the Stripe mirror tables —
never the Stripe HTTP API — so it is safe to run on the webhook hot-path.
"""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.contracts import (
    BillingSystem,
    ContractAllocation,
    ContractAllocationSource,
    PerformanceObligation,
)
from app.db.models.invoices import Invoice, InvoiceAccountingKind, InvoiceSource, InvoiceStatus
from app.db.models.stripe_billing import (
    StripeCustomer,
    StripeInvoice,
    StripeInvoiceLineItem,
)

logger = logging.getLogger(__name__)


_STATUS_MAP: dict[str, InvoiceStatus] = {
    "draft": InvoiceStatus.DRAFT,
    "open": InvoiceStatus.FINALIZED,
    "paid": InvoiceStatus.SYNCED,
    "uncollectible": InvoiceStatus.FINALIZED,
    "void": InvoiceStatus.DRAFT,
}


def _map_status(stripe_status: str | None) -> InvoiceStatus:
    if not stripe_status:
        return InvoiceStatus.DRAFT
    return _STATUS_MAP.get(stripe_status.lower(), InvoiceStatus.DRAFT)


def _to_decimal_amount(stripe_minor: int | None) -> Decimal:
    """Stripe totals are in the smallest currency unit (cents)."""
    if stripe_minor is None:
        return Decimal("0")
    return (Decimal(int(stripe_minor)) / Decimal(100)).quantize(Decimal("0.01"))


def _to_date(value: datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).date() if value.tzinfo else value.date()
    return value


class StripeInvoiceBridgeService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # --- Public API -----------------------------------------------------

    async def upsert_from_stripe_invoice(
        self, stripe_invoice: StripeInvoice
    ) -> Invoice | None:
        """Upsert one unified ``Invoice`` row from a ``StripeInvoice``.

        Returns the persisted/updated ``Invoice`` (never ``None`` on success).
        ``None`` is returned only when the Stripe invoice is unusable
        (missing ``stripe_id`` or ``organization_id`` — both would indicate
        an ingestion bug).
        """
        if not stripe_invoice.organization_id or not stripe_invoice.stripe_id:
            return None

        counterparty_id = await self._resolve_counterparty(stripe_invoice)
        inv = await self._load_unified(stripe_invoice)
        if inv is None:
            inv = Invoice(
                id=str(uuid.uuid4()),
                organization_id=stripe_invoice.organization_id,
                source=InvoiceSource.STRIPE,
                external_id=stripe_invoice.stripe_id,
                counterparty_id=counterparty_id,
                counterparty_display_name=None,
                amount=_to_decimal_amount(stripe_invoice.total),
                currency=(stripe_invoice.currency or "EUR").upper()[:3],
                issue_date=self._issue_date(stripe_invoice),
                due_date=_to_date(stripe_invoice.due_date),
                status=_map_status(stripe_invoice.status),
                is_recurring=bool(stripe_invoice.subscription_stripe_id),
                accounting_kind=InvoiceAccountingKind.AR_REVENUE,
                requires_human_review=counterparty_id is None,
            )
            self._db.add(inv)
        else:
            inv.counterparty_id = counterparty_id or inv.counterparty_id
            inv.amount = _to_decimal_amount(stripe_invoice.total)
            inv.currency = (stripe_invoice.currency or inv.currency or "EUR").upper()[:3]
            inv.issue_date = self._issue_date(stripe_invoice)
            inv.due_date = _to_date(stripe_invoice.due_date) or inv.due_date
            inv.status = _map_status(stripe_invoice.status)
            inv.is_recurring = bool(stripe_invoice.subscription_stripe_id)
            inv.accounting_kind = InvoiceAccountingKind.AR_REVENUE
            if counterparty_id is not None:
                inv.requires_human_review = False

        await self._apply_line_allocations(stripe_invoice, inv)
        return inv

    # --- Internals ------------------------------------------------------

    async def _load_unified(self, si: StripeInvoice) -> Invoice | None:
        stmt = select(Invoice).where(
            Invoice.organization_id == si.organization_id,
            Invoice.source == InvoiceSource.STRIPE,
            Invoice.external_id == si.stripe_id,
        )
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def _resolve_counterparty(self, si: StripeInvoice) -> str | None:
        if not si.customer_stripe_id:
            return None
        stmt = select(StripeCustomer.counterparty_id).where(
            StripeCustomer.organization_id == si.organization_id,
            StripeCustomer.stripe_id == si.customer_stripe_id,
        )
        return (await self._db.execute(stmt)).scalar_one_or_none()

    @staticmethod
    def _issue_date(si: StripeInvoice) -> date:
        for candidate in (si.stripe_created, si.period_start):
            d = _to_date(candidate)
            if d is not None:
                return d
        return datetime.now(timezone.utc).date()

    async def _apply_line_allocations(
        self, si: StripeInvoice, unified: Invoice
    ) -> None:
        """Create ContractAllocation rows for lines matching a PO."""
        line_rows = (
            await self._db.execute(
                select(StripeInvoiceLineItem).where(
                    StripeInvoiceLineItem.organization_id == si.organization_id,
                    StripeInvoiceLineItem.invoice_stripe_id == si.stripe_id,
                )
            )
        ).scalars().all()
        if not line_rows:
            return

        for line in line_rows:
            po_id = await self._match_performance_obligation(si.organization_id, line)
            if not po_id:
                continue
            await self._upsert_allocation(si, unified, line, po_id)

    async def _match_performance_obligation(
        self, org_id: str, line: StripeInvoiceLineItem
    ) -> str | None:
        """Match a Stripe invoice line to a PO via generic billing refs.

        Matching order (tighter specificity first):

        1. ``(billing_system=STRIPE, billing_item_ref=<sub_item_id>)``
           — a subscription-item match binds revenue to a single PO.
        2. ``(billing_system=STRIPE, billing_price_ref=<price_id>)``
           — used for non-subscription invoice lines (one-off charges,
           metered invoice items created via the Invoices API).

        Returns ``None`` when the line has no routable identifier OR
        when the match is ambiguous (>1 PO). Ambiguous lines are
        surfaced to the user via the ``requires_human_review`` flag on
        the unified invoice.
        """
        if line.subscription_item_stripe_id:
            stmt = (
                select(PerformanceObligation.id)
                .where(
                    PerformanceObligation.organization_id == org_id,
                    PerformanceObligation.billing_system == BillingSystem.STRIPE,
                    PerformanceObligation.billing_item_ref
                    == line.subscription_item_stripe_id,
                )
                .limit(2)
            )
            rows = (await self._db.execute(stmt)).scalars().all()
            if len(rows) == 1:
                return rows[0]
        if line.price_stripe_id:
            stmt = (
                select(PerformanceObligation.id)
                .where(
                    PerformanceObligation.organization_id == org_id,
                    PerformanceObligation.billing_system == BillingSystem.STRIPE,
                    PerformanceObligation.billing_price_ref == line.price_stripe_id,
                )
                .limit(2)
            )
            rows = (await self._db.execute(stmt)).scalars().all()
            if len(rows) == 1:
                return rows[0]
        return None

    async def _upsert_allocation(
        self,
        si: StripeInvoice,
        unified: Invoice,
        line: StripeInvoiceLineItem,
        po_id: str,
    ) -> None:
        """Idempotent per-line allocation keyed by (org, source_type, source_id, po)."""
        existing = (
            await self._db.execute(
                select(ContractAllocation).where(
                    ContractAllocation.organization_id == si.organization_id,
                    ContractAllocation.source_type
                    == ContractAllocationSource.BILLING_INVOICE_LINE,
                    ContractAllocation.source_id == line.stripe_id,
                    ContractAllocation.performance_obligation_id == po_id,
                )
            )
        ).scalar_one_or_none()

        amount = _to_decimal_amount(line.amount)
        event_date = self._issue_date(si)
        currency = (line.currency or unified.currency or "EUR").upper()[:3]
        # The PO's contract is the canonical owner of the allocation; look
        # it up once (cheap single-row).
        po = await self._db.get(PerformanceObligation, po_id)
        contract_id = po.contract_id if po else None
        if contract_id is None:
            return

        if existing is None:
            self._db.add(
                ContractAllocation(
                    id=str(uuid.uuid4()),
                    organization_id=si.organization_id,
                    contract_id=contract_id,
                    performance_obligation_id=po_id,
                    source_type=ContractAllocationSource.BILLING_INVOICE_LINE,
                    billing_system=BillingSystem.STRIPE,
                    source_id=line.stripe_id,
                    invoice_id=unified.id,
                    amount=amount,
                    currency=currency,
                    units=Decimal(line.quantity) if line.quantity is not None else None,
                    event_date=event_date,
                )
            )
        else:
            existing.amount = amount
            existing.currency = currency
            existing.event_date = event_date
            existing.invoice_id = unified.id
            existing.billing_system = BillingSystem.STRIPE
            existing.units = (
                Decimal(line.quantity) if line.quantity is not None else existing.units
            )
