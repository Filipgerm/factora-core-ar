"""LLMClient — thin async wrappers for OpenAI and optional Anthropic chat APIs.

No business logic: callers supply message lists and receive assistant text.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)


class LLMClient:
    """Minimal chat-completion facade for agents and streaming endpoints."""

    def __init__(self) -> None:
        self._openai: AsyncOpenAI | None = None
        if settings.OPENAI_API_KEY:
            self._openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    def _require_openai(self) -> AsyncOpenAI:
        if not self._openai:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        return self._openai

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        """Return assistant plain text (OpenAI Chat Completions)."""
        if settings.demo_mode:
            return json.dumps(
                {"demo": True, "reply": "Demo mode: LLM call skipped."},
                ensure_ascii=False,
            )
        client = self._require_openai()
        m = model or settings.OPENAI_CHAT_MODEL
        resp = await client.chat.completions.create(
            model=m,
            messages=messages,
            temperature=temperature,
        )
        choice = resp.choices[0].message.content
        return choice or ""

    async def chat_completion_json(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
    ) -> dict[str, Any]:
        """Ask the model for a JSON object (response_format json_object)."""
        if settings.demo_mode:
            return {"demo": True, "vendor": "Demo Supplier", "total": "0.00", "vat_rate": "24"}
        client = self._require_openai()
        m = model or settings.OPENAI_CHAT_MODEL
        resp = await client.chat.completions.create(
            model=m,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        raw = resp.choices[0].message.content or "{}"
        return json.loads(raw)

    async def stream_chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
    ):
        """Yield text deltas from OpenAI streaming chat."""
        if settings.demo_mode:
            yield "Demo mode: "
            yield "no live LLM stream."
            return
        client = self._require_openai()
        m = model or settings.OPENAI_CHAT_MODEL
        stream = await client.chat.completions.create(
            model=m,
            messages=messages,
            stream=True,
        )
        async for event in stream:
            if not event.choices:
                continue
            delta = event.choices[0].delta.content
            if delta:
                yield delta
