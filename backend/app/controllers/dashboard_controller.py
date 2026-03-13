from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession

from typing import List
from app.services.dashboard_service import DashboardService, get_dashboard_service
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
from fastapi import HTTPException


class DashboardController:
    """Orchestrates dashboard service calls and translates exceptions to HTTPExceptions."""

    def __init__(self, dashboard_service: DashboardService) -> None:
        self.dashboard_service = dashboard_service

    async def get_dashboard_pl_metrics(
        self, db: AsyncSession, request: DashboardMetricsRequest
    ) -> DashboardMetricsResponse:
        """Return P&L metrics for a customer over the requested time window.

        Args:
            db: Async database session for the current request.
            request: Query parameters including customer_id, date range, and currency.

        Returns:
            A :class:`DashboardMetricsResponse` with revenue, expense, and balance data.

        Raises:
            HTTPException: 500 on unexpected service errors.
        """
        try:
            return await self.dashboard_service.get_dashboard_pl_metrics(
                db=db, request=request
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_transaction_history(
        self, db: AsyncSession, request: TransactionsRequest
    ) -> List[TransactionsResponse]:
        """Return filtered, paginated transaction history for a customer.

        Args:
            db: Async database session for the current request.
            request: Filter and pagination parameters (customer_id, dates, amounts, etc.).

        Returns:
            List of :class:`TransactionsResponse` matching the request filters.

        Raises:
            HTTPException: 500 on unexpected service errors.
        """
        try:
            return await self.dashboard_service.get_transaction_history(
                db=db, request=request
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_seller_metrics(
        self, db: AsyncSession, request: SellerMetricsRequest
    ) -> SellerMetricsResponse:
        """Return aggregate metrics for a seller (completed/pending buyers, active alerts).

        Args:
            db: Async database session for the current request.
            request: Contains seller_id.

        Returns:
            A :class:`SellerMetricsResponse` with customer and alert counts.

        Raises:
            HTTPException: 500 on unexpected service errors.
        """
        try:
            return await self.dashboard_service.get_seller_metrics(
                db=db, request=request
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_aade_documents(
        self, db: AsyncSession, request: AadeDocumentsRequest
    ) -> AadeDocumentsResponse:
        """Return paginated AADE invoices for a buyer with optional filters.

        Args:
            db: Async database session for the current request.
            request: Filter/pagination parameters (buyer_id, dates, vats, invoice_type).

        Returns:
            An :class:`AadeDocumentsResponse` with a paginated invoice list and total count.

        Raises:
            HTTPException: 500 on unexpected service errors.
        """
        try:
            return await self.dashboard_service.get_aade_documents(
                db=db, request=request
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_aade_summary(
        self, db: AsyncSession, buyer_id: str
    ) -> AadeSummaryResponse:
        """Return aggregated AADE invoice statistics for a buyer.

        Args:
            db: Async database session for the current request.
            buyer_id: Internal buyer identifier to scope the summary.

        Returns:
            An :class:`AadeSummaryResponse` with totals, party counts, and breakdowns.

        Raises:
            HTTPException: 500 on unexpected service errors.
        """
        try:
            return await self.dashboard_service.get_aade_summary(
                db=db, buyer_id=buyer_id
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


def get_dashboard_controller() -> DashboardController:
    """Provide a :class:`DashboardController` instance for dependency injection.

    Returns:
        A :class:`DashboardController` wired to a fresh :class:`DashboardService`.
    """
    return DashboardController(get_dashboard_service())
