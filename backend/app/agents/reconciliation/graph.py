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

TODO: Phase 3 AR/AP — replace ``stub_open_invoices`` with real Invoice ORM queries.

Architectural notes:
    - Every SQL path filters via ``CustomerModel.organization_id``.
    - Demo mode returns canned structures without touching SaltEdge.
"""
from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.reconciliation.nodes import ReconciliationNodes
from app.agents.reconciliation.state import ReconciliationState


class ReconciliationAgent:
    """LangGraph reconciliation skeleton."""

    def __init__(self) -> None:
        self._nodes = ReconciliationNodes()
        self._graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(ReconciliationState)
        n = self._nodes

        workflow.add_node("load_bank", n.load_bank)
        workflow.add_node("load_invoices", n.load_invoices)
        workflow.add_node("match", n.match)
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
