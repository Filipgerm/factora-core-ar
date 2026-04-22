"""CustomerBootstrapperService — auto-create ``Counterparty`` rows from upstream CRMs/billers.

**Scope**
    When a Stripe customer or HubSpot company arrives and the
    corresponding ``Counterparty`` matcher returns ``None`` (no exact
    VAT / email / domain / name hit), this service decides whether to
    auto-create a new :class:`Counterparty` row and link the source
    record back to it. The goal is that every first-touch customer in
    Stripe or HubSpot becomes queryable by the revrec pipeline
    immediately, even when the sales/CS team has not yet entered the
    entity into the unified customer list.

**Contract**
    * Accepts ORM rows (``StripeCustomer`` / ``HubspotCompany``) —
      never re-fetches from external APIs; the calling sync service
      owns that.
    * Mutates the source row's ``counterparty_id`` FK in place. Does
      **not** commit the session — the caller controls the boundary
      (webhook handler / backfill task).
    * Returns the resolved / created ``Counterparty`` id, or ``None``
      when the source record had too little identity to bootstrap
      safely (e.g. Stripe customer with neither email, name, nor VAT
      populated yet — a common transient state between
      ``customer.created`` and the next ``customer.updated``).

**Decision matrix (ordered):**
    1. Delegate to the relevant matcher. If it finds an existing
       ``Counterparty``, return that id.
    2. If the source record has sufficient identity (see
       :meth:`_has_sufficient_identity`), create a new
       ``Counterparty`` scoped to the source row's ``organization_id``
       with ``type=CUSTOMER`` (Stripe + HubSpot are AR-side only for
       revrec). Copy name/vat/email/country/address fields.
    3. Otherwise return ``None`` — we'd rather leave a gap and let a
       subsequent ``customer.updated`` event (or the HubSpot polling
       backfill) retry than create a junk record with only
       ``id=cus_XYZ`` and no human-readable name.

**Architectural notes**
    * Lives next to :class:`ContractBootstrapperService` and follows
      the same ``from_<upstream>`` dispatch naming so the two services
      read consistently.
    * Multi-tenant invariant: every query and every insert is scoped
      to the source row's ``organization_id`` — never trusts input.
    * Never imports from ``api/`` / ``controllers/``.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.counterparty import Counterparty, CounterpartyType
from app.db.models.hubspot import HubspotCompany
from app.db.models.stripe_billing import StripeCustomer
from app.services.hubspot_company_matcher import (
    HubspotCompanyCounterpartyMatcher,
)
from app.services.stripe_customer_matcher import (
    StripeCustomerCounterpartyMatcher,
)

logger = logging.getLogger(__name__)


class CustomerBootstrapperService:
    """Resolve-or-create a ``Counterparty`` from Stripe / HubSpot source rows."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    # ------------------------------------------------------------------
    # Stripe
    # ------------------------------------------------------------------

    async def from_stripe_customer(
        self, customer: StripeCustomer
    ) -> str | None:
        """Resolve or create a ``Counterparty`` for a Stripe customer."""
        if not customer.organization_id:
            return None
        if customer.counterparty_id:
            return customer.counterparty_id

        matcher = StripeCustomerCounterpartyMatcher(self._db)
        matched = await matcher.match_and_link(customer)
        if matched:
            return matched

        if not self._stripe_has_sufficient_identity(customer):
            logger.info(
                "stripe_customer=%s org=%s insufficient identity — defer bootstrap",
                customer.stripe_id,
                customer.organization_id,
            )
            return None

        vat = StripeCustomerCounterpartyMatcher._extract_vat(customer)
        address = self._stripe_address(customer)
        cp = Counterparty(
            organization_id=customer.organization_id,
            name=(customer.name or "").strip()
            or (customer.email or customer.stripe_id or "Unknown").strip(),
            vat_number=vat,
            country=address.get("country"),
            address_street=address.get("line1"),
            address_city=address.get("city"),
            address_postal_code=address.get("postal_code"),
            address_region=address.get("state"),
            type=CounterpartyType.CUSTOMER,
            contact_info=self._contact_info_from_stripe(customer),
            registry_data={
                "source": "stripe",
                "stripe_customer_id": customer.stripe_id,
            },
        )
        self._db.add(cp)
        await self._db.flush()
        customer.counterparty_id = cp.id
        logger.info(
            "Bootstrapped Counterparty=%s from stripe_customer=%s org=%s",
            cp.id,
            customer.stripe_id,
            customer.organization_id,
        )
        return cp.id

    # ------------------------------------------------------------------
    # HubSpot
    # ------------------------------------------------------------------

    async def from_hubspot_company(
        self, company: HubspotCompany
    ) -> str | None:
        """Resolve or create a ``Counterparty`` for a HubSpot company."""
        if not company.organization_id:
            return None
        if company.counterparty_id:
            return company.counterparty_id

        matcher = HubspotCompanyCounterpartyMatcher(self._db)
        matched = await matcher.match_and_link(company)
        if matched:
            return matched

        if not self._hubspot_has_sufficient_identity(company):
            logger.info(
                "hubspot_company=%s org=%s insufficient identity — defer bootstrap",
                company.hubspot_id,
                company.organization_id,
            )
            return None

        cp = Counterparty(
            organization_id=company.organization_id,
            name=(company.name or "").strip()
            or (company.domain or company.hubspot_id or "Unknown").strip(),
            vat_number=HubspotCompanyCounterpartyMatcher._extract_vat(company),
            country=self._clean_country(company.country),
            type=CounterpartyType.CUSTOMER,
            contact_info=self._contact_info_from_hubspot(company),
            registry_data={
                "source": "hubspot",
                "hubspot_company_id": company.hubspot_id,
                "hub_id": company.hub_id,
            },
        )
        self._db.add(cp)
        await self._db.flush()
        company.counterparty_id = cp.id
        logger.info(
            "Bootstrapped Counterparty=%s from hubspot_company=%s org=%s",
            cp.id,
            company.hubspot_id,
            company.organization_id,
        )
        return cp.id

    # ------------------------------------------------------------------
    # Identity sufficiency checks
    # ------------------------------------------------------------------

    @staticmethod
    def _stripe_has_sufficient_identity(customer: StripeCustomer) -> bool:
        """Need at least a human-readable handle before we create a row.

        A ``cus_*`` id alone is not useful to accountants. We require
        one of: ``name`` OR ``email`` OR a VAT number — any of which is
        enough for a human to recognise the counterparty later.
        """
        if customer.name and customer.name.strip():
            return True
        if customer.email and customer.email.strip():
            return True
        if StripeCustomerCounterpartyMatcher._extract_vat(customer):
            return True
        return False

    @staticmethod
    def _hubspot_has_sufficient_identity(company: HubspotCompany) -> bool:
        if company.name and company.name.strip():
            return True
        if company.domain and company.domain.strip():
            return True
        if HubspotCompanyCounterpartyMatcher._extract_vat(company):
            return True
        return False

    # ------------------------------------------------------------------
    # Payload shapers
    # ------------------------------------------------------------------

    @staticmethod
    def _stripe_address(customer: StripeCustomer) -> dict[str, str | None]:
        address = customer.address if isinstance(customer.address, dict) else {}
        return {
            "line1": CustomerBootstrapperService._clean_str(address.get("line1")),
            "city": CustomerBootstrapperService._clean_str(address.get("city")),
            "postal_code": CustomerBootstrapperService._clean_str(
                address.get("postal_code")
            ),
            "state": CustomerBootstrapperService._clean_str(address.get("state")),
            "country": CustomerBootstrapperService._clean_country(
                address.get("country")
            ),
        }

    @staticmethod
    def _contact_info_from_stripe(customer: StripeCustomer) -> dict[str, Any]:
        info: dict[str, Any] = {}
        if customer.email:
            info["email"] = customer.email.strip().lower()
            host = customer.email.split("@", 1)[-1].strip().lower()
            if host and "." in host:
                info["domain"] = host
        if customer.phone:
            info["phone"] = customer.phone.strip()
        return info

    @staticmethod
    def _contact_info_from_hubspot(company: HubspotCompany) -> dict[str, Any]:
        info: dict[str, Any] = {}
        if company.domain:
            info["domain"] = company.domain.strip().lower().lstrip("@")
        return info

    @staticmethod
    def _clean_str(value: Any) -> str | None:
        if not isinstance(value, str):
            return None
        trimmed = value.strip()
        return trimmed or None

    @staticmethod
    def _clean_country(value: Any) -> str | None:
        """Normalise to ISO 3166-1 alpha-2 when possible.

        Stripe already returns alpha-2; HubSpot returns either alpha-2
        or the full country name depending on portal configuration.
        When we get a full name we just return ``None`` — we'd rather
        leave the column empty than guess "GR" vs "GL" from "Greece".
        The GEMI enrichment agent fills in the correct value later.
        """
        if not isinstance(value, str):
            return None
        trimmed = value.strip().upper()
        if len(trimmed) == 2 and trimmed.isalpha():
            return trimmed
        return None
