"""Shared embedding backends for LLMClient and VectorStoreService.

**Scope:** Produce float vectors of length ``settings.EMBEDDING_DIMENSIONS`` using
the Gemini API or OpenAI embeddings (``text-embedding-3-*`` supports a ``dimensions``
parameter aligned with the DB column).

**Why not Anthropic here:** ``LLM_PROVIDER=anthropic`` selects Claude for chat/JSON/vision
only. Anthropic does not ship a first-party text-embedding API for vector search; their
docs recommend separate embedding providers (e.g. Voyage). So ``EMBEDDING_PROVIDER`` stays
``gemini`` or ``openai`` even when agents call Claude — keys are ``GEMINI_API_KEY`` /
``OPENAI_API_KEY``, not ``ANTHROPIC_API_KEY``.

**Gemini quota isolation:** When ``GEMINI_EMBEDDING_API_KEY`` is set, embedding calls use
that key exclusively so they draw from a separate Google AI Studio project quota and do
not contend with ``GEMINI_API_KEY`` used by the chat/vision model. When the field is empty,
``GEMINI_API_KEY`` is used as the fallback.  The correct embedding model for AI Studio is
``text-embedding-004`` (set via ``GEMINI_EMBEDDING_MODEL``). Do not use Vertex AI model
names such as ``textembedding-gecko`` — they are not served by the AI Studio endpoint.

**Contract:** Async functions; raise ``ValidationError`` / ``ExternalServiceError`` from
``app.core.exceptions`` on misconfiguration or provider failure.
"""

from __future__ import annotations

import logging
from typing import Sequence

from app.config import settings
from app.core.exceptions import ExternalServiceError, ValidationError

logger = logging.getLogger(__name__)


def _require_gemini_embedding_key() -> str:
    """Return the dedicated embedding key when set, falling back to the chat key."""
    k = (settings.GEMINI_EMBEDDING_API_KEY or "").strip() or (settings.GEMINI_API_KEY or "").strip()
    if not k:
        raise ValidationError(
            "No Gemini API key is configured for embeddings.",
            code="config.gemini_missing",
            fields={
                "GEMINI_EMBEDDING_API_KEY": "Preferred — separate AI Studio project key for embeddings",
                "GEMINI_API_KEY": "Fallback when GEMINI_EMBEDDING_API_KEY is empty",
            },
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

    api_key = _require_gemini_embedding_key()
    dim = int(settings.EMBEDDING_DIMENSIONS)
    client = genai.Client(api_key=api_key)
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
