"""VectorStoreService — pgvector-backed semantic memory per organization.

Scope:
    Generate embeddings (Gemini or OpenAI) for arbitrary text, persist rows in
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
    - Embedding width must match the DB column; configure ``EMBEDDING_DIMENSIONS``
      and ``EMBEDDING_PROVIDER`` (``gemini`` or ``openai``).
"""
from __future__ import annotations

import logging
import uuid
from typing import Any, Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError, ValidationError
from app.db.models.embeddings import OrganizationEmbedding
from app.services.embeddings.backend import embed_texts as backend_embed_texts

logger = logging.getLogger(__name__)


def _vector_literal(values: Sequence[float]) -> str:
    return "[" + ",".join(str(float(x)) for x in values) + "]"


class VectorStoreService:
    """Embed text, store vectors, and query nearest neighbors for one tenant."""

    def __init__(self, db: AsyncSession, organization_id: str) -> None:
        self.db = db
        self.organization_id = organization_id

    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Return embedding vectors for each input string via shared backend."""
        if not texts:
            return []
        try:
            return await backend_embed_texts(texts)
        except ValidationError:
            raise
        except Exception as e:
            logger.error("Embedding backend failed: %s", e)
            raise ExternalServiceError(
                "Failed to generate embeddings.",
                code="external.embedding",
            ) from e

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

    async def record_category_feedback(
        self,
        *,
        content_text: str,
        suggested_label: str,
        corrected_label: str,
        source: str = "human_feedback",
    ) -> OrganizationEmbedding:
        """Persist a human correction as a new embedding row for active learning."""
        trimmed = content_text.strip()
        if not trimmed:
            raise ValidationError(
                "content_text is required.",
                code="validation.empty_content",
                fields={"content_text": "Provide non-empty text"},
            )
        embed_body = f"{trimmed}\nconfirmed_category={corrected_label}"
        return await self.upsert_memory(
            content_text=embed_body,
            source=source[:64],
            embedding_metadata={
                "suggested_label": suggested_label,
                "corrected_label": corrected_label,
                "feedback_type": "category_correction",
            },
        )
