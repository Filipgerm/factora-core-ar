"""AIService — org-scoped streaming chat and embedding feedback for active learning."""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.llm_client import LLMClient
from app.services.embeddings.vector_store import VectorStoreService


class AIService:
    def __init__(self, db: AsyncSession, organization_id: str) -> None:
        self._db = db
        self._organization_id = organization_id
        self._llm = LLMClient()

    async def stream_chat(self, message: str) -> AsyncIterator[str]:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are Factora, an AI-native accounting copilot. "
                    f"Current organization context id: {self._organization_id}. "
                    "Give concise, actionable answers."
                ),
            },
            {"role": "user", "content": message},
        ]
        async for chunk in self._llm.stream_chat_completion(messages):
            yield chunk

    async def submit_feedback(
        self,
        *,
        content_text: str,
        suggested_label: str,
        corrected_label: str,
        source: str,
    ) -> str:
        """Store human correction in pgvector; returns new embedding row id."""
        vs = VectorStoreService(self._db, self._organization_id)
        row = await vs.record_category_feedback(
            content_text=content_text,
            suggested_label=suggested_label,
            corrected_label=corrected_label,
            source=source,
        )
        return str(row.id)
