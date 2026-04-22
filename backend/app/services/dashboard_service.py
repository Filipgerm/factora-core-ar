from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Sequence

from sqlalchemy import String, and_, case, cast, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError, NotFoundError
from app.db.models.aade import AadeInvoiceModel, InvoiceDirection
from app.db.models.alerts import Alert
from app.db.models.banking import (
    BankAccountModel,
    ConnectionModel,
    CustomerModel,
    Transaction,
    TransactionMode,
    TransactionStatus,
)
from app.db.models.invoices import Invoice, InvoiceSource
from app.models.dashboard import (
    AadeDocumentsRequest,
    DashboardMetricsRequest,
    PartySummary,
    TransactionsRequest,
)

logger = logging.getLogger(__name__)


class DashboardService:
    """Computes dashboard metrics from the DB, scoped by organization_id."""

    def __init__(self, db: AsyncSession, organization_id: str) -> None:
        self.db = db
        self.organization_id = organization_id

    async def _ensure_customer_belongs_to_org(self, customer_id: str) -> None:
        """Raise NotFoundError if customer_id does not belong to self.organization_id."""
        result = await self.db.execute(
            select(CustomerModel.id).where(
                CustomerModel.id == customer_id,
                CustomerModel.organization_id == self.organization_id,
            )
        )
        if not result.scalar_one_or_none():
            raise NotFoundError(
                "Customer not found or access denied.",
                code="resource.not_found",
            )

    async def get_dashboard_pl_metrics(
        self, request: DashboardMetricsRequest
    ) -> Dict[str, Any]:
        await self._ensure_customer_belongs_to_org(request.customer_id)
        start_date, end_date = self._resolve_window(request=request)
        period_days = (end_date - start_date).days + 1

        try:
            # Totals
            net_cash_flow = await self.get_net_cash_flow(
                db=self.db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            total_revenue = await self.get_total_revenue(
                db=self.db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            total_expenses = await self.get_total_expenses(
                db=self.db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            net_income = await self.get_net_income(
                db=self.db, revenue=total_revenue, expenses=total_expenses
            )
            average_margin = await self.get_average_margin(
                db=self.db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )

            # Balance & currency from accounts (MVP: sum all EUR accounts for customer)
            balance, currency = await self._get_balance_and_currency(
                db=self.db, customer_id=request.customer_id, currency=request.currency
            )

            # Monthly aggregations — fetch revenue and expenses once, then derive
            # net_income and margin from those pre-computed lists to avoid 4 extra
            # round-trips to the DB.
            monthly_revenue = await self.get_monthly_revenue(
                db=self.db,
                customer_id=request.customer_id,
                start_date=start_date,
                end_date=end_date,
                currency=request.currency,
            )
            monthly_expenses = await self.get_monthly_expenses(
                db=self.db,
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

            return {
                "net_cash_flow": round(net_cash_flow, 2),
                "total_revenue": round(total_revenue, 2),
                "total_expenses": round(total_expenses, 2),
                "net_income": round(net_income, 2),
                "average_margin": average_margin,
                "balance": round(balance, 2),
                "currency": currency,
                "period_days": period_days,
                "monthly_revenue": monthly_revenue,
                "monthly_expenses": monthly_expenses,
                "monthly_net_income": monthly_net_income,
                "monthly_margin": monthly_margin,
            }

        except Exception as e:
            logger.error("Dashboard P&L metrics error: %s", e)
            raise ExternalServiceError(
                f"Failed to compute P&L metrics: {str(e)}", code="dashboard.error"
            )

    async def get_seller_metrics(self) -> Tuple[int, int]:
        """Get metrics for an organization: total counterparties and active alerts."""
        from app.db.models.counterparty import Counterparty

        counterparty_result = await self.db.execute(
            select(func.count(Counterparty.id)).where(
                Counterparty.organization_id == self.organization_id,
                Counterparty.deleted_at.is_(None),
            )
        )
        total_counterparties = counterparty_result.scalar_one()

        alerts_result = await self.db.execute(
            select(func.count(Alert.id)).where(
                Alert.organization_id == self.organization_id,
                Alert.resolved_at.is_(None),
            )
        )
        total_active_alerts = alerts_result.scalar_one()

        return total_counterparties, total_active_alerts

    async def get_transaction_history(
        self, request: TransactionsRequest,
    ) -> Sequence[Transaction]:
        """Get detailed transaction history with filtering and pagination."""
        await self._ensure_customer_belongs_to_org(request.customer_id)

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
        result = await self.db.execute(query)
        return result.scalars().all()

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
        """Return the net cash flow (sum of all signed amounts) for the period.

        Includes ``normal`` and ``fee`` mode transactions. Transfers are currently
        included but should be reviewed before production use.

        Args:
            db: Async database session.
            customer_id: Internal customer identifier to scope transactions.
            start_date: Inclusive start of the reporting window.
            end_date: Inclusive end of the reporting window.
            currency: ISO-4217 currency code used to filter accounts.

        Returns:
            Net cash flow as a float (positive = inflow, negative = outflow).
        """
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
        """Return total revenue (sum of positive transaction amounts) for the period.

        Only ``mode='normal'`` transactions are included.

        Args:
            db: Async database session.
            customer_id: Internal customer identifier to scope transactions.
            start_date: Inclusive start of the reporting window.
            end_date: Inclusive end of the reporting window.
            currency: ISO-4217 currency code used to filter accounts.

        Returns:
            Total revenue as a non-negative float.
        """

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
        """Return total expenses (absolute sum of negative transaction amounts) for the period.

        Only ``mode='normal'`` transactions are included.

        Args:
            db: Async database session.
            customer_id: Internal customer identifier to scope transactions.
            start_date: Inclusive start of the reporting window.
            end_date: Inclusive end of the reporting window.
            currency: ISO-4217 currency code used to filter accounts.

        Returns:
            Total expenses as a non-negative float (absolute value of outflows).
        """
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
        """Compute net income as revenue minus expenses.

        Args:
            db: Unused; kept for interface consistency with other metric methods.
            revenue: Pre-computed total revenue (non-negative float).
            expenses: Pre-computed total expenses (non-negative absolute float).

        Returns:
            Net income as ``revenue - expenses``.
        """
        return float(revenue) - float(expenses)

    async def get_average_margin(
        self,
        db: AsyncSession,
        customer_id: str,
        start_date: date,
        end_date: date,
        currency: str,
    ) -> float | None:
        """Return the profit margin percentage for the period.

        MVP: returns ``None`` because COGS data is not yet available.
        Future implementation should compute ``(revenue - cogs) / revenue``
        guarded for division-by-zero.

        Args:
            db: Async database session.
            customer_id: Internal customer identifier to scope transactions.
            start_date: Inclusive start of the reporting window.
            end_date: Inclusive end of the reporting window.
            currency: ISO-4217 currency code used to filter accounts.

        Returns:
            ``None`` (MVP placeholder).
        """
        return None

    async def _get_balance_and_currency(
        self, db: AsyncSession, customer_id: str, currency: str
    ) -> Tuple[float, str]:
        """Aggregate the total balance across all of a customer's accounts.

        MVP: sums balances for accounts in the requested currency only.
        Multi-currency conversion is not yet implemented.

        Args:
            db: Async database session.
            customer_id: Internal customer identifier to scope accounts.
            currency: ISO-4217 currency code to filter accounts.

        Returns:
            Tuple of ``(total_balance, currency_code)``; currency defaults to
            the requested ``currency`` if no matching accounts are found.
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
        """Aggregate revenue by calendar month within the reporting window.

        Args:
            db: Async database session.
            customer_id: Internal customer identifier to scope transactions.
            start_date: Inclusive start of the reporting window.
            end_date: Inclusive end of the reporting window.
            currency: ISO-4217 currency code used to filter accounts.

        Returns:
            List of ``{"month": "YYYY-MM", "value": float}`` dicts sorted ascending.
        """
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
        """Aggregate expenses by calendar month within the reporting window.

        Args:
            db: Async database session.
            customer_id: Internal customer identifier to scope transactions.
            start_date: Inclusive start of the reporting window.
            end_date: Inclusive end of the reporting window.
            currency: ISO-4217 currency code used to filter accounts.

        Returns:
            List of ``{"month": "YYYY-MM", "value": float}`` dicts with absolute
            (non-negative) values sorted descending by default.
        """
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

    # ------------------------------------------------------------------
    # AADE dashboard queries
    # ------------------------------------------------------------------
    #
    # Reads go through the unified ``invoices`` table so AR/AP dashboards
    # see the same canonical row regardless of source. AADE-specific columns
    # (direction, VAT breakdown, uid/mark) are still joined from
    # ``aade_invoices`` because they are Greek-tax-domain concerns that do
    # not belong on the generic ``Invoice`` contract.
    #
    # Join key: ``Invoice.external_id = CAST(AadeInvoiceModel.mark AS VARCHAR)``
    # with ``COALESCE(mark::text, uid)`` to cover invoices without a mark.
    # Step 4 swaps this for a proper ``invoice_id`` FK; the behaviour stays
    # identical so dashboards do not need another pass after the migration.

    @staticmethod
    def _aade_external_id():
        """Expression that mirrors ``AadeInvoiceBridgeService._external_id``."""
        return func.coalesce(cast(AadeInvoiceModel.mark, String), AadeInvoiceModel.uid)

    @classmethod
    def _aade_join(cls):
        return Invoice.external_id == cls._aade_external_id()

    def _aade_base_select(self, *entities):
        """Return a ``SELECT`` tuple over unified invoices ⨝ AADE mirror."""
        return (
            select(*entities)
            .join(
                AadeInvoiceModel,
                and_(
                    AadeInvoiceModel.organization_id == Invoice.organization_id,
                    self._aade_join(),
                ),
            )
            .where(
                Invoice.organization_id == self.organization_id,
                Invoice.source == InvoiceSource.AADE,
                Invoice.deleted_at.is_(None),
            )
        )

    @staticmethod
    def _apply_invoice_filters(query, request: "AadeDocumentsRequest"):
        """Apply optional AadeDocumentsRequest filters to any SQLAlchemy select.

        Date filters target ``Invoice.issue_date`` (the canonical date on
        the unified row); AADE-specific filters (``invoice_type``,
        ``issuer_vat``, ``counterpart_vat``) still target the AADE mirror.
        """
        if request.date_from:
            query = query.where(Invoice.issue_date >= request.date_from)
        if request.date_to:
            query = query.where(Invoice.issue_date <= request.date_to)
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
        self, request: AadeDocumentsRequest
    ) -> Tuple[Sequence[Tuple[AadeInvoiceModel, Invoice]], int]:
        """Paginated AADE invoices with filtering, sourced from unified invoices.

        Returns ``((aade_row, unified_row), total)`` tuples so the controller
        can map AADE-specific fields from one side and financial fields
        (issue_date, currency, amount) from the unified side.
        """
        base = self._aade_base_select(AadeInvoiceModel, Invoice)
        base = self._apply_invoice_filters(base, request)

        count_query = self._aade_base_select(func.count(Invoice.id))
        count_query = self._apply_invoice_filters(count_query, request)

        total = (await self.db.execute(count_query)).scalar_one() or 0

        base = base.order_by(
            Invoice.issue_date.desc().nulls_last(),
            Invoice.created_at.desc(),
        ).offset(request.offset).limit(request.limit)

        rows = (await self.db.execute(base)).all()
        pairs: List[Tuple[AadeInvoiceModel, Invoice]] = [
            (row[0], row[1]) for row in rows
        ]
        return pairs, total

    async def get_aade_summary(
        self,
    ) -> Tuple[Decimal, Decimal, Decimal, int, int, List[Any], List[Any]]:
        """
        Get aggregated statistics for all AADE invoices of the organization.

        Returns:
            AadeSummaryResponse: Aggregated statistics including totals, counts, and breakdowns
        """
        (
            total_net_value_sum,
            total_vat_amount_sum,
            total_gross_value_sum,
        ) = await self._get_totals(self.db, self.organization_id)

        supplier_count = await self._get_party_count(
            self.db,
            organization_id=self.organization_id,
            direction=InvoiceDirection.RECEIVED,
            vat_column=AadeInvoiceModel.issuer_vat,
        )

        customer_count = await self._get_party_count(
            self.db,
            organization_id=self.organization_id,
            direction=InvoiceDirection.TRANSMITTED,
            vat_column=AadeInvoiceModel.counterpart_vat,
        )

        customer_breakdown = await self._get_party_breakdown(
            self.db,
            organization_id=self.organization_id,
            direction=InvoiceDirection.TRANSMITTED,
            vat_column=AadeInvoiceModel.counterpart_vat,
            is_supplier=False,
        )

        supplier_breakdown = await self._get_party_breakdown(
            self.db,
            organization_id=self.organization_id,
            direction=InvoiceDirection.RECEIVED,
            vat_column=AadeInvoiceModel.issuer_vat,
            is_supplier=True,
        )

        return (
            total_net_value_sum,
            total_vat_amount_sum,
            total_gross_value_sum,
            supplier_count,
            customer_count,
            customer_breakdown,
            supplier_breakdown,
        )

    # ---------- helpers ----------

    def _signed_expr(self, column):
        """Return a direction-aware signed expression for a numeric column.

        Direction still lives on the AADE mirror; the signed expression is
        reused for both VAT columns (on AADE) and the gross total (on the
        unified ``Invoice``) so all three sums share one accounting rule.
        """
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
        self, db: AsyncSession, organization_id: str
    ) -> Tuple[Decimal, Decimal, Decimal]:
        """Compute global direction-aware totals across AADE invoices for an org.

        Net / VAT breakdown are AADE-specific and come from the mirror;
        gross total flows from the unified ``Invoice.amount`` so it stays
        consistent with every other AR/AP dashboard downstream.
        """
        signed_net = self._signed_expr(AadeInvoiceModel.total_net_value)
        signed_vat = self._signed_expr(AadeInvoiceModel.total_vat_amount)
        signed_gross = self._signed_expr(Invoice.amount)

        totals_query = self._aade_base_select(
            func.coalesce(func.sum(signed_net), 0).label("total_net_value_sum"),
            func.coalesce(func.sum(signed_vat), 0).label("total_vat_amount_sum"),
            func.coalesce(func.sum(signed_gross), 0).label("total_gross_value_sum"),
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
        organization_id: str,
        direction: InvoiceDirection,
        vat_column,
    ) -> int:
        """Count distinct counterpart/supplier VATs for a given direction."""
        query = self._aade_base_select(func.count(distinct(vat_column))).where(
            AadeInvoiceModel.direction == direction,
            vat_column.isnot(None),
        )
        result = await db.execute(query)
        return result.scalar_one() or 0

    async def _get_party_breakdown(
        self,
        db: AsyncSession,
        organization_id: str,
        direction: InvoiceDirection,
        vat_column,
        is_supplier: bool,
    ) -> List[PartySummary]:
        """Per-party breakdown (customer for TRANSMITTED, supplier for RECEIVED).

        Invoice count and gross total are taken from the unified ``Invoice``
        table; net / VAT breakdown from the AADE mirror (Greek-tax-specific).
        """
        breakdown_query = (
            self._aade_base_select(
                vat_column.label("vat"),
                func.count(Invoice.id).label("invoice_count"),
                func.coalesce(func.sum(AadeInvoiceModel.total_net_value), 0).label(
                    "total_net_value_sum"
                ),
                func.coalesce(func.sum(AadeInvoiceModel.total_vat_amount), 0).label(
                    "total_vat_amount_sum"
                ),
                func.coalesce(func.sum(Invoice.amount), 0).label(
                    "total_gross_value_sum"
                ),
            )
            .where(AadeInvoiceModel.direction == direction)
            .group_by(vat_column)
            .order_by(func.sum(Invoice.amount).desc())
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
