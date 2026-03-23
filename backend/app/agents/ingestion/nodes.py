"""Ingestion graph nodes (state_in → state_out)."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.llm_client import LLMClient
from app.config import settings

from app.agents.ingestion.prompts import EXTRACT_SYSTEM_MESSAGE
from app.agents.ingestion.state import IngestionState, VectorStoreFactory

logger = logging.getLogger(__name__)


class IngestionNodes:
    """Node callables bound to LLM and optional vector store factory."""

    def __init__(
        self,
        llm: LLMClient,
        vector_store_factory: VectorStoreFactory | None,
    ) -> None:
        self._llm = llm
        self._vector_store_factory = vector_store_factory

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
            {"role": "user", "content": state["raw_text"][:12000]},
        ]
        extracted = await self._llm.chat_completion_json(messages)
        return {**state, "extracted": extracted}

    async def context(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        factory = self._vector_store_factory
        if factory is None:
            return {**state, "neighbors": []}
        db: AsyncSession = state["db"]
        vs = factory(db, state["organization_id"])
        try:
            neighbors = await vs.similarity_search(
                state["raw_text"][:2000],
                k=5,
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
