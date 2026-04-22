"""CustomerBootstrapperService — resolve-or-create ``Counterparty`` flows.

The service must:
* Return an existing match when the matcher finds one (no new row).
* Auto-create a Counterparty when the source row has sufficient identity
  (name OR email OR VAT) and no matcher hit.
* Defer (return None) when the source row is identity-poor — avoids
  littering the DB with placeholder rows that only carry an external id.
* Always link the newly created Counterparty's id back onto the source row.
* Scope every insert to the source row's ``organization_id``.
"""
from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.customer_bootstrapper_service import CustomerBootstrapperService


# ---------------------------------------------------------------------------
# Stripe — fixtures
# ---------------------------------------------------------------------------


def _stripe_cust(
    *,
    org_id: str = "org-1",
    stripe_id: str = "cus_1",
    email: str | None = None,
    name: str | None = None,
    phone: str | None = None,
    address: dict[str, Any] | None = None,
    raw: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    existing_cp: str | None = None,
) -> Any:
    return SimpleNamespace(
        organization_id=org_id,
        stripe_id=stripe_id,
        email=email,
        name=name,
        phone=phone,
        address=address,
        raw_stripe_object=raw,
        stripe_metadata=metadata,
        counterparty_id=existing_cp,
    )


def _hs_company(
    *,
    org_id: str = "org-1",
    hubspot_id: str = "9001",
    hub_id: int = 42,
    name: str | None = None,
    domain: str | None = None,
    country: str | None = None,
    vat_id: str | None = None,
    raw: dict[str, Any] | None = None,
    existing_cp: str | None = None,
) -> Any:
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


def _db_with_matcher(hit: str | None) -> MagicMock:
    """Return an AsyncMock session where the matcher returns ``hit``.

    We stub the matcher entirely in tests — the matcher itself has its
    own coverage. The bootstrapper's contract is "delegate, and decide
    whether to create based on the source row".
    """
    db = AsyncMock()
    db.add = MagicMock()  # sync method on Session
    return db


# ---------------------------------------------------------------------------
# Stripe tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_stripe_returns_matcher_hit_without_creating() -> None:
    db = _db_with_matcher(hit="cp-existing")
    cust = _stripe_cust(email="foo@bar.com", name="Acme")
    with patch(
        "app.services.customer_bootstrapper_service.StripeCustomerCounterpartyMatcher"
    ) as MatcherCls:
        matcher = MatcherCls.return_value
        matcher.match_and_link = AsyncMock(return_value="cp-existing")

        result = await CustomerBootstrapperService(db).from_stripe_customer(cust)

    assert result == "cp-existing"
    db.add.assert_not_called()
    db.flush.assert_not_called()


@pytest.mark.asyncio
async def test_stripe_creates_when_matcher_misses_and_identity_sufficient() -> None:
    db = _db_with_matcher(hit=None)

    # Pretend flush assigns a primary key the way Postgres would.
    async def _flush_assigns_id() -> None:
        created = db.add.call_args[0][0]
        created.id = "cp-new-123"

    db.flush = AsyncMock(side_effect=_flush_assigns_id)

    cust = _stripe_cust(
        email="billing@acme.com",
        name="Acme Ltd",
        address={"country": "GR", "line1": "Main 1", "city": "Athens"},
    )
    with patch(
        "app.services.customer_bootstrapper_service.StripeCustomerCounterpartyMatcher"
    ) as MatcherCls:
        MatcherCls.return_value.match_and_link = AsyncMock(return_value=None)
        MatcherCls._extract_vat = lambda c: None

        result = await CustomerBootstrapperService(db).from_stripe_customer(cust)

    assert result == "cp-new-123"
    db.add.assert_called_once()
    created = db.add.call_args[0][0]
    assert created.organization_id == "org-1"
    assert created.name == "Acme Ltd"
    assert created.country == "GR"
    assert created.address_street == "Main 1"
    assert created.contact_info["email"] == "billing@acme.com"
    assert created.contact_info["domain"] == "acme.com"
    assert created.registry_data["source"] == "stripe"
    assert cust.counterparty_id == "cp-new-123"


@pytest.mark.asyncio
async def test_stripe_defers_when_identity_insufficient() -> None:
    db = _db_with_matcher(hit=None)
    db.flush = AsyncMock()
    cust = _stripe_cust()  # no name, no email, no VAT
    with patch(
        "app.services.customer_bootstrapper_service.StripeCustomerCounterpartyMatcher"
    ) as MatcherCls:
        MatcherCls.return_value.match_and_link = AsyncMock(return_value=None)
        MatcherCls._extract_vat = lambda c: None

        result = await CustomerBootstrapperService(db).from_stripe_customer(cust)

    assert result is None
    db.add.assert_not_called()
    assert cust.counterparty_id is None


@pytest.mark.asyncio
async def test_stripe_already_linked_returns_existing() -> None:
    db = _db_with_matcher(hit=None)
    cust = _stripe_cust(existing_cp="cp-linked")
    result = await CustomerBootstrapperService(db).from_stripe_customer(cust)
    assert result == "cp-linked"
    db.add.assert_not_called()


# ---------------------------------------------------------------------------
# HubSpot tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_hubspot_returns_matcher_hit_without_creating() -> None:
    db = _db_with_matcher(hit="cp-existing")
    c = _hs_company(name="Acme", domain="acme.com")
    with patch(
        "app.services.customer_bootstrapper_service.HubspotCompanyCounterpartyMatcher"
    ) as MatcherCls:
        MatcherCls.return_value.match_and_link = AsyncMock(return_value="cp-existing")

        result = await CustomerBootstrapperService(db).from_hubspot_company(c)

    assert result == "cp-existing"
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_hubspot_creates_with_country_normalised_to_alpha2() -> None:
    db = _db_with_matcher(hit=None)

    async def _flush_assigns_id() -> None:
        db.add.call_args[0][0].id = "cp-new-hs"

    db.flush = AsyncMock(side_effect=_flush_assigns_id)
    c = _hs_company(name="Acme", domain="Acme.com", country="gr")
    with patch(
        "app.services.customer_bootstrapper_service.HubspotCompanyCounterpartyMatcher"
    ) as MatcherCls:
        MatcherCls.return_value.match_and_link = AsyncMock(return_value=None)
        MatcherCls._extract_vat = lambda c: None

        await CustomerBootstrapperService(db).from_hubspot_company(c)

    created = db.add.call_args[0][0]
    assert created.country == "GR"
    assert created.contact_info["domain"] == "acme.com"
    assert created.registry_data == {
        "source": "hubspot",
        "hubspot_company_id": "9001",
        "hub_id": 42,
    }


@pytest.mark.asyncio
async def test_hubspot_drops_country_when_not_alpha2() -> None:
    db = _db_with_matcher(hit=None)

    async def _flush_assigns_id() -> None:
        db.add.call_args[0][0].id = "cp-new-hs2"

    db.flush = AsyncMock(side_effect=_flush_assigns_id)
    c = _hs_company(name="Acme", country="Greece")  # full name, not alpha2
    with patch(
        "app.services.customer_bootstrapper_service.HubspotCompanyCounterpartyMatcher"
    ) as MatcherCls:
        MatcherCls.return_value.match_and_link = AsyncMock(return_value=None)
        MatcherCls._extract_vat = lambda c: None

        await CustomerBootstrapperService(db).from_hubspot_company(c)

    created = db.add.call_args[0][0]
    assert created.country is None


@pytest.mark.asyncio
async def test_hubspot_defers_when_identity_insufficient() -> None:
    db = _db_with_matcher(hit=None)
    db.flush = AsyncMock()
    c = _hs_company()
    with patch(
        "app.services.customer_bootstrapper_service.HubspotCompanyCounterpartyMatcher"
    ) as MatcherCls:
        MatcherCls.return_value.match_and_link = AsyncMock(return_value=None)
        MatcherCls._extract_vat = lambda c: None

        result = await CustomerBootstrapperService(db).from_hubspot_company(c)

    assert result is None
    db.add.assert_not_called()
