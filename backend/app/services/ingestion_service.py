"""IngestionService — invokes ``ingestion_graph`` with tenant-scoped vector context.

**Scope:** Bridge between Gmail/webhook/file uploads and the LangGraph ingestion agent;
no Gmail API calls here (those belong in ``app/clients/`` once OAuth per org exists).

**Contract:** Accepts primitive inputs and ``AsyncSession``; returns the graph's
``result`` dict or raises domain errors only from downstream services (not used yet).

**Flow:**
    1. Build ``vector_store_factory`` that closes over ``VectorStoreService`` for the
       caller's ``organization_id``.
    2. ``await ingestion_graph.ainvoke`` with org id, text/attachment metadata, ``db``.

**Architectural notes:** Keeps agents free of SQLAlchemy imports beyond state typing;
multi-tenancy is enforced because the factory always binds the JWT org id.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.ingestion import ingestion_graph
from app.agents.ingestion.state import IngestionState, VectorStoreFactory
from app.services.embeddings.vector_store import VectorStoreService


class IngestionService:
    """Run document / Gmail-attachment ingestion for one organization."""

    def __init__(self, db: AsyncSession, organization_id: str) -> None:
        self._db = db
        self._organization_id = organization_id

    def _vector_store_factory(self) -> VectorStoreFactory:
        def _factory(session: AsyncSession, org_id: str) -> VectorStoreService:
            return VectorStoreService(session, org_id)

        return _factory

    async def run_ingestion(
        self,
        *,
        raw_text: str = "",
        attachment_base64: str | None = None,
        attachment_mime_type: str | None = None,
        email_subject: str | None = None,
        email_from: str | None = None,
        include_vector_hints: bool = True,
    ) -> dict[str, Any]:
        """Execute ``ingestion_graph`` and return the terminal ``result`` payload."""
        state: IngestionState = {
            "organization_id": self._organization_id,
            "raw_text": raw_text or "",
            "db": self._db,
        }
        if email_subject is not None:
            state["email_subject"] = email_subject
        if email_from is not None:
            state["email_from"] = email_from
        if attachment_base64 and attachment_mime_type:
            state["attachment_base64"] = attachment_base64
            state["attachment_mime_type"] = attachment_mime_type
        if include_vector_hints:
            state["vector_store_factory"] = self._vector_store_factory()

        out = await ingestion_graph.ainvoke(state)
        return dict(out.get("result") or {})
