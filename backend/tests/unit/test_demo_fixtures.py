"""Validate demo JSON fixtures against Pydantic models used by API responses."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest

from app.core.demo import get_demo_dashboard_transactions, get_demo_payload
from app.core.demo_constants import DEMO_SALTEDGE_CUSTOMER_ID
from app.core.exceptions import NotFoundError
from app.models.dashboard import (
    AadeDocumentsResponse,
    AadeInvoiceItem,
    AadeSummaryResponse,
    DashboardMetricsResponse,
    TransactionsRequest,
    TransactionsResponse,
)
from app.models.organization import CounterpartyResponse
from app.services.dashboard_service import DashboardService
from app.services.saltedge_service import SaltEdgeService
from packages.saltedge.models.customers import CustomersResponse


def test_dashboard_pl_metrics_fixture_matches_response_model() -> None:
    raw = get_demo_payload("dashboard_pl_metrics")
    DashboardMetricsResponse.model_validate(raw)


def test_dashboard_seller_metrics_fixture_has_counters() -> None:
    d = get_demo_payload("dashboard_seller_metrics")
    assert "total_counterparties" in d
    assert "total_active_alerts" in d


def test_dashboard_transactions_fixture_rows_match_response_model() -> None:
    for row in get_demo_dashboard_transactions():
        TransactionsResponse.model_validate(row)


def test_dashboard_aade_documents_fixture() -> None:
    blob = get_demo_payload("dashboard_aade_documents")
    items = [AadeInvoiceItem.model_validate(x) for x in blob["invoices"]]
    AadeDocumentsResponse(
        invoices=items,
        total=len(items),
        limit=50,
        offset=0,
    )


def test_dashboard_aade_summary_fixture() -> None:
    AadeSummaryResponse.model_validate(get_demo_payload("dashboard_aade_summary"))


def test_organization_counterparties_fixture() -> None:
    oid = UUID("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
    for row in get_demo_payload("organization_counterparties")["counterparties"]:
        CounterpartyResponse.model_validate({**row, "organization_id": oid})


def test_saltedge_customers_fixture() -> None:
    parsed = CustomersResponse.model_validate(get_demo_payload("saltedge_customers"))
    assert parsed.data[0].customer_id == DEMO_SALTEDGE_CUSTOMER_ID


@pytest.mark.asyncio
async def test_dashboard_pl_metrics_demo_rejects_unknown_customer() -> None:
    with patch("app.services.dashboard_service.settings") as s:
        s.demo_mode = True
        svc = DashboardService(AsyncMock(), "00000000-0000-0000-0000-000000000001")
        from app.models.dashboard import DashboardMetricsRequest

        with pytest.raises(NotFoundError):
            await svc.get_dashboard_pl_metrics(
                DashboardMetricsRequest(customer_id="not-a-demo-customer")
            )


@pytest.mark.asyncio
async def test_saltedge_get_customer_demo_unknown_raises() -> None:
    app_settings = MagicMock()
    app_settings.SALTEDGE_APP_ID = "test-app"
    app_settings.SALTEDGE_SECRET = "test-secret"
    app_settings.SALTEDGE_BASE_URL = "https://www.saltedge.com/api/v6"

    with patch("app.services.saltedge_service.settings") as s:
        s.demo_mode = True
        svc = SaltEdgeService(
            AsyncMock(),
            app_settings,
            "00000000-0000-0000-0000-000000000001",
        )
        with pytest.raises(NotFoundError):
            await svc.get_customer(customer_id="no-such-demo-customer")
