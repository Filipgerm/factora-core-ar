"""Tenant-scoped Counterparty matching for HubSpot companies.

The matcher must:
* Prefer VAT (exact) → domain → name (ci-trim), in that order.
* Never cross organisations.
* Never link when more than one Counterparty matches (ambiguous).
* Be idempotent (already-linked companies are returned unchanged).
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.hubspot_company_matcher import HubspotCompanyCounterpartyMatcher


def _company(
    *,
    org_id: str = "org-1",
    hubspot_id: str = "1001",
    hub_id: int = 42,
    name: str | None = None,
    domain: str | None = None,
    country: str | None = None,
    vat_id: str | None = None,
    raw: dict[str, Any] | None = None,
    existing_cp: str | None = None,
) -> Any:
    """SimpleNamespace stand-in for ``HubspotCompany`` — matcher only reads attrs."""
    return SimpleNamespace(
        organization_id=org_id,
        hubspot_id=hubspot_id,
        hub_id=hub_id,
        name=name,
        domain=domain,
        country=country,
        vat_id=vat_id,
        raw_object=raw,
        counterparty_id=existing_cp,
    )


def _session_returning(seq_of_ids: list[list[str]]) -> MagicMock:
    """Yield a different scalars().all() result per matcher lookup."""
    db = AsyncMock()
    results: list[MagicMock] = []
    for ids in seq_of_ids:
        result = MagicMock()
        scalars = MagicMock()
        scalars.all.return_value = ids
        result.scalars.return_value = scalars
        results.append(result)
    db.execute.side_effect = results
    return db


@pytest.mark.asyncio
async def test_match_by_vat_short_circuits_later_lookups() -> None:
    db = _session_returning([["cp-vat-1"]])
    matcher = HubspotCompanyCounterpartyMatcher(db)
    c = _company(name="Acme", domain="acme.com", vat_id="el12345")
    cp = await matcher.match_and_link(c)
    assert cp == "cp-vat-1"
    assert c.counterparty_id == "cp-vat-1"
    assert db.execute.await_count == 1


@pytest.mark.asyncio
async def test_falls_back_to_domain_then_email_host_when_no_vat() -> None:
    # First lookup is the typed domain match (miss), second is the email host
    # fallback (hit).
    db = _session_returning([[], ["cp-email-1"]])
    matcher = HubspotCompanyCounterpartyMatcher(db)
    c = _company(domain="Acme.com")
    cp = await matcher.match_and_link(c)
    assert cp == "cp-email-1"
    assert db.execute.await_count == 2


@pytest.mark.asyncio
async def test_falls_back_to_name_when_no_vat_or_domain() -> None:
    db = _session_returning([["cp-name-1"]])
    matcher = HubspotCompanyCounterpartyMatcher(db)
    c = _company(name="  Acme Ltd  ")
    cp = await matcher.match_and_link(c)
    assert cp == "cp-name-1"


@pytest.mark.asyncio
async def test_ambiguous_vat_returns_none() -> None:
    db = _session_returning([["cp-a", "cp-b"], []])
    matcher = HubspotCompanyCounterpartyMatcher(db)
    c = _company(vat_id="EL99", name="Ambig")
    cp = await matcher.match_and_link(c)
    assert cp is None
    assert c.counterparty_id is None


@pytest.mark.asyncio
async def test_already_linked_is_idempotent() -> None:
    db = AsyncMock()
    matcher = HubspotCompanyCounterpartyMatcher(db)
    c = _company(existing_cp="cp-preexisting")
    cp = await matcher.match_and_link(c)
    assert cp == "cp-preexisting"
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_no_org_is_noop() -> None:
    db = AsyncMock()
    matcher = HubspotCompanyCounterpartyMatcher(db)
    c = _company(name="x")
    c.organization_id = ""
    cp = await matcher.match_and_link(c)
    assert cp is None
    db.execute.assert_not_called()


def test_extract_vat_from_typed_column() -> None:
    c = _company(vat_id=" el123 ")
    assert HubspotCompanyCounterpartyMatcher._extract_vat(c) == "EL123"


def test_extract_vat_from_raw_properties_fallback() -> None:
    c = _company(raw={"properties": {"tax_id": "EL77"}})
    assert HubspotCompanyCounterpartyMatcher._extract_vat(c) == "EL77"


def test_extract_vat_none_when_absent() -> None:
    c = _company()
    assert HubspotCompanyCounterpartyMatcher._extract_vat(c) is None
