"""Tenant-scoped Counterparty matching for Stripe customers.

The matcher must:
* Prefer VAT (exact) → email (ci) → name (ci-trim), in that order.
* Never cross organisations.
* Never link when more than one Counterparty matches (ambiguous).
* Be idempotent (already-linked customers are returned unchanged).
"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.stripe_customer_matcher import StripeCustomerCounterpartyMatcher


def _cust(
    *,
    org_id: str = "org-1",
    stripe_id: str = "cus_1",
    email: str | None = None,
    name: str | None = None,
    raw: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    existing_cp: str | None = None,
) -> Any:
    """Lightweight stand-in that quacks like a ``StripeCustomer`` row.

    The matcher only reads plain attributes, so ``SimpleNamespace`` keeps
    these tests decoupled from the SQLAlchemy declarative machinery (which
    refuses ``__new__`` without initializing ``_sa_instance_state``).
    """
    return SimpleNamespace(
        organization_id=org_id,
        stripe_id=stripe_id,
        email=email,
        name=name,
        raw_stripe_object=raw,
        stripe_metadata=metadata,
        counterparty_id=existing_cp,
    )


def _session_returning(seq_of_ids: list[list[str]]) -> MagicMock:
    """Yield a different scalars().all() result per await (one per lookup)."""
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
async def test_match_by_vat_uses_first_and_skips_later_lookups() -> None:
    db = _session_returning([["cp-vat-123"]])
    matcher = StripeCustomerCounterpartyMatcher(db)
    c = _cust(
        email="foo@bar.com",
        name="Acme",
        raw={"tax_ids": {"data": [{"value": "el12345"}]}},
    )
    cp = await matcher.match_and_link(c)
    assert cp == "cp-vat-123"
    assert c.counterparty_id == "cp-vat-123"
    assert db.execute.await_count == 1  # VAT short-circuits


@pytest.mark.asyncio
async def test_falls_back_to_email_when_no_vat() -> None:
    db = _session_returning([["cp-email-1"]])
    matcher = StripeCustomerCounterpartyMatcher(db)
    c = _cust(email="Foo@Example.com")
    cp = await matcher.match_and_link(c)
    assert cp == "cp-email-1"
    assert db.execute.await_count == 1


@pytest.mark.asyncio
async def test_falls_back_to_name_when_no_vat_or_email() -> None:
    db = _session_returning([["cp-name-1"]])
    matcher = StripeCustomerCounterpartyMatcher(db)
    c = _cust(name="  Acme Ltd  ")
    cp = await matcher.match_and_link(c)
    assert cp == "cp-name-1"


@pytest.mark.asyncio
async def test_ambiguous_vat_match_returns_none() -> None:
    db = _session_returning([["cp-a", "cp-b"], [], []])
    matcher = StripeCustomerCounterpartyMatcher(db)
    c = _cust(
        email="ambig@x.com",
        name="Zzz",
        raw={"tax_ids": {"data": [{"value": "EL99"}]}},
    )
    cp = await matcher.match_and_link(c)
    assert cp is None
    assert c.counterparty_id is None


@pytest.mark.asyncio
async def test_already_linked_is_idempotent() -> None:
    db = AsyncMock()
    matcher = StripeCustomerCounterpartyMatcher(db)
    c = _cust(existing_cp="cp-preexisting")
    cp = await matcher.match_and_link(c)
    assert cp == "cp-preexisting"
    db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_no_org_is_noop() -> None:
    db = AsyncMock()
    matcher = StripeCustomerCounterpartyMatcher(db)
    c = _cust(email="x@y.com")
    c.organization_id = ""
    cp = await matcher.match_and_link(c)
    assert cp is None
    db.execute.assert_not_called()


def test_extract_vat_from_tax_ids() -> None:
    c = _cust(raw={"tax_ids": {"data": [{"value": "el12345"}]}})
    assert (
        StripeCustomerCounterpartyMatcher._extract_vat(c) == "EL12345"
    )  # uppercased


def test_extract_vat_from_metadata_fallback() -> None:
    c = _cust(metadata={"vat_number": " EL77 "})
    assert StripeCustomerCounterpartyMatcher._extract_vat(c) == "EL77"


def test_extract_vat_none_when_absent() -> None:
    c = _cust()
    assert StripeCustomerCounterpartyMatcher._extract_vat(c) is None
