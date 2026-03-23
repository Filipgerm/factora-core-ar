"""Compile the ingestion LangGraph and expose ``ingestion_graph``.

**Scope:** Wire ``StateGraph`` nodes only — no extraction logic in this file.

**Flow:**
    1. ``validate`` — reject empty ``raw_text`` (early ``result`` with error).
    2. ``extract`` — LLM JSON field extraction (or demo fixture).
    3. ``context`` — optional pgvector similarity hints via ``vector_store_factory``.
    4. ``finalize`` — merge ``extracted`` + ``neighbors`` into ``result``.

**Contract:** Services import ``ingestion_graph`` from ``app.agents.ingestion`` and
call ``ainvoke`` with ``organization_id``, ``raw_text``, ``db``, and optionally
``vector_store_factory`` / ``llm`` (tests) on the initial state.
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
