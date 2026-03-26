"""Compile the ingestion LangGraph and expose ``ingestion_graph``.

**Scope:** Wire ``StateGraph`` nodes only — no extraction logic in this file.

**Flow:**
    1. ``materialize`` — decode optional base64 PDF (text append) or stage image for vision.
    2. ``validate`` — reject empty input (no text and no image).
    3. ``extract`` — LLM JSON with ERP fields, confidence, summary (text or vision).
    4. ``context`` — optional pgvector similarity hints via ``vector_store_factory``.
    5. ``finalize`` — document embedding + ``requires_human_review`` + flat invoice payload.

**Contract:** Services import ``ingestion_graph`` from ``app.agents.ingestion`` and
call ``ainvoke`` with ``organization_id``, ``raw_text`` and/or attachment fields,
``db``, and optionally ``vector_store_factory`` / ``llm`` (tests).
"""
from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents.ingestion.nodes import IngestionNodes
from app.agents.ingestion.state import IngestionState

_nodes = IngestionNodes()


def _build_ingestion_workflow():
    workflow = StateGraph(IngestionState)
    n = _nodes

    workflow.add_node("materialize", n.materialize)
    workflow.add_node("validate", n.validate)
    workflow.add_node("extract", n.extract)
    workflow.add_node("context", n.context)
    workflow.add_node("finalize", n.finalize)
    workflow.add_edge(START, "materialize")
    workflow.add_edge("materialize", "validate")

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
