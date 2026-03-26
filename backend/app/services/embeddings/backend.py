"""Shared embedding backends for LLMClient and VectorStoreService.

**Scope:** Produce float vectors of length ``settings.EMBEDDING_DIMENSIONS`` using
the Gemini API or OpenAI embeddings (``text-embedding-3-*`` supports a ``dimensions``
parameter aligned with the DB column).

**Contract:** Async functions; raise ``ValidationError`` / ``ExternalServiceError`` from
``app.core.exceptions`` on misconfiguration or provider failure.
"""

from __future__ import annotations

import logging
from typing import Sequence

from app.config import settings
from app.core.exceptions import ExternalServiceError, ValidationError

logger = logging.getLogger(__name__)


def _require_gemini_key() -> str:
    k = (settings.GEMINI_API_KEY or "").strip()
    if not k:
        raise ValidationError(
            "Gemini API key is not configured.",
            code="config.gemini_missing",
            fields={"GEMINI_API_KEY": "Required when EMBEDDING_PROVIDER=gemini"},
        )
    return k


def _require_openai_key() -> str:
    k = (settings.OPENAI_API_KEY or "").strip()
    if not k:
        raise ValidationError(
            "OpenAI API key is not configured.",
            code="config.openai_missing",
            fields={"OPENAI_API_KEY": "Required when EMBEDDING_PROVIDER=openai"},
        )
    return k


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Batch-embed non-empty strings; skip empty inputs in place."""
    if not texts:
        return []
    if settings.demo_mode:
        dim = max(1, int(settings.EMBEDDING_DIMENSIONS))
        return [[0.0] * dim for _ in texts]

    provider = settings.EMBEDDING_PROVIDER
    if provider == "gemini":
        return await _embed_gemini(texts)
    if provider == "openai":
        return await _embed_openai(texts)
    raise ValidationError(
        f"Unknown EMBEDDING_PROVIDER: {provider}",
        code="config.embedding_provider",
        fields={"EMBEDDING_PROVIDER": str(provider)},
    )


async def embed_single(text: str) -> list[float]:
    """Single string → one vector (empty string → [])."""
    t = text.strip()
    if not t:
        return []
    vecs = await embed_texts([t])
    return vecs[0] if vecs else []


def _truncate(vec: Sequence[float], dim: int) -> list[float]:
    v = list(vec)
    if len(v) == dim:
        return v
    if len(v) > dim:
        return v[:dim]
    if len(v) < dim:
        return v + [0.0] * (dim - len(v))
    return v


async def _embed_gemini(texts: list[str]) -> list[list[float]]:
    from google import genai
    from google.genai import types

    _require_gemini_key()
    dim = int(settings.EMBEDDING_DIMENSIONS)
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    try:
        resp = await client.aio.models.embed_content(
            model=settings.GEMINI_EMBEDDING_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(output_dimensionality=dim),
        )
    except Exception as e:
        logger.error("Gemini embedding failed: %s", e)
        raise ExternalServiceError(
            "Failed to generate embeddings.",
            code="external.gemini_embedding",
        ) from e
    if not resp.embeddings:
        raise ExternalServiceError(
            "Empty embedding response from Gemini.",
            code="external.gemini_embedding_empty",
        )
    return [_truncate(e.values, dim) for e in resp.embeddings]


async def _embed_openai(texts: list[str]) -> list[list[float]]:
    from openai import AsyncOpenAI

    _require_openai_key()
    dim = int(settings.EMBEDDING_DIMENSIONS)
    model = (settings.OPENAI_EMBEDDING_MODEL or "text-embedding-3-small").strip()
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    kwargs: dict = {"model": model, "input": texts}
    if model.startswith("text-embedding-3"):
        kwargs["dimensions"] = dim
    try:
        resp = await client.embeddings.create(**kwargs)
    except Exception as e:
        logger.error("OpenAI embedding failed: %s", e)
        raise ExternalServiceError(
            "Failed to generate embeddings.",
            code="external.openai_embedding",
        ) from e
    if not resp.data:
        raise ExternalServiceError(
            "Empty embedding response from OpenAI.",
            code="external.openai_embedding_empty",
        )
    # Preserve input order
    by_index = sorted(resp.data, key=lambda d: d.index)
    return [_truncate(item.embedding, dim) for item in by_index]
