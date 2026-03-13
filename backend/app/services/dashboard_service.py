from __future__ import annotations
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException
from datetime import date, datetime, timedelta, timezone
from packages.saltedge.errors import ApiError, NetworkError
from app.models.dashboard import (
    DashboardMetricsResponse,
    DashboardMetricsRequest,
    TransactionsRequest,
    TransactionsResponse,
    SellerMetricsRequest,
    SellerMetricsResponse,
    AadeDocumentsRequest,
    AadeDocumentsResponse,
    AadeInvoiceItem,
    AadeSummaryResponse,
    PartySummary,
)
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, and_, distinct
from decimal import Decimal

from app.db.database_models import Transaction, TransactionStatus, TransactionMode
from app.db.database_models import BankAccountModel, ConnectionModel
from app.db.database_models import Sellers, Buyers, SellerBuyers, Alerts
from app.db.database_models import AadeInvoiceModel, AadeDocumentModel, InvoiceDirection


class DashboardService:
    """DB session is injected per-call."""

    async def get_dashboard_pl_metrics(
        self, db: AsyncSession, request: DashboardMetricsRequest
    ) -> DashboardMetricsResponse:
        start_date, end_date = self._resolve_window(request=request)
        period_days = (end_date - start_date).days + 1

        try:
            # Totals
            net_cash_flow = await self.get_net_cash_flow(
                db=db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            total_revenue = await self.get_total_revenue(
                db=db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            total_expenses = await self.get_total_expenses(
                db=db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            net_income = await self.get_net_income(
                db=db, revenue=total_revenue, expenses=total_expenses
            )
            average_margin = await self.get_average_margin(
                db=db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )

            # Balance & currency from accounts (MVP: sum all EUR accounts for customer)
            balance, currency = await self._get_balance_and_currency(
                db=db, customer_id=request.customer_id, currency=request.currency
            )

            # Monthly aggregations — fetch revenue and expenses once, then derive
            # net_income and margin from those pre-computed lists to avoid 4 extra
            # round-trips to the DB.
            monthly_revenue = await self.get_monthly_revenue(
                db=db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            monthly_expenses = await self.get_monthly_expenses(
                db=db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            monthly_net_income = self._compute_monthly_net_income(
                monthly_revenue=monthly_revenue,
                monthly_expenses=monthly_expenses,
            )
            monthly_margin = self._compute_monthly_margin(
                monthly_revenue=monthly_revenue,
                monthly_expenses=monthly_expenses,
            )

            return DashboardMetricsResponse(
                net_cash_flow=round(net_cash_flow, 2),
                total_revenue=round(total_revenue, 2),
                total_expenses=round(total_expenses, 2),
                net_income=round(net_income, 2),
                average_margin=average_margin,
                balance=round(balance, 2),
                currency=currency,
                period_days=period_days,
                monthly_revenue=monthly_revenue,
                monthly_expenses=monthly_expenses,
                monthly_net_income=monthly_net_income,
                monthly_margin=monthly_margin,
            )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Internal server error: {str(e)}"
            ) from e

    async def get_seller_metrics(
        self, db: AsyncSession, request: SellerMetricsRequest
    ) -> SellerMetricsResponse:
        """Get metrics for a seller: completed customers, pending customers, active alerts."""

        # Total completed customers (buyers with onboarding complete)
        completed_query = (
            select(func.count(Buyers.id))
            .select_from(Buyers)
            .join(SellerBuyers, SellerBuyers.buyer_id == Buyers.id)
            .where(
                SellerBuyers.seller_id == request.seller_id,
                Buyers.is_onboarding_complete == True,
            )
        )
        completed_result = await db.execute(completed_query)
        total_completed_customers = completed_result.scalar_one()

        # Total pending customers (buyers with onboarding not complete)
        pending_query = (
            select(func.count(Buyers.id))
            .select_from(Buyers)
            .join(SellerBuyers, SellerBuyers.buyer_id == Buyers.id)
            .where(
                SellerBuyers.seller_id == request.seller_id,
                Buyers.is_onboarding_complete == False,
            )
        )
        pending_result = await db.execute(pending_query)
        total_pending_customers = pending_result.scalar_one()

        # Total active alerts (alerts for this seller's buyers)
        alerts_query = (
            select(func.count(Alerts.id))
            .select_from(Alerts)
            .join(Buyers, Buyers.id == Alerts.business_id)
            .join(SellerBuyers, SellerBuyers.buyer_id == Buyers.id)
            .where(SellerBuyers.seller_id == request.seller_id)
        )
        alerts_result = await db.execute(alerts_query)
        total_active_alerts = alerts_result.scalar_one()

        return SellerMetricsResponse(
            total_completed_customers=total_completed_customers,
            total_pending_customers=total_pending_customers,
            total_active_alerts=total_active_alerts,
        )

    async def get_transaction_history(
        self, db: AsyncSession, request: TransactionsRequest
    ) -> List[TransactionsResponse]:
        """Get detailed transaction history with filtering and pagination."""

        # Build base query
        query = (
            select(Transaction)
            .join(BankAccountModel, BankAccountModel.id == Transaction.account_id)
            .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
            .where(ConnectionModel.customer_id == request.customer_id)
        )

        # Apply filters
        if request.account_id:
            query = query.where(Transaction.account_id == request.account_id)

        if request.status:
            query = query.where(Transaction.status == request.status)

        if request.start_date:
            query = query.where(Transaction.made_on >= request.start_date)

        if request.end_date:
            query = query.where(Transaction.made_on <= request.end_date)

        if request.min_amount is not None:
            query = query.where(Transaction.amount >= request.min_amount)

        if request.max_amount is not None:
            query = query.where(Transaction.amount <= request.max_amount)

        if request.currency_code:
            query = query.where(Transaction.currency_code == request.currency_code)

        if request.category:
            query = query.where(Transaction.category == request.category)

        if request.merchant_id:
            # merchant_id lives in the JSONB extra column, not a direct column
            query = query.where(
                Transaction.extra["merchant_id"].astext == request.merchant_id
            )

        if request.mcc:
            # mcc lives in the JSONB extra column, not a direct column
            query = query.where(Transaction.extra["mcc"].astext == str(request.mcc))

        # Apply ordering (newest first by default, transaction id is the tie breaker)
        query = query.order_by(Transaction.made_on.desc(), Transaction.id.desc())

        # Apply pagination
        if request.limit:
            query = query.limit(request.limit)

        # Execute query
        result = await db.execute(query)
        transactions = result.scalars().all()

        # Convert to response model
        return [
            TransactionsResponse(
                id=tx.id,
                account_id=tx.account_id,
                status=tx.status.value,
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
            for tx in transactions
        ]

    # ---------- helpers ----------

    def _resolve_window(self, request: DashboardMetricsRequest) -> Tuple[date, date]:
        if request.start_date and request.end_date:
            return request.start_date, request.end_date
        end = request.end_date or date.today()
        start = request.start_date or (end - timedelta(days=request.days or 30))
        if start > end:
            # Let controller return 400 in route; here we still guard
            start, end = end, start
        return start, end

    def _base_tx_filters(
        self, customer_id: str, start_date: date, end_date: date, currency: str
    ):
        return and_(
            Transaction.status == TransactionStatus.posted,
            Transaction.duplicated.is_(False),
            Transaction.mode
            != TransactionMode.transfer,  # Internal Trasnfers. To be decided if we want to include them in the P & L metrics
            # Transaction.currency_code == currency, # Maybe redundant with currency in request in MVP. If transactions are in different currencies, we need to convert them to the reporting currency.
            Transaction.made_on >= start_date,
            Transaction.made_on <= end_date,
            # Join condition to restrict to this customer's accounts will be applied in the query
        )

    # ---------- metric functions ----------

    async def get_net_cash_flow(
        self,
        db: AsyncSession,
        customer_id: str,
        start_date: date,
        end_date: date,
        currency: str,
    ) -> float:
        """Sum of signed amounts (normal + fee, transfers also included for now, but to be further examined)."""
        filters = self._base_tx_filters(customer_id, start_date, end_date, currency)

        q = (
            select(func.coalesce(func.sum(Transaction.amount), 0))
            .select_from(Transaction)
            .join(BankAccountModel, BankAccountModel.id == Transaction.account_id)
            .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
            .where(filters, ConnectionModel.customer_id == customer_id)
        )
        res = await db.execute(q)
        return float(res.scalar_one() or 0)

    async def get_total_revenue(
        self,
        db: AsyncSession,
        customer_id: str,
        start_date: date,
        end_date: date,
        currency: str,
    ) -> float:
        f"""Sum of positive amounts (inflows) in the period, mode='normal' -> (to be discussed) ."""

        filters = self._base_tx_filters(customer_id, start_date, end_date, currency)

        revenue_expr = case((Transaction.amount > 0, Transaction.amount), else_=0)
        q = (
            select(func.coalesce(func.sum(revenue_expr), 0))
            .select_from(Transaction)
            .join(BankAccountModel, BankAccountModel.id == Transaction.account_id)
            .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
            .where(
                filters,
                ConnectionModel.customer_id == customer_id,
                Transaction.mode == TransactionMode.normal,
            )
        )
        res = await db.execute(q)
        return float(res.scalar_one() or 0)

    async def get_total_expenses(
        self,
        db: AsyncSession,
        customer_id: str,
        start_date: date,
        end_date: date,
        currency: str,
    ) -> float:
        """ABS(sum of negative amounts) with mode='normal'-> (to be discussed) ."""
        filters = self._base_tx_filters(customer_id, start_date, end_date, currency)

        expenses_expr = case((Transaction.amount < 0, Transaction.amount), else_=0)
        q = (
            select(func.coalesce(func.sum(expenses_expr), 0))
            .select_from(Transaction)
            .join(BankAccountModel, BankAccountModel.id == Transaction.account_id)
            .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
            .where(
                filters,
                ConnectionModel.customer_id == customer_id,
                Transaction.mode == TransactionMode.normal,
            )
        )
        res = await db.execute(q)
        val = float(res.scalar_one() or 0)
        return abs(val)

    async def get_net_income(
        self, db: AsyncSession, revenue: float, expenses: float
    ) -> float:
        """Net income = revenue − expenses (expenses already absolute)."""
        return float(revenue) - float(expenses)

    async def get_average_margin(
        self,
        db: AsyncSession,
        customer_id: str,
        start_date: date,
        end_date: date,
        currency: str,
    ) -> float:
        """Calculate profit margin percentage

        MVP: return None (no COGS). If you later add a `cogs_amount` per txn (or cost basis),
        compute (revenue - cogs) / revenue guarded for division-by-zero.
        """
        return None

    async def _get_balance_and_currency(
        self, db: AsyncSession, customer_id: str, currency: str
    ) -> Tuple[float, str]:
        """
        MVP: sum balances of this customer's accounts in the requested currency (EUR).
        """
        q = (
            select(
                func.coalesce(func.sum(BankAccountModel.balance), 0),
                func.min(
                    BankAccountModel.currency_code
                ),  # convenient way to retrieve a representative currency value (all accounts have the same currency in MVP).
            )
            .select_from(BankAccountModel)
            .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
            .where(
                ConnectionModel.customer_id == customer_id,
                BankAccountModel.currency_code == currency,
            )
        )
        res = await db.execute(q)
        total_balance, cur = res.one()
        return float(total_balance or 0), cur or currency

    async def get_monthly_revenue(
        self,
        db: AsyncSession,
        customer_id: str,
        start_date: date,
        end_date: date,
        currency: str,
    ) -> List[Dict[str, Any]]:
        """Aggregate revenue by calendar month."""
        filters = self._base_tx_filters(customer_id, start_date, end_date, currency)

        revenue_expr = case((Transaction.amount > 0, Transaction.amount), else_=0)
        q = (
            select(
                func.extract("year", Transaction.made_on).label("year"),
                func.extract("month", Transaction.made_on).label("month"),
                func.coalesce(func.sum(revenue_expr), 0).label("value"),
            )
            .select_from(Transaction)
            .join(BankAccountModel, BankAccountModel.id == Transaction.account_id)
            .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
            .where(
                filters,
                ConnectionModel.customer_id == customer_id,
                Transaction.mode == TransactionMode.normal,
            )
            .group_by(
                func.extract("year", Transaction.made_on),
                func.extract("month", Transaction.made_on),
            )
            .order_by(
                func.extract("year", Transaction.made_on),
                func.extract("month", Transaction.made_on),
            )
        )
        res = await db.execute(q)
        results = res.all()
        return [
            {
                "month": f"{int(row.year)}-{int(row.month):02d}",
                "value": round(float(row.value), 2),
            }
            for row in results
        ]

    async def get_monthly_expenses(
        self,
        db: AsyncSession,
        customer_id: str,
        start_date: date,
        end_date: date,
        currency: str,
    ) -> List[Dict[str, Any]]:
        """Aggregate expenses by calendar month."""
        filters = self._base_tx_filters(customer_id, start_date, end_date, currency)

        expenses_expr = case((Transaction.amount < 0, Transaction.amount), else_=0)
        q = (
            select(
                func.extract("year", Transaction.made_on).label("year"),
                func.extract("month", Transaction.made_on).label("month"),
                func.coalesce(func.sum(expenses_expr), 0).label("value"),
            )
            .select_from(Transaction)
            .join(BankAccountModel, BankAccountModel.id == Transaction.account_id)
            .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
            .where(
                filters,
                ConnectionModel.customer_id == customer_id,
                Transaction.mode == TransactionMode.normal,
            )
            .group_by(
                func.extract("year", Transaction.made_on),
                func.extract("month", Transaction.made_on),
            )
            .order_by(
                func.extract("year", Transaction.made_on).desc(),
                func.extract("month", Transaction.made_on).desc(),
            )
        )
        res = await db.execute(q)
        results = res.all()
        return [
            {
                "month": f"{int(row.year)}-{int(row.month):02d}",
                "value": round(abs(float(row.value)), 2),
            }
            for row in results
        ]

    def _compute_monthly_net_income(
        self,
        monthly_revenue: List[Dict[str, Any]],
        monthly_expenses: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Derive net income per month from pre-computed revenue and expenses lists.

        Avoids issuing additional DB queries when both lists are already available.

        Args:
            monthly_revenue: Output of :meth:`get_monthly_revenue`.
            monthly_expenses: Output of :meth:`get_monthly_expenses`.

        Returns:
            List of ``{"month": "YYYY-MM", "value": float}`` dicts sorted by month.
        """
        revenue_dict = {item["month"]: item["value"] for item in monthly_revenue}
        expenses_dict = {item["month"]: item["value"] for item in monthly_expenses}
        all_months = sorted(set(revenue_dict.keys()) | set(expenses_dict.keys()))
        return [
            {
                "month": month,
                "value": round(
                    revenue_dict.get(month, 0) - expenses_dict.get(month, 0), 2
                ),
            }
            for month in all_months
        ]

    def _compute_monthly_margin(
        self,
        monthly_revenue: List[Dict[str, Any]],
        monthly_expenses: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Derive margin per month from pre-computed revenue and expenses lists.

        MVP: margin is always ``None``; reserved for future COGS-based calculation.

        Args:
            monthly_revenue: Output of :meth:`get_monthly_revenue`.
            monthly_expenses: Output of :meth:`get_monthly_expenses`.

        Returns:
            List of ``{"month": "YYYY-MM", "value": None}`` dicts sorted by month.
        """
        revenue_dict = {item["month"]: item["value"] for item in monthly_revenue}
        expenses_dict = {item["month"]: item["value"] for item in monthly_expenses}
        all_months = sorted(set(revenue_dict.keys()) | set(expenses_dict.keys()))
        return [{"month": month, "value": None} for month in all_months]

    @staticmethod
    def _apply_invoice_filters(query, request: "AadeDocumentsRequest"):
        """Apply optional AadeDocumentsRequest filters to any SQLAlchemy select.

        Centralises the five optional filter conditions so that the data query
        and the count query in :meth:`get_aade_documents` share a single source
        of truth.

        Args:
            query: A SQLAlchemy ``Select`` statement targeting ``AadeInvoiceModel``.
            request: The filter / pagination request object.

        Returns:
            The query with all applicable ``WHERE`` clauses appended.
        """
        if request.date_from:
            query = query.where(AadeInvoiceModel.issue_date >= request.date_from)
        if request.date_to:
            query = query.where(AadeInvoiceModel.issue_date <= request.date_to)
        if request.invoice_type:
            query = query.where(AadeInvoiceModel.invoice_type == request.invoice_type)
        if request.issuer_vat:
            query = query.where(AadeInvoiceModel.issuer_vat == request.issuer_vat)
        if request.counterpart_vat:
            query = query.where(
                AadeInvoiceModel.counterpart_vat == request.counterpart_vat
            )
        return query

    async def get_aade_documents(
        self, db: AsyncSession, request: AadeDocumentsRequest
    ) -> AadeDocumentsResponse:
        """
        Get AADE invoices with filtering and pagination.

        Args:
            db: Database session
            request: AadeDocumentsRequest with filters and pagination

        Returns:
            AadeDocumentsResponse with paginated invoice list
        """
        # Build base query - join invoices with documents to filter by buyer_id
        query = (
            select(AadeInvoiceModel)
            .join(
                AadeDocumentModel, AadeInvoiceModel.document_id == AadeDocumentModel.id
            )
            .where(AadeDocumentModel.buyer_id == request.buyer_id)
        )

        # Apply the same optional filters to both the data query and the count
        # query via a shared helper to avoid copy-pasting five conditions.
        query = self._apply_invoice_filters(query, request)

        count_query = (
            select(func.count(AadeInvoiceModel.id))
            .select_from(AadeInvoiceModel)
            .join(
                AadeDocumentModel,
                AadeInvoiceModel.document_id == AadeDocumentModel.id,
            )
            .where(AadeDocumentModel.buyer_id == request.buyer_id)
        )
        count_query = self._apply_invoice_filters(count_query, request)

        count_result = await db.execute(count_query)
        total = count_result.scalar_one()

        # Apply ordering (newest first by issue_date, then by created_at)
        query = query.order_by(
            AadeInvoiceModel.issue_date.desc().nulls_last(),
            AadeInvoiceModel.created_at.desc(),
        )

        # Apply pagination
        query = query.offset(request.offset).limit(request.limit)

        # Execute query
        result = await db.execute(query)
        invoices = result.scalars().all()

        # Convert to response model
        invoice_items = [
            AadeInvoiceItem(
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
            for inv in invoices
        ]

        return AadeDocumentsResponse(
            invoices=invoice_items,
            total=total,
            limit=request.limit,
            offset=request.offset,
        )

    async def get_aade_summary(
        self, db: AsyncSession, buyer_id: str
    ) -> AadeSummaryResponse:
        """
        Get aggregated statistics for all AADE invoices of a given buyer.

        Args:
            db: Database session
            buyer_id: Buyer ID to filter invoices

        Returns:
            AadeSummaryResponse: Aggregated statistics including totals, counts, and breakdowns
        """
        (
            total_net_value_sum,
            total_vat_amount_sum,
            total_gross_value_sum,
        ) = await self._get_totals(db, buyer_id)

        supplier_count = await self._get_party_count(
            db,
            buyer_id=buyer_id,
            direction=InvoiceDirection.RECEIVED,
            vat_column=AadeInvoiceModel.issuer_vat,
        )

        customer_count = await self._get_party_count(
            db,
            buyer_id=buyer_id,
            direction=InvoiceDirection.TRANSMITTED,
            vat_column=AadeInvoiceModel.counterpart_vat,
        )

        customer_breakdown = await self._get_party_breakdown(
            db,
            buyer_id=buyer_id,
            direction=InvoiceDirection.TRANSMITTED,
            vat_column=AadeInvoiceModel.counterpart_vat,
            is_supplier=False,
        )

        supplier_breakdown = await self._get_party_breakdown(
            db,
            buyer_id=buyer_id,
            direction=InvoiceDirection.RECEIVED,
            vat_column=AadeInvoiceModel.issuer_vat,
            is_supplier=True,
        )

        return AadeSummaryResponse(
            total_net_value_sum=total_net_value_sum,
            total_vat_amount_sum=total_vat_amount_sum,
            total_gross_value_sum=total_gross_value_sum,
            supplier_count=supplier_count,
            customer_count=customer_count,
            customer_breakdown=customer_breakdown,
            supplier_breakdown=supplier_breakdown,
        )

    # ---------- helpers ----------

    def _signed_expr(self, column):
        """Return a direction-aware signed expression for a numeric column."""
        return case(
            (
                AadeInvoiceModel.direction == InvoiceDirection.TRANSMITTED,
                func.coalesce(column, 0),
            ),
            (
                AadeInvoiceModel.direction == InvoiceDirection.RECEIVED,
                -func.coalesce(column, 0),
            ),
            else_=0,
        )

    async def _get_totals(
        self, db: AsyncSession, buyer_id: str
    ) -> Tuple[Decimal, Decimal, Decimal]:
        """Compute global direction-aware totals across all invoices for a buyer."""
        signed_net = self._signed_expr(AadeInvoiceModel.total_net_value)
        signed_vat = self._signed_expr(AadeInvoiceModel.total_vat_amount)
        signed_gross = self._signed_expr(AadeInvoiceModel.total_gross_value)

        totals_query = (
            select(
                func.coalesce(func.sum(signed_net), 0).label("total_net_value_sum"),
                func.coalesce(func.sum(signed_vat), 0).label("total_vat_amount_sum"),
                func.coalesce(func.sum(signed_gross), 0).label("total_gross_value_sum"),
            )
            .select_from(AadeInvoiceModel)
            .join(
                AadeDocumentModel,
                AadeInvoiceModel.document_id == AadeDocumentModel.id,
            )
            .where(AadeDocumentModel.buyer_id == buyer_id)
        )

        result = await db.execute(totals_query)
        row = result.one()

        return (
            Decimal(str(row.total_net_value_sum or 0)),
            Decimal(str(row.total_vat_amount_sum or 0)),
            Decimal(str(row.total_gross_value_sum or 0)),
        )

    async def _get_party_count(
        self,
        db: AsyncSession,
        buyer_id: str,
        direction: InvoiceDirection,
        vat_column,
    ) -> int:
        """Count distinct counterpart/supplier VATs for a given direction."""
        query = (
            select(func.count(distinct(vat_column)))
            .select_from(AadeInvoiceModel)
            .join(
                AadeDocumentModel,
                AadeInvoiceModel.document_id == AadeDocumentModel.id,
            )
            .where(
                and_(
                    AadeDocumentModel.buyer_id == buyer_id,
                    AadeInvoiceModel.direction == direction,
                    vat_column.isnot(None),
                )
            )
        )

        result = await db.execute(query)
        return result.scalar_one() or 0

    async def _get_party_breakdown(
        self,
        db: AsyncSession,
        buyer_id: str,
        direction: InvoiceDirection,
        vat_column,
        is_supplier: bool,
    ) -> List[PartySummary]:
        """
        Build per-party breakdown (customer or supplier) for a given direction.
        - direction=TRANSMITTED + vat_column=counterpart_vat → customers (income)
        - direction=RECEIVED + vat_column=issuer_vat → suppliers (expenses)
        """
        breakdown_query = (
            select(
                vat_column.label("vat"),
                func.count(AadeInvoiceModel.id).label("invoice_count"),
                func.coalesce(func.sum(AadeInvoiceModel.total_net_value), 0).label(
                    "total_net_value_sum"
                ),
                func.coalesce(func.sum(AadeInvoiceModel.total_vat_amount), 0).label(
                    "total_vat_amount_sum"
                ),
                func.coalesce(func.sum(AadeInvoiceModel.total_gross_value), 0).label(
                    "total_gross_value_sum"
                ),
            )
            .select_from(AadeInvoiceModel)
            .join(
                AadeDocumentModel,
                AadeInvoiceModel.document_id == AadeDocumentModel.id,
            )
            .where(
                and_(
                    AadeDocumentModel.buyer_id == buyer_id,
                    AadeInvoiceModel.direction == direction,
                )
            )
            .group_by(vat_column)
            .order_by(func.sum(AadeInvoiceModel.total_gross_value).desc())
        )

        result = await db.execute(breakdown_query)
        rows = result.all()

        return [
            PartySummary(
                vat=row.vat,
                invoice_count=row.invoice_count,
                total_net_value_sum=Decimal(str(row.total_net_value_sum or 0)),
                total_vat_amount_sum=Decimal(str(row.total_vat_amount_sum or 0)),
                total_gross_value_sum=Decimal(str(row.total_gross_value_sum or 0)),
            )
            for row in rows
        ]


"""Dependency injection for DashboardService"""


def get_dashboard_service() -> DashboardService:
    return DashboardService()
