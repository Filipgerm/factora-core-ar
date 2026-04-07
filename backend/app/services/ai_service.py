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
        original_confidence: float | None = None,
        was_auto_applied: bool = False,
        correction_count: int = 1,
        counterparty_id: str | None = None,
    ) -> str:
        """Store human correction in pgvector; returns new embedding row id.

        Args:
            content_text: The original document text that was mis-categorized.
            suggested_label: Category the AI originally predicted.
            corrected_label: Category the human confirmed as correct.
            source: Ingestion channel label (e.g. ``"human_feedback"``).
            original_confidence: AI confidence score at the time of correction.
            was_auto_applied: True if the correction bypassed human review.
            correction_count: Running count of corrections for this document type.
            counterparty_id: Optional FK to link the correction to a vendor.
        """
        vs = VectorStoreService(self._db, self._organization_id)
        row = await vs.record_category_feedback(
            content_text=content_text,
            suggested_label=suggested_label,
            corrected_label=corrected_label,
            source=source,
            original_confidence=original_confidence,
            was_auto_applied=was_auto_applied,
            correction_count=correction_count,
            counterparty_id=counterparty_id,
        )
        return str(row.id)
