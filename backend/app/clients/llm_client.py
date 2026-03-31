"""LLMClient — Google Gemini, OpenAI, or Anthropic (Claude) chat, JSON, vision, stream.

Embeddings delegate to ``app.services.embeddings.backend`` so VectorStoreService stays aligned.

**Workflow (runtime):** Set ``LLM_PROVIDER`` to ``gemini``, ``openai``, or ``anthropic`` and
configure the matching API key and model env vars (see ``backend/.env.example``).

**Observability:** ``@traceable`` on each public method creates a LangSmith child span
inside any active LangGraph trace, capturing model name, messages, and raw response.
"""

from __future__ import annotations

import base64
import json
import logging
from typing import Any

from anthropic import NOT_GIVEN, AsyncAnthropic
from langsmith import traceable
from openai import AsyncOpenAI

from app.config import settings
from app.services.embeddings.backend import embed_single

logger = logging.getLogger(__name__)

_JSON_ONLY = (
    "Respond with a single valid JSON object only. No markdown fences or explanation."
)


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


def _anthropic_text_content(message: Any) -> str:
    parts: list[str] = []
    for block in message.content:
        if getattr(block, "type", None) == "text":
            parts.append(getattr(block, "text", "") or "")
    return "".join(parts).strip()


class LLMClient:
    """Chat/vision/stream via Gemini, OpenAI, or Anthropic; embeddings via shared backend."""

    def __init__(self) -> None:
        self._openai: AsyncOpenAI | None = None
        self._anthropic: AsyncAnthropic | None = None
        self._genai_client: Any = None

        if (
            settings.LLM_PROVIDER == "openai"
            and (settings.OPENAI_API_KEY or "").strip()
        ):
            self._openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        elif (
            settings.LLM_PROVIDER == "anthropic"
            and (settings.ANTHROPIC_API_KEY or "").strip()
        ):
            self._anthropic = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        elif (
            settings.LLM_PROVIDER == "gemini"
            and (settings.GEMINI_API_KEY or "").strip()
        ):
            from google import genai

            self._genai_client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def _require_openai(self) -> AsyncOpenAI:
        if not self._openai:
            raise RuntimeError(
                "OpenAI client not configured (set LLM_PROVIDER=openai and OPENAI_API_KEY)"
            )
        return self._openai

    def _require_anthropic(self) -> AsyncAnthropic:
        if not self._anthropic:
            raise RuntimeError(
                "Anthropic client not configured (set LLM_PROVIDER=anthropic and ANTHROPIC_API_KEY)"
            )
        return self._anthropic

    def _require_gemini(self) -> Any:
        if not self._genai_client:
            raise RuntimeError(
                "Gemini client not configured (set LLM_PROVIDER=gemini and GEMINI_API_KEY)"
            )
        return self._genai_client

    def _chat_model(self) -> str:
        if settings.LLM_PROVIDER == "openai":
            return settings.OPENAI_CHAT_MODEL
        if settings.LLM_PROVIDER == "anthropic":
            return settings.ANTHROPIC_CHAT_MODEL
        return settings.GEMINI_CHAT_MODEL

    @traceable(run_type="llm", name="chat_completion")
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
        m = model or self._chat_model()

        if settings.LLM_PROVIDER == "openai":
            client = self._require_openai()
            resp = await client.chat.completions.create(
                model=m,
                messages=messages,
                temperature=temperature,
            )
            return (resp.choices[0].message.content or "") if resp.choices else ""

        if settings.LLM_PROVIDER == "anthropic":
            sys_i, user_t = _messages_to_prompt(messages)
            client = self._require_anthropic()
            msg = await client.messages.create(
                model=m,
                max_tokens=8192,
                temperature=temperature,
                system=sys_i if sys_i else NOT_GIVEN,
                messages=[{"role": "user", "content": user_t}],
            )
            return _anthropic_text_content(msg)

        from google.genai import types

        sys_i, user_t = _messages_to_prompt(messages)
        client = self._require_gemini()
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

    @traceable(run_type="llm", name="chat_completion_json")
    async def chat_completion_json(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        if settings.demo_mode:
            return {
                "demo": True,
                "vendor": "Demo Supplier",
                "total": "0.00",
                "vat_rate": "24",
            }
        m = model or self._chat_model()

        if settings.LLM_PROVIDER == "openai":
            client = self._require_openai()
            resp = await client.chat.completions.create(
                model=m,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=temperature,
            )
            raw = resp.choices[0].message.content or "{}"
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("LLM returned invalid JSON: %s", raw[:200])
                return {}

        if settings.LLM_PROVIDER == "anthropic":
            sys_i, user_t = _messages_to_prompt(messages)
            client = self._require_anthropic()
            system = f"{_JSON_ONLY}\n\n{sys_i}".strip() if sys_i else _JSON_ONLY
            msg = await client.messages.create(
                model=m,
                max_tokens=8192,
                temperature=temperature,
                system=system,
                messages=[{"role": "user", "content": user_t}],
            )
            raw = _anthropic_text_content(msg) or "{}"
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("LLM returned invalid JSON: %s", raw[:200])
                return {}

        from google.genai import types

        sys_i, user_t = _messages_to_prompt(messages)
        client = self._require_gemini()
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

    @traceable(run_type="llm", name="chat_completion_json_vision")
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
        m = model or self._chat_model()

        if settings.LLM_PROVIDER == "openai":
            client = self._require_openai()
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

        if settings.LLM_PROVIDER == "anthropic":
            client = self._require_anthropic()
            system = f"{_JSON_ONLY}\n\n{system_message}".strip()
            msg = await client.messages.create(
                model=m,
                max_tokens=8192,
                temperature=temperature,
                system=system,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": image_mime_type,
                                    "data": image_base64,
                                },
                            },
                            {"type": "text", "text": user_text},
                        ],
                    }
                ],
            )
            raw = _anthropic_text_content(msg) or "{}"
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Vision LLM returned invalid JSON: %s", raw[:200])
                return {}

        from google import genai
        from google.genai import types

        client = self._require_gemini()
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

    @traceable(run_type="embedding", name="embedding_for_text", hide_inputs=True)
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

        m = model or self._chat_model()

        if settings.LLM_PROVIDER == "openai":
            client = self._require_openai()
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

        if settings.LLM_PROVIDER == "anthropic":
            sys_i, user_t = _messages_to_prompt(messages)
            client = self._require_anthropic()
            async with client.messages.stream(
                model=m,
                max_tokens=8192,
                system=sys_i if sys_i else NOT_GIVEN,
                messages=[{"role": "user", "content": user_t}],
            ) as stream:
                async for text in stream.text_stream:
                    yield text
            return

        from google.genai import types

        sys_i, user_t = _messages_to_prompt(messages)
        client = self._require_gemini()
        cfg = types.GenerateContentConfig(system_instruction=sys_i or None)
        stream = await client.aio.models.generate_content_stream(
            model=m,
            contents=user_t,
            config=cfg,
        )
        async for chunk in stream:
            if chunk.text:
                yield chunk.text
