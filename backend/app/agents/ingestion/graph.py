"""IngestionAgent — LangGraph workflow to turn document text into structured invoice hints.

Scope:
    Orchestrate LLM-based field extraction and optional similarity search against
    historical embeddings for the same ``organization_id``.

Flow:
    1. **validate** — ensure non-empty payload / file stub reference.
    2. **extract** — call ``LLMClient.chat_completion_json`` with a strict prompt
       for vendor name, line totals, VAT rate, currency.
    3. **context** — if a ``vector_store_factory`` was injected, run
       ``similarity_search`` on a condensed text of the invoice so prior human
       labels inform category suggestions.
    4. **finalize** — merge JSON + top metadata hits into a single DTO for review UI.

End-to-end customer story:
    *Elena's design agency uploads a scanned hosting bill. The graph extracts
    "Hetzner Online GmbH" and €48.90. The vector step surfaces that last month
    she filed the same vendor under "Infrastructure / Hosting", so the UX
    pre-selects that ledger code with a purple "AI-suggested" affordance.*

Architectural notes:
    - Compiled graph is stateless; callers inject ``AsyncSession`` per request.
    - Demo mode short-circuits before any paid LLM call.
    - Callers that need vector hints pass ``vector_store_factory`` (e.g.
      ``lambda db, oid: VectorStoreService(db, oid)`` from the service layer).
"""
from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.llm_client import LLMClient

from app.agents.ingestion.nodes import IngestionNodes
from app.agents.ingestion.state import IngestionState, VectorStoreFactory


class IngestionAgent:
    """Compiled LangGraph runner for ingestion."""

    def __init__(
        self,
        *,
        llm: LLMClient | None = None,
        vector_store_factory: VectorStoreFactory | None = None,
    ) -> None:
        self._llm = llm or LLMClient()
        self._vector_store_factory = vector_store_factory
        self._nodes = IngestionNodes(self._llm, self._vector_store_factory)
        self._graph = self._build_graph()

    def _build_graph(self):
        workflow = StateGraph(IngestionState)
        n = self._nodes

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

    async def run(
        self,
        db: AsyncSession,
        organization_id: str,
        raw_text: str,
    ) -> dict[str, Any]:
        out = await self._graph.ainvoke(
            {
                "organization_id": organization_id,
                "raw_text": raw_text,
                "db": db,
            }
        )
        if out.get("result") is not None:
            return out["result"]
        return {"error": "unknown"}
