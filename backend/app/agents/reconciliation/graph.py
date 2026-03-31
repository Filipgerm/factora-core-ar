"""Compile the reconciliation LangGraph and expose ``reconciliation_graph``.

**Scope:** ``StateGraph`` wiring only — matching rules live in ``nodes``.

**Flow:**
    1. ``load_bank`` — recent ``Transaction`` rows for the tenant (SQL, multi-tenant safe).
    2. ``load_invoices`` — stub open invoices (demo fixtures or empty until AR ships).
    3. ``match`` — exact Decimal amount match → ``matches``; ambiguous / miss → ``review_queue``.

**Contract:** Import ``reconciliation_graph`` from ``app.agents.reconciliation``;
``ainvoke`` initial state requires ``organization_id`` and ``db``.

**LangSmith tracing:** When the service that invokes this graph is created, pass a
``RunnableConfig`` so traces appear in the correct bucket::

    from langchain_core.runnables import RunnableConfig
    config: RunnableConfig = {
        "run_name": "reconciliation",
        "tags": ["reconciliation", trigger],   # trigger e.g. "scheduled" | "manual"
        "metadata": {"organization_id": org_id, "trigger": trigger},
    }
    result = await reconciliation_graph.ainvoke(state, config=config)
"""
from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents.reconciliation.nodes import ReconciliationNodes
from app.agents.reconciliation.state import ReconciliationState

_nodes = ReconciliationNodes()


def _build_reconciliation_workflow():
    workflow = StateGraph(ReconciliationState)
    n = _nodes

    workflow.add_node("load_bank", n.load_bank)
    workflow.add_node("load_invoices", n.load_invoices)
    workflow.add_node("match", n.match)
    workflow.add_edge(START, "load_bank")
    workflow.add_edge("load_bank", "load_invoices")
    workflow.add_edge("load_invoices", "match")
    workflow.add_edge("match", END)
    return workflow.compile()


reconciliation_graph = _build_reconciliation_workflow()
