"""VectorStoreService — pgvector-backed semantic memory per organization.

Scope:
    Generate OpenAI embeddings for arbitrary text, persist rows in
    ``organization_embeddings``, and run similarity search **always filtered by**
    ``organization_id`` so tenants never leak context across org boundaries.

Contract:
    Service methods raise ``ValidationError`` / ``ExternalServiceError`` from
    ``app.core.exceptions``; they never return HTTP types.

End-to-end example (invoice categorization):
    1. During onboarding, Factora ingests a supplier invoice PDF. The ingestion
       agent extracts line items like ``"Adobe Creative Cloud — €59.49"``.
    2. The accountant maps that line to expense category ``Software``.
    3. ``VectorStoreService.upsert_memory`` stores ``content_text`` plus an
       ``embedding_metadata`` payload ``{"category": "Software"}`` under the
       organization's id.
    4. Weeks later, a new bank feed line appears: ``"ADOBE *CREATIVE CLOUD"``.
    5. ``similarity_search`` embeds that string, runs a cosine-nearest query
       **scoped to the same organization_id**, and returns the top historical
       rows so the Smart Categorization agent can suggest ``Software`` with
       confidence derived from distance scores.
    6. If the match is weak, the UI asks the human to confirm — completing the
       active-learning loop described in product vision docs.

Architectural notes:
    - Uses raw SQL with the ``<=>`` cosine-distance operator for predictable
      behaviour across SQLAlchemy versions.
    - Embedding width must match the DB column (default 1536 for
      ``text-embedding-3-small``); configure via ``OPENAI_EMBEDDING_DIMENSIONS``.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Sequence

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import ExternalServiceError, ValidationError
from app.db.models.embeddings import OrganizationEmbedding

logger = logging.getLogger(__name__)


def _vector_literal(values: Sequence[float]) -> str:
    return "[" + ",".join(str(float(x)) for x in values) + "]"


class VectorStoreService:
    """Embed text, store vectors, and query nearest neighbors for one tenant."""

    def __init__(self, db: AsyncSession, organization_id: str) -> None:
        self.db = db
        self.organization_id = organization_id

    def _client(self) -> AsyncOpenAI:
        if not settings.OPENAI_API_KEY:
            raise ValidationError(
                "OpenAI API key is not configured.",
                code="config.openai_missing",
                fields={"OPENAI_API_KEY": "Required for embeddings"},
            )
        return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Return embedding vectors for each input string (single OpenAI call)."""
        if not texts:
            return []
        client = self._client()
        try:
            resp = await client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=texts,
                dimensions=settings.OPENAI_EMBEDDING_DIMENSIONS,
            )
        except Exception as e:
            logger.error("OpenAI embedding failed: %s", e)
            raise ExternalServiceError(
                "Failed to generate embeddings.",
                code="external.openai_embedding",
            ) from e
        return [list(d.embedding) for d in resp.data]

    async def upsert_memory(
        self,
        *,
        content_text: str,
        source: str,
        embedding_metadata: dict[str, Any] | None = None,
    ) -> OrganizationEmbedding:
        """Embed ``content_text`` and insert a row for this organization."""
        vectors = await self.embed_texts([content_text])
        vec = vectors[0]
        row = OrganizationEmbedding(
            id=str(uuid.uuid4()),
            organization_id=self.organization_id,
            source=source[:64],
            content_text=content_text,
            embedding=vec,
            embedding_metadata=embedding_metadata or {},
        )
        self.db.add(row)
        try:
            await self.db.commit()
            await self.db.refresh(row)
        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to persist embedding: %s", e)
            raise ExternalServiceError(
                "Failed to store embedding.",
                code="db.error",
            ) from e
        return row

    async def similarity_search(
        self,
        query_text: str,
        *,
        k: int = 8,
    ) -> list[dict[str, Any]]:
        """Return the ``k`` nearest rows for ``query_text`` within this org."""
        if k < 1 or k > 100:
            raise ValidationError(
                "k must be between 1 and 100.",
                code="validation.invalid_k",
                fields={"k": "Use 1 <= k <= 100"},
            )
        vectors = await self.embed_texts([query_text])
        qv = _vector_literal(vectors[0])
        sql = text(
            """
            SELECT id::text AS id,
                   content_text,
                   source,
                   embedding_metadata,
                   (embedding <=> CAST(:qv AS vector)) AS distance
            FROM organization_embeddings
            WHERE organization_id = CAST(:oid AS uuid)
            ORDER BY embedding <=> CAST(:qv AS vector)
            LIMIT :lim
            """
        )
        try:
            result = await self.db.execute(
                sql,
                {"qv": qv, "oid": self.organization_id, "lim": k},
            )
            rows = result.mappings().all()
        except Exception as e:
            logger.error("Vector search failed: %s", e)
            raise ExternalServiceError(
                "Similarity search failed.",
                code="external.vector_search",
            ) from e
        return [dict(r) for r in rows]
