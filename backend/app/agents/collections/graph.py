"""Collections LangGraph — unresolved alerts → LLM-drafted email → SMTP (demo-safe).

Public API: ``collections_graph`` (import from ``app.agents.collections``).
"""
from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents.collections.nodes import CollectionsNodes
from app.agents.collections.state import CollectionsState

_nodes = CollectionsNodes()


def _build_collections_workflow():
    workflow = StateGraph(CollectionsState)
    n = _nodes

    workflow.add_node("discover", n.discover)
    workflow.add_node("draft", n.draft)
    workflow.add_node("send", n.send)
    workflow.add_edge(START, "discover")
    workflow.add_edge("discover", "draft")
    workflow.add_edge("draft", "send")
    workflow.add_edge("send", END)
    return workflow.compile()


collections_graph = _build_collections_workflow()
