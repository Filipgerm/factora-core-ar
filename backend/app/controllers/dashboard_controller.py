"""DashboardController — orchestrates dashboard service calls and translates exceptions."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, List

from fastapi import HTTPException

from app.core.exceptions import AppError
from app.db.models.aade import AadeInvoiceModel
from app.db.models.banking import Transaction
from app.db.models.invoices import Invoice
from app.models.dashboard import (
    AadeDocumentsRequest,
    AadeDocumentsResponse,
    AadeInvoiceItem,
    AadeSummaryResponse,
    DashboardMetricsRequest,
    DashboardMetricsResponse,
    PartySummary,
    SellerMetricsRequest,
    SellerMetricsResponse,
    TransactionsRequest,
    TransactionsResponse,
)
from app.services.dashboard_service import DashboardService


class DashboardController:
    """Orchestrates dashboard service calls and translates exceptions to HTTPExceptions."""

    def __init__(self, dashboard_service: DashboardService) -> None:
        self.dashboard_service = dashboard_service

    # ------------------------------------------------------------------
    # Private Mapping Helpers
    # ------------------------------------------------------------------

    def _map_transaction_to_response(self, tx: Transaction) -> TransactionsResponse:
        """Helper to map a Transaction ORM model to a TransactionsResponse DTO."""
        return TransactionsResponse(
            id=tx.id,
            account_id=tx.account_id,
            status=tx.status.value if hasattr(tx.status, "value") else tx.status,
            made_on=tx.made_on,
            posted_date=tx.extra.get("posting_date") if tx.extra else None,
            amount=float(tx.amount),
            currency_code=tx.currency_code,
            category=tx.category or "",
            merchant_id=tx.extra.get("merchant_id") if tx.extra else None,
            mcc=tx.extra.get("mcc") if tx.extra else None,
            description=tx.description or "",
            iban=tx.extra.get("iban") if tx.extra else None,
        )

    def _map_invoice_to_item(
        self, aade: AadeInvoiceModel, unified: Invoice
    ) -> AadeInvoiceItem:
        """Map an ``(aade, unified)`` pair to an ``AadeInvoiceItem`` DTO.

        AADE-specific fields (direction header, VAT breakdown) come from
        the mirror; canonical financial fields (issue_date, currency,
        gross total) come from the unified ``invoices`` row so the API
        response stays consistent with every other AR/AP surface.
        """
        return AadeInvoiceItem(
            id=aade.id,
            document_id=aade.document_id,
            uid=aade.uid,
            mark=aade.mark,
            authentication_code=aade.authentication_code,
            issuer_vat=aade.issuer_vat,
            issuer_country=aade.issuer_country,
            issuer_branch=aade.issuer_branch,
            counterpart_vat=aade.counterpart_vat,
            counterpart_country=aade.counterpart_country,
            counterpart_branch=aade.counterpart_branch,
            series=aade.series,
            aa=aade.aa,
            issue_date=unified.issue_date,
            invoice_type=aade.invoice_type,
            currency=unified.currency,
            total_net_value=aade.total_net_value,
            total_vat_amount=aade.total_vat_amount,
            total_gross_value=unified.amount,
            created_at=aade.created_at,
        )

    def _map_party_summary(self, row: Any) -> PartySummary:
        """Helper to map a raw SQLAlchemy breakdown row to a PartySummary DTO."""
        return PartySummary(
            vat=row.vat,
            invoice_count=row.invoice_count,
            total_net_value_sum=row.total_net_value_sum,
            total_vat_amount_sum=row.total_vat_amount_sum,
            total_gross_value_sum=row.total_gross_value_sum,
        )

    # ------------------------------------------------------------------
    # Public Controller Methods
    # ------------------------------------------------------------------

    async def get_dashboard_pl_metrics(
        self, request: DashboardMetricsRequest
    ) -> DashboardMetricsResponse:
        """Return P&L metrics for a customer over the requested time window."""
        # Apply Business Logic for Defaults
        if not request.start_date and not request.end_date:
            request.end_date = date.today()
            request.start_date = request.end_date - timedelta(days=request.days or 30)

        if (
            request.start_date
            and request.end_date
            and request.start_date > request.end_date
        ):
            raise HTTPException(
                status_code=400, detail="start_date must be <= end_date"
            )

        try:
            raw_metrics = await self.dashboard_service.get_dashboard_pl_metrics(request)
            return DashboardMetricsResponse(**raw_metrics)
        except (HTTPException, AppError):
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_transaction_history(
        self, request: TransactionsRequest
    ) -> List[TransactionsResponse]:
        """Return filtered, paginated transaction history for a customer."""
        try:
            transactions = await self.dashboard_service.get_transaction_history(request)
            return [self._map_transaction_to_response(tx) for tx in transactions]
        except (HTTPException, AppError):
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_seller_metrics(
        self, request: SellerMetricsRequest
    ) -> SellerMetricsResponse:
        """Return aggregate metrics for an organization (counterparties, active alerts)."""
        try:
            counterparties, alerts = await self.dashboard_service.get_seller_metrics()
            return SellerMetricsResponse(
                total_counterparties=counterparties,
                total_active_alerts=alerts,
            )
        except (HTTPException, AppError):
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_aade_documents(
        self, request: AadeDocumentsRequest
    ) -> AadeDocumentsResponse:
        """Return paginated AADE invoices for an organization with optional filters."""
        try:
            invoices, total = await self.dashboard_service.get_aade_documents(request)
            invoice_items = [
                self._map_invoice_to_item(aade, unified)
                for aade, unified in invoices
            ]

            return AadeDocumentsResponse(
                invoices=invoice_items,
                total=total,
                limit=request.limit,
                offset=request.offset,
            )
        except (HTTPException, AppError):
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    async def get_aade_summary(self) -> AadeSummaryResponse:
        """Return aggregated AADE invoice statistics for an organization."""
        try:
            (
                net_sum,
                vat_sum,
                gross_sum,
                sup_count,
                cust_count,
                cust_breakdown_rows,
                sup_breakdown_rows,
            ) = await self.dashboard_service.get_aade_summary()

            return AadeSummaryResponse(
                total_net_value_sum=net_sum,
                total_vat_amount_sum=vat_sum,
                total_gross_value_sum=gross_sum,
                supplier_count=sup_count,
                customer_count=cust_count,
                customer_breakdown=[
                    self._map_party_summary(row) for row in cust_breakdown_rows
                ],
                supplier_breakdown=[
                    self._map_party_summary(row) for row in sup_breakdown_rows
                ],
            )
        except (HTTPException, AppError):
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
