from __future__ import annotations
from fastapi import APIRouter, Depends, Body, HTTPException, Path, Query
from datetime import date, timedelta
from typing import Optional, Dict, Any, Annotated, Literal, List
from app.controllers.dashboard_controller import (
    DashboardController,
    get_dashboard_controller,
)
from app.services.dashboard_service import DashboardService
from app.config import Settings as AppSettings
from app.models.dashboard import (
    DashboardMetricsResponse,
    DashboardMetricsRequest,
    TransactionsRequest,
    TransactionsResponse,
    SellerMetricsRequest,
    SellerMetricsResponse,
    AadeDocumentsRequest,
    AadeDocumentsResponse,
    AadeSummaryResponse,
)
from app.db.postgres import get_db_session  # your AsyncSession provider
from sqlalchemy.ext.asyncio import AsyncSession

# from uuid import UUID  # No longer needed

router = APIRouter()


@router.get(
    "/pl-metrics",
    response_model=DashboardMetricsResponse,
    summary="Bank account metrics",
    description="Get the P&L metrics for the bank account. Retrieves summary KPIs"
    "(revenue, expenses, net income, net cash flow, balance) for the given time period.",
)
async def get_dashboard_pl_metrics(
    customer_id: str = Query(..., description="Customer ID (string format)"),
    days: Optional[int] = Query(
        30, description="Number of days for cash flow calculation"
    ),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    currency: Optional[str] = Query("EUR", description="Reporting currency (MVP: EUR)"),
    ctl: DashboardController = Depends(get_dashboard_controller),
    db: AsyncSession = Depends(get_db_session),
) -> DashboardMetricsResponse:

    # Normalize window defaults (if both dates missing, use last `days`)
    if not start_date and not end_date:
        end_date = date.today()
        start_date = end_date - timedelta(days=days or 30)
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date")

    req = DashboardMetricsRequest(
        customer_id=customer_id,
        days=days or 30,
        start_date=start_date,
        end_date=end_date,
        currency=currency,
    )
    return await ctl.get_dashboard_pl_metrics(db=db, request=req)


@router.get(
    "/transactions",
    response_model=List[TransactionsResponse],
    summary="Detailed transaction history",
    description="Get the detailed transaction history enriched with amount, category and date.",
)
async def get_transaction_history(
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
    ctl: DashboardController = Depends(get_dashboard_controller),
    db: AsyncSession = Depends(get_db_session),
) -> List[TransactionsResponse]:

    req = TransactionsRequest(
        customer_id=customer_id,
        account_id=account_id,
        status=status,
        start_date=start_date,  # We'll handle date filtering in the service
        end_date=end_date,
        max_amount=max_amount,
        min_amount=min_amount,
        currency_code=None,
        category=category,
        merchant_id=None,
        mcc=mcc,
        limit=limit,
    )
    return await ctl.get_transaction_history(
        db=db,
        request=req,
    )


@router.get(
    "/seller-metrics",
    response_model=SellerMetricsResponse,
    summary="Seller dashboard metrics",
    description="Get metrics for a seller: completed customers, pending customers, and active alerts.",
)
async def get_seller_metrics(
    seller_id: str = Query(..., description="Seller ID (string format)"),
    ctl: DashboardController = Depends(get_dashboard_controller),
    db: AsyncSession = Depends(get_db_session),
) -> SellerMetricsResponse:
    req = SellerMetricsRequest(seller_id=seller_id)
    return await ctl.get_seller_metrics(db=db, request=req)


@router.get(
    "/aade-documents",
    response_model=AadeDocumentsResponse,
    summary="Get AADE documents",
    description="Get AADE invoices with filtering and pagination. "
    "Supports filtering by date range, invoice type, and VAT numbers.",
)
async def get_aade_documents(
    buyer_id: str = Query(..., description="Buyer ID (string format)"),
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
    ctl: DashboardController = Depends(get_dashboard_controller),
    db: AsyncSession = Depends(get_db_session),
) -> AadeDocumentsResponse:
    """
    Get AADE documents with filtering and pagination.

    - **buyer_id**: Buyer ID to filter documents
    - **date_from**: Filter invoices from this date
    - **date_to**: Filter invoices to this date
    - **invoice_type**: Filter by invoice type
    - **issuer_vat**: Filter by issuer VAT number
    - **counterpart_vat**: Filter by counterpart VAT number
    - **limit**: Maximum number of invoices to return (1-1000)
    - **offset**: Number of invoices to skip for pagination

    Returns:
        AadeDocumentsResponse: Paginated response with invoices and total count
    """
    req = AadeDocumentsRequest(
        buyer_id=buyer_id,
        date_from=date_from,
        date_to=date_to,
        invoice_type=invoice_type,
        issuer_vat=issuer_vat,
        counterpart_vat=counterpart_vat,
        limit=limit,
        offset=offset,
    )
    return await ctl.get_aade_documents(db=db, request=req)


@router.get(
    "/aade-summary",
    response_model=AadeSummaryResponse,
    summary="Get AADE invoice summary",
    description="Get aggregated statistics for all AADE invoices of a given business. "
    "Includes global totals, supplier/customer counts, and per-customer/per-supplier breakdowns.",
)
async def get_aade_summary(
    buyer_id: str = Query(..., description="Buyer ID (string format)"),
    ctl: DashboardController = Depends(get_dashboard_controller),
    db: AsyncSession = Depends(get_db_session),
) -> AadeSummaryResponse:
    """
    Get aggregated AADE invoice statistics for a buyer.

    - **buyer_id**: Buyer ID to filter invoices

    Returns:
        AadeSummaryResponse: Aggregated statistics including totals, counts, and breakdowns
    """
    return await ctl.get_aade_summary(db=db, buyer_id=buyer_id)
