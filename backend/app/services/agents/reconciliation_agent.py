"""ReconciliationAgent — LangGraph flow to propose bank-to-invoice matches.

Scope:
    Load recent bank ``Transaction`` rows for the tenant, compare against a
    **stub** invoice list until the AR/AP domain ships, and partition results
    into auto-matches vs human review.

Flow:
    1. **load_bank** — query open-banking transactions scoped by ``organization_id``.
    2. **load_invoices** — placeholder list (empty or demo fixtures).
    3. **match** — exact amount matches get ``matches``; partial/ambiguous rows
       go to ``review_queue`` with a ``reason`` string.

End-to-end customer story:
    *Nikos imports February card activity. The graph pairs a -€1,200 line with
    invoice INV-104 (exact amount, same day). A -€118.40 line matches two small
    bills; it lands in ``review_queue`` so Nikos can split the payment in UI.*

TODO: Phase 3 AR/AP — replace ``_stub_open_invoices`` with real Invoice ORM queries.

Architectural notes:
    - Every SQL path filters via ``CustomerModel.organization_id``.
    - Demo mode returns canned structures without touching SaltEdge.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Any, NotRequired, TypedDict

from langgraph.graph import END, START, StateGraph
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models.banking import (
    BankAccountModel,
    ConnectionModel,
    CustomerModel,
    Transaction,
)

class ReconciliationState(TypedDict, total=False):
    organization_id: str
    db: NotRequired[Any]
    bank_lines: list[dict[str, Any]]
    open_invoices: list[dict[str, Any]]
    matches: list[dict[str, Any]]
    review_queue: list[dict[str, Any]]


class ReconciliationAgent:
    """LangGraph reconciliation skeleton."""

    def __init__(self) -> None:
        self._graph = self._build_graph()

    def _stub_open_invoices(self) -> list[dict[str, Any]]:
        if settings.demo_mode:
            return [
                {"id": "inv_demo_1", "amount": "1200.00", "counterparty": "Acme Ltd"},
                {"id": "inv_demo_2", "amount": "118.40", "counterparty": "Cloud Co"},
            ]
        return []

    async def _fetch_transactions(
        self,
        db: AsyncSession,
        organization_id: str,
        limit: int = 80,
    ) -> list[dict[str, Any]]:
        stmt = (
            select(Transaction)
            .join(BankAccountModel, BankAccountModel.id == Transaction.account_id)
            .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
            .join(CustomerModel, CustomerModel.id == ConnectionModel.customer_id)
            .where(CustomerModel.organization_id == organization_id)
            .order_by(Transaction.made_on.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        txs = result.scalars().all()
        lines: list[dict[str, Any]] = []
        for t in txs:
            lines.append(
                {
                    "id": t.id,
                    "amount": str(t.amount),
                    "description": t.description or "",
                    "made_on": t.made_on.isoformat() if t.made_on else None,
                }
            )
        return lines

    def _build_graph(self):
        workflow = StateGraph(ReconciliationState)

        async def load_bank(state: ReconciliationState) -> ReconciliationState:
            db: AsyncSession = state["db"]
            lines = await self._fetch_transactions(db, state["organization_id"])
            return {**state, "bank_lines": lines}

        async def load_invoices(state: ReconciliationState) -> ReconciliationState:
            return {**state, "open_invoices": self._stub_open_invoices()}

        async def match(state: ReconciliationState) -> ReconciliationState:
            matches: list[dict[str, Any]] = []
            review: list[dict[str, Any]] = []
            invoices = state.get("open_invoices", [])
            for line in state.get("bank_lines", []):
                try:
                    amt = Decimal(line["amount"])
                except Exception:
                    review.append({**line, "reason": "invalid_amount"})
                    continue
                hits = [
                    inv
                    for inv in invoices
                    if Decimal(str(inv.get("amount", "0"))) == amt
                ]
                if len(hits) == 1:
                    matches.append(
                        {
                            "transaction_id": line["id"],
                            "invoice_id": hits[0]["id"],
                            "amount": line["amount"],
                        }
                    )
                elif len(hits) > 1:
                    review.append(
                        {**line, "reason": "ambiguous_amount", "candidates": hits}
                    )
                else:
                    review.append({**line, "reason": "no_exact_match"})
            return {**state, "matches": matches, "review_queue": review}

        workflow.add_node("load_bank", load_bank)
        workflow.add_node("load_invoices", load_invoices)
        workflow.add_node("match", match)
        workflow.add_edge(START, "load_bank")
        workflow.add_edge("load_bank", "load_invoices")
        workflow.add_edge("load_invoices", "match")
        workflow.add_edge("match", END)
        return workflow.compile()

    async def run(self, db: AsyncSession, organization_id: str) -> dict[str, Any]:
        out = await self._graph.ainvoke(
            {"organization_id": organization_id, "db": db},
        )
        return {
            "matches": out.get("matches", []),
            "review_queue": out.get("review_queue", []),
            "bank_lines_loaded": len(out.get("bank_lines", [])),
        }
