"""StripeCustomerCounterpartyMatcher — link Stripe customers to unified counterparties.

**Scope:** Given an upserted ``StripeCustomer`` row, resolve its matching
``Counterparty`` within the same organization and persist the FK back on the
Stripe customer. Low-confidence matches are left null for manual review.

**Contract:** Pure resolver; returns the counterparty id (or ``None``) and
mutates the ``StripeCustomer.counterparty_id`` on the session when a match
is found. Never raises on no-match; never crosses organisations.

**Matching strategy (ordered, short-circuit):**
    1. Exact VAT number match (from ``StripeCustomer.address.tax_ids`` or the
       metadata ``vat_number`` / ``tax_id`` field).
    2. Exact email match (case-insensitive).
    3. Exact normalized-name match (trimmed, lowercased).

Only **exact** matches are committed. Fuzzy matching is deliberately *not*
performed here — it belongs in the ingestion agent where an LLM can adjudicate
ambiguity and write to an Active-Learning feedback table.

**Architectural notes:** The service mutates the ORM row in-place without a
commit; the caller (``StripeSyncService.apply_customer``) controls the
transaction boundary so matcher + upsert commit atomically.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.counterparty import Counterparty
from app.db.models.stripe_billing import StripeCustomer

logger = logging.getLogger(__name__)


class StripeCustomerCounterpartyMatcher:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def match_and_link(self, customer: StripeCustomer) -> str | None:
        """Resolve a ``Counterparty`` for ``customer`` within its org."""
        if customer.counterparty_id:
            return customer.counterparty_id
        org_id = customer.organization_id
        if not org_id:
            return None

        vat = self._extract_vat(customer)
        if vat:
            cp_id = await self._match_by_vat(org_id, vat)
            if cp_id:
                customer.counterparty_id = cp_id
                return cp_id

        if customer.email:
            cp_id = await self._match_by_email(org_id, customer.email)
            if cp_id:
                customer.counterparty_id = cp_id
                return cp_id

        if customer.name:
            cp_id = await self._match_by_name(org_id, customer.name)
            if cp_id:
                customer.counterparty_id = cp_id
                return cp_id

        logger.debug(
            "stripe_customer=%s org=%s unmatched (no vat/email/name hit)",
            customer.stripe_id,
            org_id,
        )
        return None

    @staticmethod
    def _extract_vat(customer: StripeCustomer) -> str | None:
        """Pull a VAT number from Stripe's customer object or metadata."""
        raw: dict[str, Any] | None = customer.raw_stripe_object
        if not isinstance(raw, dict):
            return None
        tax_ids = raw.get("tax_ids")
        if isinstance(tax_ids, dict):
            data = tax_ids.get("data")
            if isinstance(data, list):
                for entry in data:
                    if isinstance(entry, dict):
                        val = entry.get("value")
                        if isinstance(val, str) and val.strip():
                            return val.strip().upper()
        md = customer.stripe_metadata or {}
        if isinstance(md, dict):
            for key in ("vat_number", "tax_id", "vat"):
                val = md.get(key)
                if isinstance(val, str) and val.strip():
                    return val.strip().upper()
        return None

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

    async def _match_by_email(self, org_id: str, email: str) -> str | None:
        """Match when the email sits inside ``counterparty.contact_info.email``."""
        normalized = email.strip().lower()
        stmt = (
            select(Counterparty.id)
            .where(
                Counterparty.organization_id == org_id,
                Counterparty.deleted_at.is_(None),
                func.lower(Counterparty.contact_info["email"].astext) == normalized,
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
