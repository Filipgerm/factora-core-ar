"""Ingestion graph state schema and typing-only ports.

**Inputs:** ``organization_id`` and either ``raw_text`` (after materialize), a Gmail
image attachment (``attachment_base64`` + ``attachment_mime_type``), or both.
Optional ``email_subject`` / ``email_from`` improve vision extraction context.

**Runtime hooks:** ``vector_store_factory`` and ``llm`` are injected by the calling
service or tests — not ``constants.py`` values.

**Outputs:** ``extracted``, ``neighbors``, vision staging keys, and terminal ``result``
(including ``embedding``, ``confidence``, ``requires_human_review``).

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
    # Optional Gmail / webhook context (not secrets — metadata only).
    email_subject: NotRequired[str]
    email_from: NotRequired[str]
    # Raw attachment as base64; ``materialize`` decodes PDFs to text or stages images.
    attachment_base64: NotRequired[str]
    attachment_mime_type: NotRequired[str]
    vision_image_base64: NotRequired[str]
    vision_image_mime: NotRequired[str]
    # Runtime injection (optional). Not constants — see ``constants.py`` for limits.
    vector_store_factory: NotRequired[VectorStoreFactory]
    llm: NotRequired[Any]
    extracted: dict[str, Any]
    neighbors: list[dict[str, Any]]
    # Set by check_recurrence: number of distinct calendar months with invoices
    # from the same vendor + similar amount found in the DB. 0 = no history.
    recurrence_months_found: NotRequired[int]
    result: dict[str, Any]
