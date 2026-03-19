"""Dashboard routes — P&L metrics, transactions, seller metrics, AADE documents."""

from __future__ import annotations

from datetime import date, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import CurrentOrgId, DashboardCtrl, require_auth
from app.models.dashboard import (
    AadeDocumentsRequest,
    AadeDocumentsResponse,
    AadeSummaryResponse,
    DashboardMetricsRequest,
    DashboardMetricsResponse,
    SellerMetricsRequest,
    SellerMetricsResponse,
    TransactionsRequest,
    TransactionsResponse,
)

router = APIRouter(dependencies=[Depends(require_auth)])


@router.get(
    "/pl-metrics",
    response_model=DashboardMetricsResponse,
    summary="Bank account metrics",
    description="Get the P&L metrics for the bank account. Retrieves summary KPIs"
    "(revenue, expenses, net income, net cash flow, balance) for the given time period.",
)
async def get_dashboard_pl_metrics(
    ctl: DashboardCtrl,
    _org_id: CurrentOrgId,
    customer_id: str = Query(..., description="Customer ID (string format)"),
    days: Optional[int] = Query(
        30, description="Number of days for cash flow calculation"
    ),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    currency: Optional[str] = Query("EUR", description="Reporting currency (MVP: EUR)"),
) -> DashboardMetricsResponse:

    req = DashboardMetricsRequest(
        customer_id=customer_id,
        days=days or 30,
        start_date=start_date,
        end_date=end_date,
        currency=currency,
    )
    return await ctl.get_dashboard_pl_metrics(request=req)


@router.get(
    "/transactions",
    response_model=List[TransactionsResponse],
    summary="Detailed transaction history",
    description="Get the detailed transaction history enriched with amount, category and date.",
)
async def get_transaction_history(
    ctl: DashboardCtrl,
    _org_id: CurrentOrgId,
    customer_id: str = Query(..., description="Customer ID (string format)"),
    account_id: Optional[str] = Query(None, description="BankAccount ID"),
    status: Optional[str] = Query(None, description="Transaction status filter"),
    start_date: Optional[date] = Query(
        None, description="Start date filter (YYYY-MM-DD)"
    ),
    end_date: Optional[date] = Query(None, description="End date filter (YYYY-MM-DD)"),
    max_amount: Optional[float] = Query(
        None, description="Minimum amount of transactions filtered"
    ),
    min_amount: Optional[float] = Query(
        None, description="Minimum amount of transactions filtered"
    ),
    category: Optional[str] = Query(None, description="Category filter"),
    mcc: Optional[str] = Query(None, description="Industry Code"),
    limit: Optional[int] = Query(
        50, description="Maximum number of transactions to return"
    ),
) -> List[TransactionsResponse]:
    req = TransactionsRequest(
        customer_id=customer_id,
        account_id=account_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        max_amount=max_amount,
        min_amount=min_amount,
        currency_code=None,
        category=category,
        merchant_id=None,
        mcc=mcc,
        limit=limit,
    )
    return await ctl.get_transaction_history(request=req)


@router.get(
    "/seller-metrics",
    response_model=SellerMetricsResponse,
    summary="Seller dashboard metrics",
    description="Get metrics for a seller: completed customers, pending customers, and active alerts.",
)
async def get_seller_metrics(
    ctl: DashboardCtrl,
    _org_id: CurrentOrgId,
) -> SellerMetricsResponse:
    req = SellerMetricsRequest()
    return await ctl.get_seller_metrics(request=req)


@router.get(
    "/aade-documents",
    response_model=AadeDocumentsResponse,
    summary="Get AADE documents",
    description="Get AADE invoices with filtering and pagination. "
    "Supports filtering by date range, invoice type, and VAT numbers.",
)
async def get_aade_documents(
    ctl: DashboardCtrl,
    _org_id: CurrentOrgId,
    date_from: Optional[date] = Query(
        None, description="Filter invoices from this date (YYYY-MM-DD)"
    ),
    date_to: Optional[date] = Query(
        None, description="Filter invoices to this date (YYYY-MM-DD)"
    ),
    invoice_type: Optional[str] = Query(None, description="Filter by invoice type"),
    issuer_vat: Optional[str] = Query(None, description="Filter by issuer VAT number"),
    counterpart_vat: Optional[str] = Query(
        None, description="Filter by counterpart VAT number"
    ),
    limit: int = Query(
        50, ge=1, le=1000, description="Maximum number of invoices to return"
    ),
    offset: int = Query(
        0, ge=0, description="Number of invoices to skip for pagination"
    ),
) -> AadeDocumentsResponse:
    req = AadeDocumentsRequest(
        date_from=date_from,
        date_to=date_to,
        invoice_type=invoice_type,
        issuer_vat=issuer_vat,
        counterpart_vat=counterpart_vat,
        limit=limit,
        offset=offset,
    )
    return await ctl.get_aade_documents(request=req)


@router.get(
    "/aade-summary",
    response_model=AadeSummaryResponse,
    summary="Get AADE invoice summary",
    description="Get aggregated statistics for all AADE invoices of a given business. "
    "Includes global totals, supplier/customer counts, and per-customer/per-supplier breakdowns.",
)
async def get_aade_summary(
    ctl: DashboardCtrl,
    _org_id: CurrentOrgId,
) -> AadeSummaryResponse:
    """Get aggregated AADE invoice statistics for an organization."""
    return await ctl.get_aade_summary()
