from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from models.financial import (
    Invoice, AccountReceivable, AccountPayable, FinancialMetrics,
    Customer, Supplier, PaymentStatus, InvoiceType
)
import asyncio
from collections import defaultdict


class FinancialDataService:
    """Service for retrieving and aggregating financial data"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.invoices_collection = db.invoices
        self.ar_collection = db.accounts_receivable
        self.ap_collection = db.accounts_payable
        self.customers_collection = db.customers
        self.suppliers_collection = db.suppliers
        self.metrics_collection = db.financial_metrics

    async def get_invoices_by_status(
        self,
        status: PaymentStatus,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Invoice]:
        """Get invoices filtered by status and date range"""
        query = {"status": status.value}

        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            query["invoice_date"] = date_filter

        cursor = self.invoices_collection.find(query)
        invoices = []
        async for doc in cursor:
            invoices.append(Invoice(**doc))
        return invoices

    async def get_overdue_invoices(self, days_threshold: int = 0) -> List[Invoice]:
        """Get invoices that are overdue by specified days"""
        today = date.today()
        query = {
            "status": {
                "$in": [PaymentStatus.PENDING.value, PaymentStatus.OVERDUE.value]
            },
            "due_date": {"$lt": today},
        }

        cursor = self.invoices_collection.find(query)
        overdue_invoices = []
        async for doc in cursor:
            invoice = Invoice(**doc)
            days_overdue = (today - invoice.due_date).days
            if days_overdue >= days_threshold:
                invoice.days_overdue = days_overdue
                overdue_invoices.append(invoice)

        return overdue_invoices

    async def get_top_customers(
        self,
        limit: int = 10,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """Get top customers by total purchase amount"""
        pipeline = [{"$match": {"invoice_type": InvoiceType.SALES.value}}]

        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            pipeline[0]["$match"]["invoice_date"] = date_filter

        pipeline.extend(
            [
                {
                    "$group": {
                        "_id": "$customer_id",
                        "customer_name": {"$first": "$customer_name"},
                        "total_amount": {"$sum": "$total_amount"},
                        "invoice_count": {"$sum": 1},
                        "last_purchase": {"$max": "$invoice_date"},
                    }
                },
                {"$sort": {"total_amount": -1}},
                {"$limit": limit},
            ]
        )

        cursor = self.invoices_collection.aggregate(pipeline)
        results = []
        async for doc in cursor:
            results.append(
                {
                    "customer_id": doc["_id"],
                    "customer_name": doc["customer_name"],
                    "total_amount": doc["total_amount"],
                    "invoice_count": doc["invoice_count"],
                    "last_purchase": doc["last_purchase"],
                }
            )

        return results

    async def get_revenue_summary(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        group_by: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Compute revenue (sales) summary with optional grouping and top-K."""
        match_stage: Dict[str, Any] = {"invoice_type": InvoiceType.SALES.value}
        if start_date or end_date:
            match_stage["invoice_date"] = {}
            if start_date:
                match_stage["invoice_date"]["$gte"] = start_date
            if end_date:
                match_stage["invoice_date"]["$lte"] = end_date

        pipeline: List[Dict[str, Any]] = [{"$match": match_stage}]

        if group_by == "customer":
            group_id: Any = "$customer_id"
            group_fields = {
                "_id": group_id,
                "name": {"$first": "$customer_name"},
                "revenue": {"$sum": "$total_amount"},
                "invoice_count": {"$sum": 1},
            }
        elif group_by == "region":
            group_id = "$region"
            group_fields = {
                "_id": group_id,
                "name": {"$first": "$region"},
                "revenue": {"$sum": "$total_amount"},
                "invoice_count": {"$sum": 1},
            }
        else:
            group_id = None
            group_fields = {
                "_id": None,
                "revenue": {"$sum": "$total_amount"},
                "invoice_count": {"$sum": 1},
            }

        pipeline.append({"$group": group_fields})
        pipeline.append({"$sort": {"revenue": -1}})
        if group_id is not None and limit:
            pipeline.append({"$limit": limit})

        cursor = self.invoices_collection.aggregate(pipeline)
        items: List[Dict[str, Any]] = []
        async for doc in cursor:
            items.append(
                {
                    "key": doc.get("_id"),
                    "name": doc.get("name", "total"),
                    "revenue": doc.get("revenue", Decimal("0.00")),
                    "invoice_count": doc.get("invoice_count", 0),
                }
            )

        total_revenue = (
            sum(Decimal(str(i["revenue"])) for i in items)
            if group_id is not None
            else (items[0]["revenue"] if items else Decimal("0.00"))
        )

        return {
            "group_by": group_by or "none",
            "items": items,
            "total_revenue": total_revenue,
        }

    async def get_profitability_summary(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        group_by: Optional[str] = None,
        limit: int = 10,
    ) -> Dict[str, Any]:
        """Approximate profitability: revenue (sales) minus expenses (purchases)."""
        revenue = await self.get_revenue_summary(start_date, end_date, group_by, limit)

        # Expenses from purchase invoices in same window and grouping
        match_stage: Dict[str, Any] = {"invoice_type": InvoiceType.PURCHASE.value}
        if start_date or end_date:
            match_stage["invoice_date"] = {}
            if start_date:
                match_stage["invoice_date"]["$gte"] = start_date
            if end_date:
                match_stage["invoice_date"]["$lte"] = end_date

        pipeline: List[Dict[str, Any]] = [{"$match": match_stage}]

        if group_by == "customer":
            # For expenses, we don't have customer; aggregate total expenses only
            group_id: Any = None
            group_fields = {
                "_id": None,
                "expenses": {"$sum": "$total_amount"},
            }
        elif group_by == "region":
            group_id = "$region"
            group_fields = {
                "_id": group_id,
                "expenses": {"$sum": "$total_amount"},
            }
        else:
            group_id = None
            group_fields = {"_id": None, "expenses": {"$sum": "$total_amount"}}

        pipeline.append({"$group": group_fields})
        expenses_docs = await self.invoices_collection.aggregate(pipeline).to_list(1000)

        expenses_map: Dict[Any, Decimal] = {}
        if group_id is None:
            total_expenses = (
                Decimal(str(expenses_docs[0]["expenses"]))
                if expenses_docs
                else Decimal("0.00")
            )
        else:
            for d in expenses_docs:
                expenses_map[d["_id"]] = Decimal(str(d["expenses"]))
            total_expenses = sum(expenses_map.values())

        # Merge
        items: List[Dict[str, Any]] = []
        if group_by and group_id is not None:
            for item in revenue["items"]:
                key = item["key"]
                rev = Decimal(str(item["revenue"]))
                exp = expenses_map.get(key, Decimal("0.00"))
                gross_profit = rev - exp
                margin = (gross_profit / rev * 100) if rev > 0 else Decimal("0.00")
                items.append(
                    {
                        "key": key,
                        "name": item["name"],
                        "revenue": rev,
                        "expenses": exp,
                        "gross_profit": gross_profit,
                        "margin_percent": margin,
                    }
                )
        else:
            rev = Decimal(str(revenue.get("total_revenue", Decimal("0.00"))))
            exp = total_expenses
            gross_profit = rev - exp
            margin = (gross_profit / rev * 100) if rev > 0 else Decimal("0.00")
            items = [
                {
                    "revenue": rev,
                    "expenses": exp,
                    "gross_profit": gross_profit,
                    "margin_percent": margin,
                }
            ]

        return {
            "group_by": group_by or "none",
            "items": items,
            "total_revenue": revenue.get("total_revenue", Decimal("0.00")),
            "total_expenses": total_expenses,
        }

    async def get_cash_flow_analysis(self, months: int = 12) -> Dict[str, Any]:
        """Analyze cash flow for the specified number of months"""
        end_date = date.today()
        start_date = end_date - timedelta(days=months * 30)

        # Get revenue (paid invoices)
        revenue_pipeline = [
            {
                "$match": {
                    "invoice_type": InvoiceType.SALES.value,
                    "status": PaymentStatus.PAID.value,
                    "invoice_date": {"$gte": start_date, "$lte": end_date},
                }
            },
            {"$group": {"_id": None, "total_revenue": {"$sum": "$total_amount"}}},
        ]

        # Get expenses (paid purchase invoices)
        expenses_pipeline = [
            {
                "$match": {
                    "invoice_type": InvoiceType.PURCHASE.value,
                    "status": PaymentStatus.PAID.value,
                    "invoice_date": {"$gte": start_date, "$lte": end_date},
                }
            },
            {"$group": {"_id": None, "total_expenses": {"$sum": "$total_amount"}}},
        ]

        # Get outstanding receivables
        ar_pipeline = [
            {
                "$match": {
                    "status": {
                        "$in": [
                            PaymentStatus.PENDING.value,
                            PaymentStatus.OVERDUE.value,
                        ]
                    }
                }
            },
            {"$group": {"_id": None, "total_ar": {"$sum": "$amount"}}},
        ]

        # Get outstanding payables
        ap_pipeline = [
            {
                "$match": {
                    "status": {
                        "$in": [
                            PaymentStatus.PENDING.value,
                            PaymentStatus.OVERDUE.value,
                        ]
                    }
                }
            },
            {"$group": {"_id": None, "total_ap": {"$sum": "$amount"}}},
        ]

        # Execute all pipelines
        revenue_result = await self.invoices_collection.aggregate(
            revenue_pipeline
        ).to_list(1)
        expenses_result = await self.invoices_collection.aggregate(
            expenses_pipeline
        ).to_list(1)
        ar_result = await self.ar_collection.aggregate(ar_pipeline).to_list(1)
        ap_result = await self.ap_collection.aggregate(ap_pipeline).to_list(1)

        total_revenue = (
            revenue_result[0]["total_revenue"] if revenue_result else Decimal("0.00")
        )
        total_expenses = (
            expenses_result[0]["total_expenses"] if expenses_result else Decimal("0.00")
        )
        total_ar = ar_result[0]["total_ar"] if ar_result else Decimal("0.00")
        total_ap = ap_result[0]["total_ap"] if ap_result else Decimal("0.00")

        net_cash_flow = total_revenue - total_expenses
        profit_margin = (
            (net_cash_flow / total_revenue * 100)
            if total_revenue > 0
            else Decimal("0.00")
        )

        return {
            "period_months": months,
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "net_cash_flow": net_cash_flow,
            "profit_margin_percent": profit_margin,
            "outstanding_receivables": total_ar,
            "outstanding_payables": total_ap,
            "net_working_capital": total_ar - total_ap,
        }

    async def search_financial_data(
        self, query: str, data_types: List[str] = None
    ) -> Dict[str, Any]:
        """Search across financial data based on query"""
        if data_types is None:
            data_types = ["invoices", "customers", "suppliers"]

        results = {}

        if "invoices" in data_types:
            # Search invoices by customer name, invoice number, or amount
            invoice_query = {
                "$or": [
                    {"customer_name": {"$regex": query, "$options": "i"}},
                    {"invoice_number": {"$regex": query, "$options": "i"}},
                    {"description": {"$regex": query, "$options": "i"}},
                ]
            }

            cursor = self.invoices_collection.find(invoice_query).limit(10)
            invoices = []
            async for doc in cursor:
                invoices.append(Invoice(**doc))
            results["invoices"] = invoices

        if "customers" in data_types:
            # Search customers by name
            customer_query = {"name": {"$regex": query, "$options": "i"}}

            cursor = self.customers_collection.find(customer_query).limit(10)
            customers = []
            async for doc in cursor:
                customers.append(Customer(**doc))
            results["customers"] = customers

        if "suppliers" in data_types:
            # Search suppliers by name
            supplier_query = {"name": {"$regex": query, "$options": "i"}}

            cursor = self.suppliers_collection.find(supplier_query).limit(10)
            suppliers = []
            async for doc in cursor:
                suppliers.append(Supplier(**doc))
            results["suppliers"] = suppliers

        return results

    async def get_customer_reliability_analysis(
        self, customer_id: str
    ) -> Dict[str, Any]:
        """Analyze customer payment reliability"""
        # Get all invoices for customer
        cursor = self.invoices_collection.find({"customer_id": customer_id})
        invoices = []
        async for doc in cursor:
            invoices.append(Invoice(**doc))

        if not invoices:
            return {"reliability": "unknown", "analysis": "No data available"}

        # Calculate metrics
        total_invoices = len(invoices)
        paid_invoices = len(
            [inv for inv in invoices if inv.status == PaymentStatus.PAID]
        )
        overdue_invoices = len(
            [inv for inv in invoices if inv.status == PaymentStatus.OVERDUE]
        )

        # Calculate average payment days
        paid_invoices_with_dates = [
            inv
            for inv in invoices
            if inv.status == PaymentStatus.PAID and inv.updated_at
        ]

        if paid_invoices_with_dates:
            payment_delays = []
            for inv in paid_invoices_with_dates:
                delay = (inv.updated_at.date() - inv.due_date).days
                payment_delays.append(max(0, delay))

            avg_payment_delay = sum(payment_delays) / len(payment_delays)
        else:
            avg_payment_delay = 0

        # Determine reliability
        payment_rate = paid_invoices / total_invoices if total_invoices > 0 else 0
        overdue_rate = overdue_invoices / total_invoices if total_invoices > 0 else 0

        if payment_rate >= 0.95 and avg_payment_delay <= 5:
            reliability = "excellent"
        elif payment_rate >= 0.85 and avg_payment_delay <= 15:
            reliability = "good"
        elif payment_rate >= 0.70 and avg_payment_delay <= 30:
            reliability = "average"
        else:
            reliability = "poor"

        return {
            "reliability": reliability,
            "total_invoices": total_invoices,
            "paid_invoices": paid_invoices,
            "overdue_invoices": overdue_invoices,
            "payment_rate": payment_rate,
            "overdue_rate": overdue_rate,
            "avg_payment_delay_days": avg_payment_delay,
        }

    async def get_ar_ap_metrics(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Compute AR/AP totals, DSO, DPO and Cash Conversion Cycle if possible."""
        # Revenue in window for DSO
        rev_summary = await self.get_revenue_summary(start_date, end_date)
        revenue_amount = Decimal(str(rev_summary.get("total_revenue", Decimal("0.00"))))

        # Purchases (COGS proxy) in window for DPO
        match_purchases: Dict[str, Any] = {"invoice_type": InvoiceType.PURCHASE.value}
        if start_date or end_date:
            match_purchases["invoice_date"] = {}
            if start_date:
                match_purchases["invoice_date"]["$gte"] = start_date
            if end_date:
                match_purchases["invoice_date"]["$lte"] = end_date
        purch_docs = await self.invoices_collection.aggregate(
            [
                {"$match": match_purchases},
                {"$group": {"_id": None, "purchases": {"$sum": "$total_amount"}}},
            ]
        ).to_list(1)
        purchases_amount = (
            Decimal(str(purch_docs[0]["purchases"])) if purch_docs else Decimal("0.00")
        )

        # AR total
        ar_docs = await self.ar_collection.aggregate(
            [{"$group": {"_id": None, "total_ar": {"$sum": "$amount"}}}]
        ).to_list(1)
        total_ar = Decimal(str(ar_docs[0]["total_ar"])) if ar_docs else Decimal("0.00")

        # AP total
        ap_docs = await self.ap_collection.aggregate(
            [{"$group": {"_id": None, "total_ap": {"$sum": "$amount"}}}]
        ).to_list(1)
        total_ap = Decimal(str(ap_docs[0]["total_ap"])) if ap_docs else Decimal("0.00")

        # Period days
        if start_date and end_date and end_date >= start_date:
            days = (end_date - start_date).days or 1
        else:
            # Default to 365 if not provided
            days = 365

        dso = (
            (total_ar / revenue_amount * days)
            if revenue_amount > 0
            else Decimal("0.00")
        )
        dpo = (
            (total_ap / purchases_amount * days)
            if purchases_amount > 0
            else Decimal("0.00")
        )

        # Inventory days (DIO) not available; assume 0 for now
        dio = Decimal("0.00")
        ccc = dso + dio - dpo

        return {
            "total_ar": total_ar,
            "total_ap": total_ap,
            "revenue": revenue_amount,
            "purchases": purchases_amount,
            "dso_days": dso,
            "dpo_days": dpo,
            "dio_days": dio,
            "cash_conversion_cycle_days": ccc,
        }

    async def get_financial_metrics_summary(self) -> Dict[str, Any]:
        """Get comprehensive financial metrics summary"""
        # Get current month metrics
        today = date.today()
        month_start = today.replace(day=1)

        # Revenue this month
        revenue_cursor = self.invoices_collection.find(
            {
                "invoice_type": InvoiceType.SALES.value,
                "status": PaymentStatus.PAID.value,
                "invoice_date": {"$gte": month_start, "$lte": today},
            }
        )

        monthly_revenue = Decimal("0.00")
        async for doc in revenue_cursor:
            monthly_revenue += Decimal(str(doc["total_amount"]))

        # Outstanding invoices
        outstanding_cursor = self.invoices_collection.find(
            {
                "status": {
                    "$in": [PaymentStatus.PENDING.value, PaymentStatus.OVERDUE.value]
                }
            }
        )

        outstanding_count = 0
        outstanding_amount = Decimal("0.00")
        overdue_count = 0
        overdue_amount = Decimal("0.00")

        async for doc in outstanding_cursor:
            outstanding_count += 1
            outstanding_amount += Decimal(str(doc["total_amount"]))

            if doc["status"] == PaymentStatus.OVERDUE.value:
                overdue_count += 1
                overdue_amount += Decimal(str(doc["total_amount"]))

        # Top customers this month
        top_customers = await self.get_top_customers(5, month_start, today)

        return {
            "monthly_revenue": monthly_revenue,
            "outstanding_invoices": {
                "count": outstanding_count,
                "amount": outstanding_amount,
            },
            "overdue_invoices": {"count": overdue_count, "amount": overdue_amount},
            "top_customers": top_customers,
            "date_range": {"start": month_start, "end": today},
        }


def get_financial_data_service(db: AsyncSession = None) -> FinancialDataService:
    """Dependency injection for FinancialDataService"""
    if db is None:
        from dependencies import get_db
        db = get_db()
    return FinancialDataService(db)
