"""AIService — org-scoped streaming chat for future Vercel AI SDK consumers."""
from __future__ import annotations

from collections.abc import AsyncIterator

from app.clients.llm_client import LLMClient


class AIService:
    def __init__(self, organization_id: str) -> None:
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
