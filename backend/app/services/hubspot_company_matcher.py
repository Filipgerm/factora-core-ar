"""HubspotCompanyCounterpartyMatcher — link HubSpot companies to unified counterparties.

**Scope:** Given an upserted ``HubspotCompany`` row, resolve its matching
:class:`app.db.models.counterparty.Counterparty` within the same organization
and persist the FK back on the HubSpot row. Low-confidence matches are left
null for human review.

**Contract:** Pure resolver; mutates the ``HubspotCompany.counterparty_id``
on the current :class:`AsyncSession` when a match is found. Never raises on
no-match; never crosses organisations.

**Matching strategy (ordered, short-circuit; exact matches only):**
    1. VAT number (``HubspotCompany.vat_id`` or ``properties['vat_id']``) —
       compared case-insensitively against ``Counterparty.vat_number``.
    2. Domain (``HubspotCompany.domain``) — matched against the host
       portion of ``Counterparty.contact_info['email']`` OR against a
       ``Counterparty.contact_info['domain']`` key when callers maintain
       one. Both forms are checked so legacy records still match.
    3. Normalised company name (trimmed, lowercased).

Fuzzy matching is intentionally out of scope — the ingestion agent is the
right place to adjudicate ambiguous matches with LLM help and surface them
to the Active-Learning queue.

**Architectural notes:** Mirrors :class:`StripeCustomerCounterpartyMatcher`
so the two integrations share a mental model and a testing pattern. The
matcher does not commit — the caller (``HubspotSyncService`` /
``CustomerBootstrapperService``) controls the transaction boundary.
"""
from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.counterparty import Counterparty
from app.db.models.hubspot import HubspotCompany

logger = logging.getLogger(__name__)


class HubspotCompanyCounterpartyMatcher:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def match_and_link(self, company: HubspotCompany) -> str | None:
        """Resolve a ``Counterparty`` for ``company`` within its org.

        Returns the matched counterparty id (and sets the FK) or ``None``.
        """
        if company.counterparty_id:
            return company.counterparty_id
        org_id = company.organization_id
        if not org_id:
            return None

        vat = self._extract_vat(company)
        if vat:
            cp_id = await self._match_by_vat(org_id, vat)
            if cp_id:
                company.counterparty_id = cp_id
                return cp_id

        if company.domain:
            cp_id = await self._match_by_domain(org_id, company.domain)
            if cp_id:
                company.counterparty_id = cp_id
                return cp_id

        if company.name:
            cp_id = await self._match_by_name(org_id, company.name)
            if cp_id:
                company.counterparty_id = cp_id
                return cp_id

        logger.debug(
            "hubspot_company=%s org=%s unmatched (no vat/domain/name hit)",
            company.hubspot_id,
            org_id,
        )
        return None

    # ---------------- Extraction helpers -------------------------------

    @staticmethod
    def _extract_vat(company: HubspotCompany) -> str | None:
        """Pull a VAT number from the typed column or the raw ``properties`` bag.

        Checked in order:
            1. ``HubspotCompany.vat_id`` (we populate this from
               ``properties.vat_id`` during upsert).
            2. ``raw_object.properties.vat`` / ``tax_id`` / ``ein`` — legacy
               portals sometimes use alternate property names; we accept
               the common ones so tenants with bespoke setups still match.
        """
        if company.vat_id and company.vat_id.strip():
            return company.vat_id.strip().upper()
        raw: Any = company.raw_object
        if isinstance(raw, dict):
            props = raw.get("properties")
            if isinstance(props, dict):
                for key in ("vat_id", "vat", "tax_id", "ein"):
                    val = props.get(key)
                    if isinstance(val, str) and val.strip():
                        return val.strip().upper()
        return None

    # ---------------- Matchers -----------------------------------------

    async def _match_by_vat(self, org_id: str, vat: str) -> str | None:
        stmt = (
            select(Counterparty.id)
            .where(
                Counterparty.organization_id == org_id,
                Counterparty.deleted_at.is_(None),
                func.upper(Counterparty.vat_number) == vat,
            )
            .limit(2)
        )
        rows = (await self._db.execute(stmt)).scalars().all()
        if len(rows) == 1:
            return rows[0]
        return None

    async def _match_by_domain(self, org_id: str, domain: str) -> str | None:
        """Match on ``contact_info.domain`` exact, then on email host suffix.

        We keep both forms because historical counterparties pre-date the
        ``domain`` convention and only carry an ``email`` — falling back
        to the email host still gives us the deterministic match our
        exact-only policy requires.
        """
        normalized = domain.strip().lower().lstrip("@")
        if not normalized:
            return None

        stmt = (
            select(Counterparty.id)
            .where(
                Counterparty.organization_id == org_id,
                Counterparty.deleted_at.is_(None),
                func.lower(Counterparty.contact_info["domain"].astext) == normalized,
            )
            .limit(2)
        )
        rows = (await self._db.execute(stmt)).scalars().all()
        if len(rows) == 1:
            return rows[0]
        if len(rows) >= 2:
            return None

        # Fall back to the host portion of the counterparty email.
        email_like = f"%@{normalized}"
        stmt = (
            select(Counterparty.id)
            .where(
                Counterparty.organization_id == org_id,
                Counterparty.deleted_at.is_(None),
                func.lower(Counterparty.contact_info["email"].astext).like(email_like),
            )
            .limit(2)
        )
        rows = (await self._db.execute(stmt)).scalars().all()
        if len(rows) == 1:
            return rows[0]
        return None

    async def _match_by_name(self, org_id: str, name: str) -> str | None:
        normalized = name.strip().lower()
        if not normalized:
            return None
        stmt = (
            select(Counterparty.id)
            .where(
                Counterparty.organization_id == org_id,
                Counterparty.deleted_at.is_(None),
                func.lower(Counterparty.name) == normalized,
            )
            .limit(2)
        )
        rows = (await self._db.execute(stmt)).scalars().all()
        if len(rows) == 1:
            return rows[0]
        return None
