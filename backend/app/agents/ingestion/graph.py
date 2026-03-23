"""Ingestion LangGraph — document text → structured invoice hints (+ optional vector context).

Services invoke ``ingestion_graph`` only (see ``app.agents.ingestion``). Pass optional
``vector_store_factory`` and (tests only) ``llm`` on the initial state dict.
"""
from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents.ingestion.nodes import IngestionNodes
from app.agents.ingestion.state import IngestionState

_nodes = IngestionNodes()


def _build_ingestion_workflow():
    workflow = StateGraph(IngestionState)
    n = _nodes

    workflow.add_node("validate", n.validate)
    workflow.add_node("extract", n.extract)
    workflow.add_node("context", n.context)
    workflow.add_node("finalize", n.finalize)
    workflow.add_edge(START, "validate")

    def route_after_validate(state: IngestionState) -> str:
        return "end" if state.get("result") else "extract"

    workflow.add_conditional_edges(
        "validate",
        route_after_validate,
        {"extract": "extract", "end": END},
    )
    workflow.add_edge("extract", "context")
    workflow.add_edge("context", "finalize")
    workflow.add_edge("finalize", END)
    return workflow.compile()


ingestion_graph = _build_ingestion_workflow()
