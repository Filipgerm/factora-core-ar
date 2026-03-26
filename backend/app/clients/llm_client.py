"""LLMClient — Gemini API or OpenAI-compatible (LM Studio) chat, JSON, vision, stream.

Embeddings delegate to ``app.services.embeddings.backend`` so VectorStoreService stays aligned.
"""
from __future__ import annotations

import base64
import json
import logging
from typing import Any

from openai import AsyncOpenAI

from app.config import settings
from app.services.embeddings.backend import embed_single

logger = logging.getLogger(__name__)


def _messages_to_prompt(messages: list[dict[str, str]]) -> tuple[str, str]:
    """Split OpenAI-style messages into (system_instruction, user_text)."""
    sys_chunks: list[str] = []
    user_chunks: list[str] = []
    for m in messages:
        role = m.get("role", "")
        content = (m.get("content") or "").strip()
        if not content:
            continue
        if role == "system":
            sys_chunks.append(content)
        elif role == "user":
            user_chunks.append(content)
        else:
            user_chunks.append(f"[{role}]: {content}")
    return "\n\n".join(sys_chunks), "\n\n".join(user_chunks) or "."


class LLMClient:
    """Chat/vision/stream via Gemini or OpenAI-compatible server; embeddings via shared backend."""

    def __init__(self) -> None:
        self._openai: AsyncOpenAI | None = None
        self._genai_client: Any = None
        if settings.LLM_PROVIDER == "openai_compatible" and (settings.LLM_COMPAT_BASE_URL or "").strip():
            self._openai = AsyncOpenAI(
                api_key=settings.LLM_COMPAT_API_KEY,
                base_url=settings.LLM_COMPAT_BASE_URL.strip().rstrip("/"),
            )
        elif settings.LLM_PROVIDER == "gemini" and (settings.GEMINI_API_KEY or "").strip():
            from google import genai

            self._genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def _require_openai(self) -> AsyncOpenAI:
        if not self._openai:
            raise RuntimeError(
                "OpenAI-compatible client not configured (set LLM_PROVIDER=openai_compatible and LLM_COMPAT_BASE_URL)"
            )
        return self._openai

    def _require_gemini(self) -> Any:
        if not self._genai_client:
            raise RuntimeError(
                "Gemini client not configured (set LLM_PROVIDER=gemini and GEMINI_API_KEY)"
            )
        return self._genai_client

    async def chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
    ) -> str:
        if settings.demo_mode:
            return json.dumps(
                {"demo": True, "reply": "Demo mode: LLM call skipped."},
                ensure_ascii=False,
            )
        if settings.LLM_PROVIDER == "openai_compatible":
            client = self._require_openai()
            m = model or settings.GEMINI_CHAT_MODEL
            resp = await client.chat.completions.create(
                model=m,
                messages=messages,
                temperature=temperature,
            )
            return (resp.choices[0].message.content or "") if resp.choices else ""

        from google.genai import types

        sys_i, user_t = _messages_to_prompt(messages)
        client = self._require_gemini()
        m = model or settings.GEMINI_CHAT_MODEL
        cfg = types.GenerateContentConfig(
            temperature=temperature,
            system_instruction=sys_i or None,
        )
        resp = await client.aio.models.generate_content(
            model=m,
            contents=user_t,
            config=cfg,
        )
        return (resp.text or "").strip()

    async def chat_completion_json(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        if settings.demo_mode:
            return {"demo": True, "vendor": "Demo Supplier", "total": "0.00", "vat_rate": "24"}
        if settings.LLM_PROVIDER == "openai_compatible":
            client = self._require_openai()
            m = model or settings.GEMINI_CHAT_MODEL
            resp = await client.chat.completions.create(
                model=m,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=temperature,
            )
            raw = resp.choices[0].message.content or "{}"
            return json.loads(raw)

        from google.genai import types

        sys_i, user_t = _messages_to_prompt(messages)
        client = self._require_gemini()
        m = model or settings.GEMINI_CHAT_MODEL
        cfg = types.GenerateContentConfig(
            temperature=temperature,
            response_mime_type="application/json",
            system_instruction=sys_i or None,
        )
        resp = await client.aio.models.generate_content(
            model=m,
            contents=user_t,
            config=cfg,
        )
        raw = (resp.text or "").strip() or "{}"
        return json.loads(raw)

    async def chat_completion_json_vision(
        self,
        *,
        system_message: str,
        user_text: str,
        image_base64: str,
        image_mime_type: str,
        model: str | None = None,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        if settings.demo_mode:
            return {
                "demo": True,
                "description": "Demo vision extraction",
                "amount": 0.0,
                "vendor": "Demo Supplier",
                "category": "uncategorized",
                "is_recurring": False,
                "confidence": 0.5,
                "summary": "Demo mode skipped vision model.",
                "currency": "EUR",
                "vat_rate": "",
                "line_items": [],
            }
        raw_bytes = base64.b64decode(image_base64, validate=False)

        if settings.LLM_PROVIDER == "openai_compatible":
            client = self._require_openai()
            m = model or settings.GEMINI_CHAT_MODEL
            data_url = f"data:{image_mime_type};base64,{image_base64}"
            oa_messages: list[dict[str, Any]] = [
                {"role": "system", "content": system_message},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ]
            resp = await client.chat.completions.create(
                model=m,
                messages=oa_messages,
                response_format={"type": "json_object"},
                temperature=temperature,
            )
            txt = resp.choices[0].message.content or "{}"
            return json.loads(txt)

        from google import genai
        from google.genai import types

        client = self._require_gemini()
        m = model or settings.GEMINI_CHAT_MODEL
        parts = [
            types.Part.from_text(text=user_text),
            types.Part.from_bytes(data=raw_bytes, mime_type=image_mime_type),
        ]
        cfg = types.GenerateContentConfig(
            temperature=temperature,
            response_mime_type="application/json",
            system_instruction=system_message or None,
        )
        resp = await client.aio.models.generate_content(
            model=m,
            contents=[types.Content(role="user", parts=parts)],
            config=cfg,
        )
        raw = (resp.text or "").strip() or "{}"
        return json.loads(raw)

    async def embedding_for_text(self, text: str) -> list[float]:
        if settings.demo_mode:
            dim = max(1, int(settings.EMBEDDING_DIMENSIONS))
            return [0.0] * dim
        return await embed_single(text)

    async def stream_chat_completion(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
    ):
        if settings.demo_mode:
            yield "Demo mode: "
            yield "no live LLM stream."
            return

        if settings.LLM_PROVIDER == "openai_compatible":
            client = self._require_openai()
            m = model or settings.GEMINI_CHAT_MODEL
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
            return

        from google.genai import types

        sys_i, user_t = _messages_to_prompt(messages)
        client = self._require_gemini()
        m = model or settings.GEMINI_CHAT_MODEL
        cfg = types.GenerateContentConfig(system_instruction=sys_i or None)
        stream = await client.aio.models.generate_content_stream(
            model=m,
            contents=user_t,
            config=cfg,
        )
        async for chunk in stream:
            if chunk.text:
                yield chunk.text
