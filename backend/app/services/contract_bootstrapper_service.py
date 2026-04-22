"""ContractBootstrapperService — auto-create Contract + POs from upstream billing rows.

**Scope:** The glue that turns a *billing-engine* event (Stripe subscription
created, HubSpot deal closed-won, …) into the IFRS 15 primitives the revrec
pipeline consumes — a ``Contract`` + one ``PerformanceObligation`` per billable
line / price / subscription-item.

This service is engine-agnostic at the ``Contract``/PO level: it takes a
``BillingSystem`` + primitive inputs and emits the same shape regardless of
source. Dedicated methods (``from_stripe_subscription``,
``from_hubspot_deal``, …) do the engine-specific decoding and call a single
private ``_upsert_contract_with_pos`` that owns the write path.

**Contract:**
    * Idempotent by ``(organization_id, billing_system, billing_contract_ref)``.
    * Writes without committing — the caller owns the transaction boundary.
    * Emits a one-PO-per-line layout by default (MVP). Bundle-aware SSP
      allocation is a follow-up — today we populate
      ``allocated_transaction_price = standalone_selling_price`` so simple
      subscriptions recognise correctly.

**Flow (Stripe subscription):**
    1. Load ``StripeSubscription`` by (org, sub_id).
    2. Load ``StripeSubscriptionItem`` rows for that subscription.
    3. For each item: resolve price + product, compute term length, build a
       ``PoSeed`` describing the PO.
    4. Upsert the ``Contract`` (keyed by ``billing_contract_ref``).
    5. Upsert one PO per item (keyed by ``billing_item_ref``).
    6. Sum ATPs onto ``Contract.total_transaction_price``.

**Architectural notes:** Consumes only the org-scoped Stripe mirror tables —
never the Stripe SDK — so it is safe to run on the webhook hot-path.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.contracts import (
    AllocationMethod,
    BillingSystem,
    Contract,
    ContractSource,
    ContractStatus,
    PerformanceObligation,
    PerformanceObligationKind,
)
from app.db.models.stripe_billing import (
    StripeCustomer,
    StripePrice,
    StripeProduct,
    StripeSubscription,
    StripeSubscriptionItem,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Seed DTOs — engine-agnostic payloads the private writer consumes.
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PoSeed:
    """Engine-agnostic seed describing one PerformanceObligation to upsert."""

    name: str
    kind: PerformanceObligationKind
    currency: str
    standalone_selling_price: Decimal
    allocated_transaction_price: Decimal

    billing_system: BillingSystem
    billing_item_ref: str | None = None
    billing_price_ref: str | None = None
    billing_product_ref: str | None = None
    billing_meter_ref: str | None = None

    service_start_date: date | None = None
    service_end_date: date | None = None
    total_units: Decimal | None = None
    unit_of_measure: str | None = None
    extra: dict | None = None


@dataclass
class ContractSeed:
    """Engine-agnostic seed describing one Contract to upsert."""

    organization_id: str
    name: str
    billing_system: BillingSystem
    billing_contract_ref: str

    source: ContractSource
    status: ContractStatus = ContractStatus.ACTIVE
    counterparty_id: str | None = None
    currency: str = "EUR"
    billing_account_ref: str | None = None
    billing_frequency: str | None = None
    service_start_date: date | None = None
    service_end_date: date | None = None
    effective_at: datetime | None = None
    terminated_at: datetime | None = None
    auto_renew: bool = False
    external_reference: str | None = None
    extra: dict | None = None
    performance_obligations: list[PoSeed] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class ContractBootstrapperService:
    """Turn upstream billing rows into Contracts + POs."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ------------------------------------------------------------------
    # Stripe
    # ------------------------------------------------------------------

    async def from_stripe_subscription(
        self, *, organization_id: str, stripe_subscription_id: str
    ) -> Contract | None:
        """Create or refresh a ``Contract`` from a Stripe Subscription.

        Returns the persisted/updated contract, or ``None`` when the
        subscription cannot be bootstrapped (not mirrored yet, no items,
        or canceled before we saw it).
        """
        sub = await self._db.scalar(
            select(StripeSubscription).where(
                StripeSubscription.organization_id == organization_id,
                StripeSubscription.stripe_id == stripe_subscription_id,
            )
        )
        if sub is None:
            logger.debug(
                "ContractBootstrapper: subscription not mirrored yet org=%s sub=%s",
                organization_id,
                stripe_subscription_id,
            )
            return None

        items = list(
            (
                await self._db.execute(
                    select(StripeSubscriptionItem).where(
                        StripeSubscriptionItem.organization_id == organization_id,
                        StripeSubscriptionItem.subscription_stripe_id
                        == sub.stripe_id,
                    )
                )
            ).scalars()
        )
        if not items:
            logger.debug(
                "ContractBootstrapper: subscription has no items yet org=%s sub=%s",
                organization_id,
                sub.stripe_id,
            )
            return None

        counterparty_id = await self._counterparty_from_stripe_customer(
            organization_id, sub.customer_stripe_id
        )

        seed = ContractSeed(
            organization_id=organization_id,
            name=_contract_name_from_sub(sub, items),
            billing_system=BillingSystem.STRIPE,
            billing_contract_ref=sub.stripe_id,
            source=ContractSource.STRIPE_SUBSCRIPTION,
            status=_contract_status_from_stripe(sub.status),
            counterparty_id=counterparty_id,
            currency=_currency_from_items(items) or "EUR",
            billing_account_ref=sub.customer_stripe_id,
            billing_frequency=_frequency_from_items(items),
            service_start_date=_to_date(sub.current_period_start),
            service_end_date=_to_date(sub.current_period_end),
            effective_at=sub.current_period_start or sub.stripe_created,
            terminated_at=sub.canceled_at,
            auto_renew=not bool(sub.cancel_at_period_end),
            external_reference=sub.stripe_id,
            extra={"stripe_status": sub.status},
            performance_obligations=await self._po_seeds_from_stripe_items(
                organization_id=organization_id,
                subscription=sub,
                items=items,
            ),
        )
        return await self._upsert_contract_with_pos(seed)

    # ------------------------------------------------------------------
    # Generic writer
    # ------------------------------------------------------------------

    async def upsert_from_seed(self, seed: ContractSeed) -> Contract:
        """Engine-agnostic entry point (used by HubSpot bridge + tests)."""
        return await self._upsert_contract_with_pos(seed)

    async def _upsert_contract_with_pos(self, seed: ContractSeed) -> Contract:
        contract = await self._load_contract(seed)
        is_new = contract is None
        if is_new:
            contract = Contract(
                id=str(uuid.uuid4()),
                organization_id=seed.organization_id,
                counterparty_id=seed.counterparty_id,
                name=seed.name,
                external_reference=seed.external_reference,
                source=seed.source,
                status=seed.status,
                billing_system=seed.billing_system,
                billing_contract_ref=seed.billing_contract_ref,
                billing_account_ref=seed.billing_account_ref,
                currency=seed.currency,
                service_start_date=seed.service_start_date,
                service_end_date=seed.service_end_date,
                effective_at=seed.effective_at,
                terminated_at=seed.terminated_at,
                billing_frequency=seed.billing_frequency,
                auto_renew=seed.auto_renew,
                extra=seed.extra,
            )
            self._db.add(contract)
        else:
            contract.name = seed.name
            contract.status = seed.status
            if seed.counterparty_id:
                contract.counterparty_id = seed.counterparty_id
            contract.billing_account_ref = (
                seed.billing_account_ref or contract.billing_account_ref
            )
            contract.currency = seed.currency or contract.currency
            contract.service_start_date = (
                seed.service_start_date or contract.service_start_date
            )
            contract.service_end_date = (
                seed.service_end_date or contract.service_end_date
            )
            contract.effective_at = seed.effective_at or contract.effective_at
            contract.terminated_at = seed.terminated_at
            contract.billing_frequency = (
                seed.billing_frequency or contract.billing_frequency
            )
            contract.auto_renew = seed.auto_renew
            if seed.extra:
                contract.extra = {**(contract.extra or {}), **seed.extra}

        # Flush to guarantee ``contract.id`` is populated before we attach
        # PO rows (even on brand-new contracts).
        await self._db.flush()

        total_atp = Decimal("0")
        for po_seed in seed.performance_obligations:
            atp = await self._upsert_performance_obligation(contract, po_seed)
            total_atp += atp

        contract.total_transaction_price = total_atp
        # Allocation variance is zero when every PO carries its own SSP
        # equal to its ATP (MVP). Bundle allocation will set this to
        # (Σ SSP − total_atp) in a follow-up.
        contract.allocation_variance = Decimal("0")
        return contract

    async def _upsert_performance_obligation(
        self, contract: Contract, po_seed: PoSeed
    ) -> Decimal:
        """Upsert one PO by ``(org, billing_system, billing_item_ref)`` and return its ATP."""
        existing: PerformanceObligation | None = None
        if po_seed.billing_item_ref:
            existing = await self._db.scalar(
                select(PerformanceObligation).where(
                    PerformanceObligation.organization_id == contract.organization_id,
                    PerformanceObligation.billing_system == po_seed.billing_system,
                    PerformanceObligation.billing_item_ref == po_seed.billing_item_ref,
                )
            )
        # Fallback: per-contract dedup by price ref (one-off / quote lines).
        if existing is None and po_seed.billing_price_ref:
            existing = await self._db.scalar(
                select(PerformanceObligation).where(
                    PerformanceObligation.organization_id == contract.organization_id,
                    PerformanceObligation.contract_id == contract.id,
                    PerformanceObligation.billing_system == po_seed.billing_system,
                    PerformanceObligation.billing_price_ref == po_seed.billing_price_ref,
                )
            )

        if existing is None:
            po = PerformanceObligation(
                id=str(uuid.uuid4()),
                organization_id=contract.organization_id,
                contract_id=contract.id,
                name=po_seed.name,
                kind=po_seed.kind,
                allocation_method=AllocationMethod.EQUAL_SPLIT,
                standalone_selling_price=po_seed.standalone_selling_price,
                allocated_transaction_price=po_seed.allocated_transaction_price,
                currency=po_seed.currency,
                service_start_date=po_seed.service_start_date,
                service_end_date=po_seed.service_end_date,
                total_units=po_seed.total_units,
                unit_of_measure=po_seed.unit_of_measure,
                billing_system=po_seed.billing_system,
                billing_item_ref=po_seed.billing_item_ref,
                billing_price_ref=po_seed.billing_price_ref,
                billing_product_ref=po_seed.billing_product_ref,
                billing_meter_ref=po_seed.billing_meter_ref,
                extra=po_seed.extra,
            )
            self._db.add(po)
        else:
            existing.name = po_seed.name
            existing.kind = po_seed.kind
            existing.standalone_selling_price = po_seed.standalone_selling_price
            existing.allocated_transaction_price = po_seed.allocated_transaction_price
            existing.currency = po_seed.currency
            existing.service_start_date = (
                po_seed.service_start_date or existing.service_start_date
            )
            existing.service_end_date = (
                po_seed.service_end_date or existing.service_end_date
            )
            existing.total_units = po_seed.total_units or existing.total_units
            existing.unit_of_measure = (
                po_seed.unit_of_measure or existing.unit_of_measure
            )
            existing.billing_price_ref = (
                po_seed.billing_price_ref or existing.billing_price_ref
            )
            existing.billing_product_ref = (
                po_seed.billing_product_ref or existing.billing_product_ref
            )
            existing.billing_meter_ref = (
                po_seed.billing_meter_ref or existing.billing_meter_ref
            )
            if po_seed.extra:
                existing.extra = {**(existing.extra or {}), **po_seed.extra}

        return po_seed.allocated_transaction_price

    async def _load_contract(self, seed: ContractSeed) -> Contract | None:
        return await self._db.scalar(
            select(Contract).where(
                Contract.organization_id == seed.organization_id,
                Contract.billing_system == seed.billing_system,
                Contract.billing_contract_ref == seed.billing_contract_ref,
            )
        )

    async def _counterparty_from_stripe_customer(
        self, organization_id: str, customer_stripe_id: str | None
    ) -> str | None:
        if not customer_stripe_id:
            return None
        return await self._db.scalar(
            select(StripeCustomer.counterparty_id).where(
                StripeCustomer.organization_id == organization_id,
                StripeCustomer.stripe_id == customer_stripe_id,
            )
        )

    async def _po_seeds_from_stripe_items(
        self,
        *,
        organization_id: str,
        subscription: StripeSubscription,
        items: list[StripeSubscriptionItem],
    ) -> list[PoSeed]:
        seeds: list[PoSeed] = []
        start = _to_date(subscription.current_period_start)
        end = _to_date(subscription.current_period_end)
        for item in items:
            price, product = await self._resolve_price_product(
                organization_id, item.price_stripe_id, item.product_stripe_id
            )
            kind = _po_kind_from_stripe_price(price)
            qty = Decimal(item.quantity) if item.quantity is not None else Decimal("1")
            unit_amount = (
                Decimal(price.unit_amount) / Decimal(100)
                if price and price.unit_amount is not None
                else Decimal("0")
            )
            ssp = (unit_amount * qty).quantize(Decimal("0.0001"))

            seeds.append(
                PoSeed(
                    name=_po_name_from_product(product, price, item.stripe_id),
                    kind=kind,
                    currency=(
                        (price.currency if price and price.currency else "EUR").upper()
                    )[:3],
                    standalone_selling_price=ssp,
                    allocated_transaction_price=ssp,
                    billing_system=BillingSystem.STRIPE,
                    billing_item_ref=item.stripe_id,
                    billing_price_ref=item.price_stripe_id,
                    billing_product_ref=item.product_stripe_id,
                    billing_meter_ref=_meter_ref_from_price(price),
                    service_start_date=start,
                    service_end_date=end,
                    total_units=qty if kind != PerformanceObligationKind.OVER_TIME_USAGE_BASED else None,
                    unit_of_measure=None,
                    extra={
                        "stripe_price_recurring": (price.recurring if price else None),
                    },
                )
            )
        return seeds

    async def _resolve_price_product(
        self, organization_id: str, price_id: str | None, product_id: str | None
    ) -> tuple[StripePrice | None, StripeProduct | None]:
        price: StripePrice | None = None
        product: StripeProduct | None = None
        if price_id:
            price = await self._db.scalar(
                select(StripePrice).where(
                    StripePrice.organization_id == organization_id,
                    StripePrice.stripe_id == price_id,
                )
            )
        resolved_product_id = product_id or (price.product_stripe_id if price else None)
        if resolved_product_id:
            product = await self._db.scalar(
                select(StripeProduct).where(
                    StripeProduct.organization_id == organization_id,
                    StripeProduct.stripe_id == resolved_product_id,
                )
            )
        return price, product


# ---------------------------------------------------------------------------
# Helpers (pure)
# ---------------------------------------------------------------------------


def _to_date(value: datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).date() if value.tzinfo else value.date()
    return value


def _contract_status_from_stripe(stripe_status: str | None) -> ContractStatus:
    match (stripe_status or "").lower():
        case "active" | "trialing":
            return ContractStatus.ACTIVE
        case "past_due" | "unpaid":
            return ContractStatus.ACTIVE
        case "paused":
            return ContractStatus.PAUSED
        case "canceled":
            return ContractStatus.CANCELED
        case "incomplete_expired":
            return ContractStatus.TERMINATED
        case "incomplete":
            return ContractStatus.DRAFT
        case _:
            return ContractStatus.DRAFT


def _contract_name_from_sub(
    sub: StripeSubscription, items: Iterable[StripeSubscriptionItem]
) -> str:
    first = next(iter(items), None)
    suffix = first.stripe_id if first else sub.stripe_id
    return f"Stripe subscription {sub.stripe_id}"[:255] or f"sub-{suffix}"


def _currency_from_items(items: Iterable[StripeSubscriptionItem]) -> str | None:
    # Subscription items don't carry currency directly — it lives on the
    # Price. The bootstrapper's PoSeed resolves it per-item; the contract
    # fallback is "EUR" when we have nothing better.
    return None


def _frequency_from_items(items: Iterable[StripeSubscriptionItem]) -> str | None:
    return None


def _po_kind_from_stripe_price(price: StripePrice | None) -> PerformanceObligationKind:
    """Map a Stripe Price → IFRS PO kind.

    * ``recurring.usage_type == "metered"`` → ``OVER_TIME_USAGE_BASED``.
    * Any recurring price (``recurring`` truthy) → ``OVER_TIME_STRAIGHT_LINE``.
    * ``stripe_type == "one_time"`` → ``POINT_IN_TIME``.
    """
    if price is None or not price.recurring:
        if price and (price.stripe_type or "").lower() == "one_time":
            return PerformanceObligationKind.POINT_IN_TIME
        return PerformanceObligationKind.POINT_IN_TIME
    recurring = price.recurring or {}
    usage_type = str(recurring.get("usage_type") or "").lower()
    if usage_type == "metered":
        return PerformanceObligationKind.OVER_TIME_USAGE_BASED
    return PerformanceObligationKind.OVER_TIME_STRAIGHT_LINE


def _po_name_from_product(
    product: StripeProduct | None, price: StripePrice | None, item_id: str
) -> str:
    if product and product.name:
        base = product.name
    elif price and price.stripe_id:
        base = f"Price {price.stripe_id}"
    else:
        base = f"Subscription item {item_id}"
    return base[:255]


def _meter_ref_from_price(price: StripePrice | None) -> str | None:
    if not price or not price.recurring:
        return None
    meter = (price.recurring or {}).get("meter")
    return str(meter) if meter else None
