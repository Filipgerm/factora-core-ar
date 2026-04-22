"""Pure mapper tests — no DB, no Stripe SDK round-trips.

These mappers are the contract between Stripe payloads and our ORM,
so they must be deterministic and tolerant of partial / stringified
child objects the way Stripe actually sends them on the webhook path.
"""

from __future__ import annotations

from datetime import datetime

import pytest

from packages.stripe import mappers as M


def test_ts_from_epoch_returns_none_for_none() -> None:
    assert M.ts_from_epoch(None) is None


def test_ts_from_epoch_returns_utc_datetime() -> None:
    dt = M.ts_from_epoch(1_700_000_000)
    assert isinstance(dt, datetime)
    assert dt.tzinfo is not None
    assert dt.year == 2023


def test_source_id_handles_string() -> None:
    assert M.source_id("ch_123") == "ch_123"


def test_source_id_handles_dict() -> None:
    assert M.source_id({"id": "pi_456"}) == "pi_456"


def test_source_id_handles_none() -> None:
    assert M.source_id(None) is None


def test_metadata_org_reads_organization_id_key() -> None:
    d = {"metadata": {"organization_id": "org-uuid-123"}}
    assert M.metadata_org(d) == "org-uuid-123"


def test_metadata_org_missing_returns_none() -> None:
    assert M.metadata_org({"metadata": {}}) is None
    assert M.metadata_org({}) is None


# ---------------------------------------------------------------------------
# Invoice line item — the hot path for subscription_item FK / price FK
# ---------------------------------------------------------------------------


def test_map_invoice_line_item_extracts_price_and_product_from_expanded_price() -> None:
    ld = {
        "id": "il_123",
        "amount": 1000,
        "currency": "eur",
        "description": "Seat",
        "quantity": 2,
        "unit_amount": 500,
        "type": "subscription",
        "price": {"id": "price_abc", "product": "prod_xyz"},
        "subscription_item": "si_abc",
        "metadata": {"plan_id": "enterprise"},
        "period": {"start": 1_700_000_000, "end": 1_702_000_000},
    }
    vals = M.map_invoice_line_item(ld, invoice_stripe_id="in_999")
    assert vals["invoice_stripe_id"] == "in_999"
    assert vals["price_stripe_id"] == "price_abc"
    assert vals["product_stripe_id"] == "prod_xyz"
    assert vals["subscription_item_stripe_id"] == "si_abc"
    assert vals["amount"] == 1000
    assert vals["quantity"] == 2
    assert vals["stripe_metadata"] == {"plan_id": "enterprise"}
    assert vals["period"] == {"start": 1_700_000_000, "end": 1_702_000_000}


def test_map_invoice_line_item_tolerates_stringified_product_under_price() -> None:
    ld = {
        "id": "il_abc",
        "amount": 100,
        "currency": "usd",
        "price": {"id": "price_q", "product": "prod_q"},
        "subscription_item": {"id": "si_q"},
    }
    vals = M.map_invoice_line_item(ld, invoice_stripe_id="in_xxx")
    assert vals["price_stripe_id"] == "price_q"
    assert vals["product_stripe_id"] == "prod_q"
    assert vals["subscription_item_stripe_id"] == "si_q"


def test_map_invoice_line_item_missing_price_does_not_raise() -> None:
    ld = {"id": "il_x", "amount": 100, "currency": "usd"}
    vals = M.map_invoice_line_item(ld, invoice_stripe_id="in_x")
    assert vals["price_stripe_id"] is None
    assert vals["product_stripe_id"] is None
    assert vals["subscription_item_stripe_id"] is None


# ---------------------------------------------------------------------------
# Customer mapper — tenant-agnostic (org resolution is the service's job).
# ---------------------------------------------------------------------------


def test_map_customer_copies_address_and_metadata() -> None:
    d = {
        "email": "Founder@Example.com",
        "name": "Acme",
        "phone": None,
        "balance": 0,
        "currency": "eur",
        "delinquent": False,
        "invoice_prefix": "ACME",
        "tax_exempt": "none",
        "default_source": None,
        "address": {"country": "GR"},
        "metadata": {"organization_id": "org-1", "vat": "EL12345"},
        "created": 1_700_000_000,
    }
    vals = M.map_customer(d)
    assert vals["email"] == "Founder@Example.com"
    assert vals["address"] == {"country": "GR"}
    assert vals["stripe_metadata"] == {"organization_id": "org-1", "vat": "EL12345"}
    assert vals["stripe_created"] is not None
    assert vals["raw_stripe_object"] is d


@pytest.mark.parametrize(
    "epoch,expected_none",
    [(None, True), (0, False), (1, False)],
)
def test_ts_from_epoch_parametrized(epoch: int | None, expected_none: bool) -> None:
    result = M.ts_from_epoch(epoch)
    assert (result is None) == expected_none
