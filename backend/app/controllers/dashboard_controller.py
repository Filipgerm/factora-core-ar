from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession

from typing import Optional, Dict, Any
from datetime import date
from packages.saltedge.errors import ApiError, NetworkError
from app.services.dashboard_service import DashboardService, get_dashboard_service
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
from typing import List
from fastapi import HTTPException
from app.models.user import ServiceResponse


class DashboardController:
    def __init__(self, dashboard_service: DashboardService) -> None:
        self.dashboard_service = dashboard_service

    async def get_dashboard_pl_metrics(
        self, db: AsyncSession, request: DashboardMetricsRequest
    ) -> DashboardMetricsResponse:
        try:
            return await self.dashboard_service.get_dashboard_pl_metrics(
                db=db, request=request
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_transaction_history(
        self, db: AsyncSession, request: TransactionsRequest
    ) -> List[TransactionsResponse]:
        try:
            return await self.dashboard_service.get_transaction_history(
                db=db, request=request
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_seller_metrics(
        self, db: AsyncSession, request: SellerMetricsRequest
    ) -> SellerMetricsResponse:
        try:
            return await self.dashboard_service.get_seller_metrics(
                db=db, request=request
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_aade_documents(
        self, db: AsyncSession, request: AadeDocumentsRequest
    ) -> AadeDocumentsResponse:
        try:
            return await self.dashboard_service.get_aade_documents(
                db=db, request=request
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_aade_summary(
        self, db: AsyncSession, buyer_id: str
    ) -> AadeSummaryResponse:
        try:
            return await self.dashboard_service.get_aade_summary(
                db=db, buyer_id=buyer_id
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


def get_dashboard_controller() -> DashboardController:
    return DashboardController(get_dashboard_service())
