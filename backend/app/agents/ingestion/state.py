"""Typed state and ports for the ingestion LangGraph."""

from __future__ import annotations

from typing import Any, Callable, NotRequired, Protocol, TypedDict

from sqlalchemy.ext.asyncio import AsyncSession


class SimilaritySearchPort(Protocol):
    async def similarity_search(
        self, query_text: str, *, k: int = 8
    ) -> list[dict[str, Any]]:
        ...


VectorStoreFactory = Callable[[AsyncSession, str], SimilaritySearchPort]


class IngestionState(TypedDict, total=False):
    organization_id: str
    raw_text: str
    db: NotRequired[Any]
    # Runtime injection (optional). Not constants — see ``constants.py`` for limits.
    vector_store_factory: NotRequired[VectorStoreFactory]
    llm: NotRequired[Any]
    extracted: dict[str, Any]
    neighbors: list[dict[str, Any]]
    result: dict[str, Any]
