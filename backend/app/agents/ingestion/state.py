"""Ingestion graph state schema and typing-only ports.

**Keys:** ``organization_id`` and ``raw_text`` are required inputs; ``db`` is the
caller's ``AsyncSession``. Optional ``vector_store_factory`` and ``llm`` are
runtime dependencies (see ``CLAUDE.md``) — not configuration constants.

**Outputs:** ``extracted``, ``neighbors``, and terminal ``result`` (or early error
in ``result``) are written by nodes as the graph runs.

**SimilaritySearchPort:** protocol implemented by services injecting vector search.
"""

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
