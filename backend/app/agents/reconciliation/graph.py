"""Reconciliation LangGraph — bank lines vs open invoices (stub) with exact-amount heuristic.

Public API: ``reconciliation_graph`` (import from ``app.agents.reconciliation``).
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
