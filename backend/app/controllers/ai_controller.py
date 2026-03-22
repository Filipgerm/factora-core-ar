"""AIController — SSE streaming for chat completions."""
from __future__ import annotations

import json
from collections.abc import AsyncIterator

from app.services.ai_service import AIService


class AIController:
    def __init__(self, service: AIService) -> None:
        self._service = service

    async def stream_chat_sse(self, message: str) -> AsyncIterator[bytes]:
        async for chunk in self._service.stream_chat(message):
            payload = json.dumps({"chunk": chunk}, ensure_ascii=False)
            yield f"data: {payload}\n\n".encode("utf-8")
