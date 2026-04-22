"""HubspotContractBridgeService — HubSpot Deal → canonical ``Contract``.

**Scope:** Take a mirrored HubSpot Deal row, gather its associated
line items + company, and hand the composite to
:class:`app.services.contract_bootstrapper_service.ContractBootstrapperService`
as an engine-agnostic :class:`ContractSeed`. That service owns the
actual Contract + PO upsert. This bridge is the pure translator.

**Contract:**
    * Idempotent by ``(organization_id, billing_system=HUBSPOT,
      billing_contract_ref=<hubspot deal id>)``.
    * Only promotes closed-won deals to ``ACTIVE`` contracts. Other
      deal stages produce ``DRAFT`` contracts — the revrec pipeline
      skips DRAFT, but the rows exist so agents can reason over the
      pipeline.
    * Never commits — the caller owns the transaction boundary.

**Flow:**
    1. Load the ``HubspotDeal`` row (already mirrored by the sync).
    2. Load its associated :class:`HubspotLineItem` rows via the
       denormalised ``deal_hubspot_id`` FK (no extra HTTP call).
    3. Resolve the counterparty via the deal's primary company.
    4. Build one :class:`PoSeed` per line item (term, cadence, price).
    5. Call :meth:`ContractBootstrapperService.upsert_from_seed`.
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.contracts import (
    BillingSystem,
    Contract,
    ContractSource,
    ContractStatus,
    PerformanceObligationKind,
)
from app.db.models.hubspot import (
    HubspotCompany,
    HubspotDeal,
    HubspotLineItem,
)
from app.services.contract_bootstrapper_service import (
    ContractBootstrapperService,
    ContractSeed,
    PoSeed,
)

logger = logging.getLogger(__name__)


class HubspotContractBridgeService:
    """Translate a HubSpot deal into our canonical Contract + POs."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._bootstrapper = ContractBootstrapperService(db)

    async def upsert_from_deal_id(
        self, *, organization_id: str, hubspot_deal_id: str
    ) -> Contract | None:
        """Load the deal + lines + company → produce/refresh a Contract."""
        deal = await self._db.scalar(
            select(HubspotDeal).where(
                HubspotDeal.organization_id == organization_id,
                HubspotDeal.hubspot_id == hubspot_deal_id,
            )
        )
        if deal is None:
            logger.debug(
                "HubspotContractBridge: deal not mirrored yet org=%s deal=%s",
                organization_id,
                hubspot_deal_id,
            )
            return None

        lines = list(
            (
                await self._db.execute(
                    select(HubspotLineItem).where(
                        HubspotLineItem.organization_id == organization_id,
                        HubspotLineItem.deal_hubspot_id == deal.hubspot_id,
                    )
                )
            ).scalars()
        )
        if not lines:
            logger.debug(
                "HubspotContractBridge: deal has no lines yet org=%s deal=%s",
                organization_id,
                deal.hubspot_id,
            )
            return None

        counterparty_id = await self._counterparty_from_company(
            organization_id, deal.primary_company_hubspot_id
        )

        seed = ContractSeed(
            organization_id=organization_id,
            name=(deal.name or f"HubSpot deal {deal.hubspot_id}")[:255],
            billing_system=BillingSystem.HUBSPOT,
            billing_contract_ref=deal.hubspot_id,
            source=ContractSource.HUBSPOT_DEAL,
            status=_contract_status_from_deal(deal),
            counterparty_id=counterparty_id,
            currency=_first_non_null(
                deal.currency,
                *(l.currency for l in lines),
                default="EUR",
            ),
            billing_account_ref=deal.primary_company_hubspot_id,
            billing_frequency=_frequency_from_lines(lines),
            service_start_date=_service_start(lines),
            service_end_date=_service_end(lines),
            effective_at=deal.close_date or deal.hubspot_created_at,
            terminated_at=None,
            auto_renew=False,
            external_reference=deal.hubspot_id,
            extra={
                "hubspot_pipeline": deal.pipeline,
                "hubspot_stage": deal.stage,
                "hubspot_mrr": str(deal.mrr) if deal.mrr is not None else None,
                "hubspot_arr": str(deal.arr) if deal.arr is not None else None,
                "hubspot_tcv": str(deal.tcv) if deal.tcv is not None else None,
            },
            performance_obligations=[_po_seed_from_line(l) for l in lines],
        )
        return await self._bootstrapper.upsert_from_seed(seed)

    async def _counterparty_from_company(
        self, organization_id: str, hubspot_company_id: str | None
    ) -> str | None:
        if not hubspot_company_id:
            return None
        return await self._db.scalar(
            select(HubspotCompany.counterparty_id).where(
                HubspotCompany.organization_id == organization_id,
                HubspotCompany.hubspot_id == hubspot_company_id,
            )
        )


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


def _contract_status_from_deal(deal: HubspotDeal) -> ContractStatus:
    """Only closed-won deals graduate to ACTIVE — everything else is DRAFT.

    This keeps pipeline forecasts visible to agents without polluting
    revrec schedules (the RevRec service skips non-ACTIVE contracts).
    """
    if deal.is_closed_won:
        return ContractStatus.ACTIVE
    if deal.is_closed and not deal.is_closed_won:
        return ContractStatus.TERMINATED
    return ContractStatus.DRAFT


def _first_non_null(*values: str | None, default: str) -> str:
    for v in values:
        if v:
            return v
    return default


def _service_start(lines: Iterable[HubspotLineItem]) -> date | None:
    starts = [
        _to_date(l.recurring_billing_start_date)
        for l in lines
        if l.recurring_billing_start_date
    ]
    return min(starts) if starts else None


def _service_end(lines: Iterable[HubspotLineItem]) -> date | None:
    ends = [
        _to_date(l.recurring_billing_end_date)
        for l in lines
        if l.recurring_billing_end_date
    ]
    return max(ends) if ends else None


def _frequency_from_lines(lines: Iterable[HubspotLineItem]) -> str | None:
    for l in lines:
        if l.recurring_billing_period:
            return l.recurring_billing_period
        if l.recurring_billing_frequency:
            return l.recurring_billing_frequency
    return None


def _to_date(value: datetime | None) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).date() if value.tzinfo else value.date()
    return value


def _po_kind_from_line(line: HubspotLineItem) -> PerformanceObligationKind:
    """Map a HubSpot line item → IFRS PO kind.

    * Any line with a recurring cadence → ``OVER_TIME_STRAIGHT_LINE``.
    * Lines without recurring metadata → ``POINT_IN_TIME`` (one-off).
    * Usage-based detection is limited on HubSpot: we mark as
      ``OVER_TIME_USAGE_BASED`` only when the product's SKU or
      ``hs_billing_period`` contains "usage"/"metered" (very few
      portals model metered that way; most rely on external meters).
    """
    billing_period = (line.billing_period or "").lower()
    recurring_period = (line.recurring_billing_period or "").lower()
    freq = (line.recurring_billing_frequency or "").lower()
    sku = (line.sku or "").lower()
    if any("usage" in s or "meter" in s for s in (billing_period, sku)):
        return PerformanceObligationKind.OVER_TIME_USAGE_BASED
    if recurring_period or freq or line.term_months:
        return PerformanceObligationKind.OVER_TIME_STRAIGHT_LINE
    return PerformanceObligationKind.POINT_IN_TIME


def _po_seed_from_line(line: HubspotLineItem) -> PoSeed:
    qty = line.quantity if line.quantity is not None else Decimal("1")
    price = line.price if line.price is not None else Decimal("0")
    amount = line.amount if line.amount is not None else (price * qty)
    ssp = _dec(amount)
    return PoSeed(
        name=(line.name or f"HubSpot line {line.hubspot_id}")[:255],
        kind=_po_kind_from_line(line),
        currency=(line.currency or "EUR")[:3].upper(),
        standalone_selling_price=ssp,
        allocated_transaction_price=ssp,
        billing_system=BillingSystem.HUBSPOT,
        billing_item_ref=line.hubspot_id,
        billing_price_ref=None,
        billing_product_ref=line.product_hubspot_id,
        billing_meter_ref=None,
        service_start_date=_to_date(line.recurring_billing_start_date),
        service_end_date=_to_date(line.recurring_billing_end_date),
        total_units=qty if line.term_months else None,
        unit_of_measure=None,
        extra={
            "hubspot_term_months": line.term_months,
            "hubspot_sku": line.sku,
        },
    )


def _dec(value: object) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


# Unused but makes the ``asdict(ContractSeed(...))`` path importable
# from tests without pulling in extra deps:
__all__ = [
    "HubspotContractBridgeService",
]
_ = asdict
