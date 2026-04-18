"""Compile the ingestion LangGraph and expose ``ingestion_graph``.

**Scope:** Wire ``StateGraph`` nodes only — no extraction logic in this file.

**Flow:**
    1. ``materialize`` — decode optional base64 PDF (text append) or stage image for vision.
    2. ``validate`` — reject empty input (no text and no image).
    3. ``context`` — pgvector similarity hints fetched BEFORE extraction so the LLM
       can use historical organisation context (including human corrections).
    4. ``extract`` — LLM JSON with ERP fields, concufidence, summary; receives
       ``neighbors`` from ``context`` as prompt hints.
    5. ``resolve_counterparty`` — maps the extracted vendor name/VAT number to an
       existing ``Counterparty`` row; Phase 1 exact VAT lookup, Phase 2 embedding
       similarity over counterparty-linked embeddings.
    6. ``check_recurrence`` — DB temporal-pattern check using the resolved
       counterparty FK (or vendor ILIKE fallback for new vendors).
    7. ``finalize`` — document embedding + ``requires_human_review`` + flat invoice payload.

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
    workflow.add_node("context", n.context)
    workflow.add_node("extract", n.extract)
    workflow.add_node("resolve_counterparty", n.resolve_counterparty)
    workflow.add_node("check_recurrence", n.check_recurrence)
    workflow.add_node("finalize", n.finalize)
    workflow.add_edge(START, "materialize")
    workflow.add_edge("materialize", "validate")

    def route_after_validate(state: IngestionState) -> str:
        return "end" if state.get("result") else "context"

    workflow.add_conditional_edges(
        "validate",
        route_after_validate,
        {"context": "context", "end": END},
    )
    workflow.add_edge("context", "extract")
    workflow.add_edge("extract", "resolve_counterparty")
    workflow.add_edge("resolve_counterparty", "check_recurrence")
    workflow.add_edge("check_recurrence", "finalize")
    workflow.add_edge("finalize", END)
    return workflow.compile()


ingestion_graph = _build_ingestion_workflow()
