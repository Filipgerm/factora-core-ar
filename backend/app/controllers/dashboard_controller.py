"""DashboardController — orchestrates dashboard service calls and translates exceptions."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, List

from fastapi import HTTPException

from app.config import settings
from app.core.demo import get_demo_payload
from app.core.exceptions import AppError
from app.db.models.aade import AadeInvoiceModel
from app.db.models.banking import Transaction
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

    def _map_invoice_to_item(self, inv: AadeInvoiceModel) -> AadeInvoiceItem:
        """Helper to map an AadeInvoiceModel ORM to an AadeInvoiceItem DTO."""
        return AadeInvoiceItem(
            id=inv.id,
            document_id=inv.document_id,
            uid=inv.uid,
            mark=inv.mark,
            authentication_code=inv.authentication_code,
            issuer_vat=inv.issuer_vat,
            issuer_country=inv.issuer_country,
            issuer_branch=inv.issuer_branch,
            counterpart_vat=inv.counterpart_vat,
            counterpart_country=inv.counterpart_country,
            counterpart_branch=inv.counterpart_branch,
            series=inv.series,
            aa=inv.aa,
            issue_date=inv.issue_date,
            invoice_type=inv.invoice_type,
            currency=inv.currency,
            total_net_value=inv.total_net_value,
            total_vat_amount=inv.total_vat_amount,
            total_gross_value=inv.total_gross_value,
            created_at=inv.created_at,
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
            if transactions and isinstance(transactions[0], dict):
                return [TransactionsResponse.model_validate(t) for t in transactions]
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

    @staticmethod
    def _filter_demo_aade_rows(
        rows: list[dict[str, Any]], request: AadeDocumentsRequest
    ) -> list[dict[str, Any]]:
        filtered: list[dict[str, Any]] = []
        for r in rows:
            raw_date = r.get("issue_date")
            inv_date = (
                raw_date
                if isinstance(raw_date, date)
                else date.fromisoformat(str(raw_date))
            )
            if request.date_from and inv_date < request.date_from:
                continue
            if request.date_to and inv_date > request.date_to:
                continue
            if request.invoice_type and r.get("invoice_type") != request.invoice_type:
                continue
            if request.issuer_vat and r.get("issuer_vat") != request.issuer_vat:
                continue
            if request.counterpart_vat and r.get("counterpart_vat") != request.counterpart_vat:
                continue
            filtered.append(r)
        return filtered

    async def get_aade_documents(
        self, request: AadeDocumentsRequest
    ) -> AadeDocumentsResponse:
        """Return paginated AADE invoices for an organization with optional filters."""
        try:
            if settings.demo_mode:
                blob = get_demo_payload("dashboard_aade_documents")
                all_rows = blob["invoices"]
                filtered = self._filter_demo_aade_rows(all_rows, request)
                total = len(filtered)
                page = filtered[request.offset : request.offset + request.limit]
                invoice_items = [AadeInvoiceItem.model_validate(r) for r in page]
                return AadeDocumentsResponse(
                    invoices=invoice_items,
                    total=total,
                    limit=request.limit,
                    offset=request.offset,
                )

            invoices, total = await self.dashboard_service.get_aade_documents(request)
            invoice_items = [self._map_invoice_to_item(inv) for inv in invoices]

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
            if settings.demo_mode:
                return AadeSummaryResponse.model_validate(
                    get_demo_payload("dashboard_aade_summary")
                )

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
