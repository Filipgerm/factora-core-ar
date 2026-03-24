"""AIController — SSE streaming and AI feedback for active learning."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

from app.models.ai import AIFeedbackRequest, AIFeedbackResponse
from app.services.ai_service import AIService


class AIController:
    def __init__(self, service: AIService) -> None:
        self._service = service

    async def stream_chat_sse(self, message: str) -> AsyncIterator[bytes]:
        async for chunk in self._service.stream_chat(message):
            payload = json.dumps({"chunk": chunk}, ensure_ascii=False)
            yield f"data: {payload}\n\n".encode("utf-8")

    async def submit_feedback(self, req: AIFeedbackRequest) -> AIFeedbackResponse:
        eid = await self._service.submit_feedback(
            content_text=req.content_text,
            suggested_label=req.suggested_label,
            corrected_label=req.corrected_label,
            source=req.source,
        )
        return AIFeedbackResponse(embedding_id=eid)
