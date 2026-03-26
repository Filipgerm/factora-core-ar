"""Shared embedding backends for LLMClient and VectorStoreService.

**Scope:** Produce float vectors of length ``settings.EMBEDDING_DIMENSIONS`` using
Gemini API, sentence-transformers (optional group ``local_ml``), or an OpenAI-compatible
embedding endpoint (LM Studio).

**Contract:** Async functions; raise ``ValidationError`` / ``ExternalServiceError`` from
``app.core.exceptions`` on misconfiguration or provider failure.
"""

from __future__ import annotations

import logging
from typing import Sequence

import anyio
import httpx

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
    if provider == "sentence_transformers":
        return await _embed_sentence_transformers(texts)
    if provider == "openai_compatible":
        return await _embed_openai_compatible(texts)
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


def _sentence_transformer_encode(texts: list[str]) -> list[list[float]]:
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as e:
        raise ValidationError(
            "sentence-transformers is not installed. Use: uv sync --group local_ml",
            code="config.sentence_transformers_missing",
            fields={"EMBEDDING_PROVIDER": "sentence_transformers requires optional deps"},
        ) from e

    model_name = settings.SENTENCE_TRANSFORMER_MODEL
    # Module-level cache
    if not hasattr(_sentence_transformer_encode, "_model"):
        setattr(_sentence_transformer_encode, "_model", SentenceTransformer(model_name))
    model = getattr(_sentence_transformer_encode, "_model")
    raw = model.encode(texts, convert_to_numpy=True, normalize_embeddings=False)
    dim = int(settings.EMBEDDING_DIMENSIONS)
    return [_truncate(row.tolist(), dim) for row in raw]


async def _embed_sentence_transformers(texts: list[str]) -> list[list[float]]:
    try:
        return await anyio.to_thread.run_sync(lambda: _sentence_transformer_encode(texts))
    except ValidationError:
        raise
    except Exception as e:
        logger.error("sentence-transformers embedding failed: %s", e)
        raise ExternalServiceError(
            "Failed to generate local embeddings.",
            code="external.local_embedding",
        ) from e


async def _embed_openai_compatible(texts: list[str]) -> list[list[float]]:
    base = (settings.LLM_COMPAT_BASE_URL or "").strip().rstrip("/")
    if not base:
        raise ValidationError(
            "LLM_COMPAT_BASE_URL is required for openai_compatible embeddings.",
            code="config.llm_compat_base_missing",
            fields={"LLM_COMPAT_BASE_URL": "Set to LM Studio server /v1 base"},
        )
    url = f"{base}/embeddings"
    headers = {"Authorization": f"Bearer {settings.LLM_COMPAT_API_KEY}"}
    dim = int(settings.EMBEDDING_DIMENSIONS)
    out: list[list[float]] = []
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            for t in texts:
                r = await client.post(
                    url,
                    headers=headers,
                    json={"model": settings.GEMINI_EMBEDDING_MODEL, "input": t[:8000]},
                )
                r.raise_for_status()
                data = r.json()
                emb = data["data"][0]["embedding"]
                out.append(_truncate(emb, dim))
        return out
    except Exception as e:
        logger.error("OpenAI-compatible embedding failed: %s", e)
        raise ExternalServiceError(
            "Failed to generate embeddings from local server.",
            code="external.local_openai_embedding",
        ) from e
