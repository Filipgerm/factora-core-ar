"""LangGraph node callables for document ingestion (validate → extract → context → finalize).

**Flow (mutations):**
    * ``validate`` — sets ``result.error`` when text is blank; otherwise passes through.
    * ``extract`` — fills ``extracted`` via ``LLMClient.chat_completion_json`` or demo JSON.
    * ``context`` — fills ``neighbors`` from injected ``vector_store_factory`` similarity search.
    * ``finalize`` — builds final ``result`` with ``extracted`` and ``vector_hints``.

**Side effects:** LLM HTTP (non-demo), optional embedding search; all scoped by
``organization_id`` when a factory is provided. Limits for truncation and k come
from ``constants.py``.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.llm_client import LLMClient
from app.config import settings

from app.agents.ingestion.constants import (
    EXTRACT_RAW_TEXT_MAX_CHARS,
    SIMILARITY_QUERY_MAX_CHARS,
    SIMILARITY_SEARCH_TOP_K,
)
from app.agents.ingestion.prompts import EXTRACT_SYSTEM_MESSAGE
from app.agents.ingestion.state import IngestionState

logger = logging.getLogger(__name__)


class IngestionNodes:
    """Node callables; optional ``llm`` / ``vector_store_factory`` come from state."""

    def __init__(self) -> None:
        self._default_llm = LLMClient()

    def _llm(self, state: IngestionState) -> Any:
        return state.get("llm") or self._default_llm

    def _vector_store_factory(self, state: IngestionState):
        return state.get("vector_store_factory")

    async def validate(self, state: IngestionState) -> IngestionState:
        if not state.get("raw_text", "").strip():
            return {**state, "result": {"error": "empty_text"}}
        return state

    async def extract(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        if settings.demo_mode:
            extracted = {
                "vendor": "Demo Vendor A.E.",
                "total": "120.00",
                "vat_rate": "24",
                "currency": "EUR",
            }
            return {**state, "extracted": extracted}
        messages = [
            {"role": "system", "content": EXTRACT_SYSTEM_MESSAGE},
            {
                "role": "user",
                "content": state["raw_text"][:EXTRACT_RAW_TEXT_MAX_CHARS],
            },
        ]
        extracted = await self._llm(state).chat_completion_json(messages)
        return {**state, "extracted": extracted}

    async def context(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        factory = self._vector_store_factory(state)
        if factory is None:
            return {**state, "neighbors": []}
        db: AsyncSession = state["db"]
        vs = factory(db, state["organization_id"])
        try:
            neighbors = await vs.similarity_search(
                state["raw_text"][:SIMILARITY_QUERY_MAX_CHARS],
                k=SIMILARITY_SEARCH_TOP_K,
            )
        except Exception as e:
            logger.warning("similarity search skipped: %s", e)
            neighbors = []
        return {**state, "neighbors": neighbors}

    async def finalize(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        return {
            **state,
            "result": {
                "extracted": state.get("extracted", {}),
                "vector_hints": state.get("neighbors", []),
            },
        }
