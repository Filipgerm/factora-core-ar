"""LangGraph nodes for document ingestion (Gmail-ready attachment + text pipeline).

**Flow:**
    1. ``materialize`` — decode base64 attachment; PDFs append extracted text to
       ``raw_text``; images set ``vision_image_*`` for the extract node.
    2. ``validate`` — require non-empty text and/or a staged vision image.
    3. ``extract`` — LLM JSON (text or vision) with ERP fields + confidence.
    4. ``context`` — optional pgvector neighbors via ``vector_store_factory``.
    5. ``finalize`` — embedding via ``LLMClient.embedding_for_text``, merge
       ``requires_human_review`` using ``INGESTION_CONFIDENCE_AUTO_APPLY_THRESHOLD``.

**Side effects:** OpenAI HTTP when not in demo mode; optional vector search scoped by
``organization_id``. Agents do not call Gmail — a service supplies bytes/metadata.
"""

from __future__ import annotations

import base64
import logging
import re
from io import BytesIO
from typing import Any

from pypdf import PdfReader
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import INGESTION_CONFIDENCE_AUTO_APPLY_THRESHOLD
from app.agents.ingestion.constants import (
    EXTRACT_RAW_TEXT_MAX_CHARS,
    MAX_ATTACHMENT_BYTES,
    SIMILARITY_QUERY_MAX_CHARS,
    SIMILARITY_SEARCH_TOP_K,
    VISION_IMAGE_MIME_TYPES,
)
from app.agents.ingestion.prompts import (
    EXTRACT_SYSTEM_MESSAGE,
    EXTRACT_VISION_SYSTEM_MESSAGE,
    format_extract_user_content,
    format_vision_user_content,
)
from app.agents.ingestion.state import IngestionState
from app.clients.llm_client import LLMClient
from app.config import settings

logger = logging.getLogger(__name__)


def _extract_pdf_text(data: bytes) -> str:
    """Best-effort PDF text extraction for ingestion (no OCR)."""
    try:
        reader = PdfReader(BytesIO(data))
        parts: list[str] = []
        for page in reader.pages:
            t = page.extract_text() or ""
            if t.strip():
                parts.append(t)
        return "\n".join(parts).strip()
    except Exception as e:
        logger.warning("pdf text extraction failed: %s", e)
        return ""


def _coerce_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, str):
        cleaned = re.sub(r"[,\s]", "", value.strip())
        # European-style 1.234,56 → naive normalize
        if cleaned.count(",") == 1 and cleaned.count(".") == 0:
            cleaned = cleaned.replace(",", ".")
        elif cleaned.count(",") == 1 and cleaned.count(".") >= 1:
            cleaned = cleaned.replace(",", "")
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _coerce_confidence(value: Any) -> float:
    try:
        c = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, c))


class IngestionNodes:
    """Node callables; optional ``llm`` / ``vector_store_factory`` come from state."""

    def __init__(self) -> None:
        self._default_llm = LLMClient()

    def _llm(self, state: IngestionState) -> Any:
        return state.get("llm") or self._default_llm

    def _vector_store_factory(self, state: IngestionState):
        return state.get("vector_store_factory")

    async def materialize(self, state: IngestionState) -> IngestionState:
        """Decode optional Gmail attachment into text (PDF) or vision staging (image)."""
        if "result" in state:
            return state
        b64 = (state.get("attachment_base64") or "").strip()
        mime = (state.get("attachment_mime_type") or "").strip().lower()
        if not b64 or not mime:
            return state
        try:
            raw = base64.b64decode(b64, validate=True)
        except Exception:
            return {**state, "result": {"error": "invalid_attachment_encoding"}}
        if len(raw) > MAX_ATTACHMENT_BYTES:
            return {**state, "result": {"error": "attachment_too_large"}}

        if mime == "application/pdf":
            pdf_text = _extract_pdf_text(raw)
            prefix = (state.get("raw_text") or "").strip()
            merged = f"{prefix}\n\n{pdf_text}".strip() if pdf_text else prefix
            return {**state, "raw_text": merged}

        if mime in VISION_IMAGE_MIME_TYPES:
            return {
                **state,
                "vision_image_base64": b64,
                "vision_image_mime": mime,
            }

        return {**state, "result": {"error": "unsupported_attachment_type"}}

    async def validate(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        has_text = bool((state.get("raw_text") or "").strip())
        has_vision = bool(state.get("vision_image_base64"))
        if not has_text and not has_vision:
            return {**state, "result": {"error": "empty_text"}}
        return state

    async def extract(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        llm = self._llm(state)
        if state.get("vision_image_base64") and state.get("vision_image_mime"):
            user_text = format_vision_user_content(
                email_subject=state.get("email_subject") or "",
                email_from=state.get("email_from") or "",
                body_hint=state.get("raw_text") or "",
            )
            extracted = await llm.chat_completion_json_vision(
                system_message=EXTRACT_VISION_SYSTEM_MESSAGE,
                user_text=user_text,
                image_base64=state["vision_image_base64"],
                image_mime_type=state["vision_image_mime"],
            )
            return {**state, "extracted": extracted}

        if settings.demo_mode:
            extracted = {
                "description": "Demo SaaS subscription invoice",
                "amount": 120.0,
                "vendor": "Demo Vendor A.E.",
                "category": "software",
                "is_recurring": True,
                "confidence": 0.92,
                "summary": (
                    "Demo mode extraction. Subscription invoice from Demo Vendor A.E. "
                    "for €120.00; treated as recurring software spend."
                ),
                "currency": "EUR",
                "vat_rate": "24",
                "line_items": ["Platform fee — €120.00"],
            }
            return {**state, "extracted": extracted}

        truncated = state["raw_text"][:EXTRACT_RAW_TEXT_MAX_CHARS]
        messages = [
            {"role": "system", "content": EXTRACT_SYSTEM_MESSAGE},
            {"role": "user", "content": format_extract_user_content(truncated)},
        ]
        extracted = await llm.chat_completion_json(messages)
        return {**state, "extracted": extracted}

    async def context(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        factory = self._vector_store_factory(state)
        if factory is None:
            return {**state, "neighbors": []}
        db: AsyncSession = state["db"]
        vs = factory(db, state["organization_id"])
        ext = state.get("extracted") or {}
        query_parts = [
            str(ext.get("description") or ""),
            str(ext.get("vendor") or ""),
            str(ext.get("summary") or ""),
        ]
        query_text = "\n".join(p for p in query_parts if p).strip() or (
            state.get("raw_text") or ""
        )[:SIMILARITY_QUERY_MAX_CHARS]
        try:
            neighbors = await vs.similarity_search(
                query_text[:SIMILARITY_QUERY_MAX_CHARS],
                k=SIMILARITY_SEARCH_TOP_K,
            )
        except Exception as e:
            logger.warning("similarity search skipped: %s", e)
            neighbors = []
        return {**state, "neighbors": neighbors}

    async def finalize(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        ext = dict(state.get("extracted") or {})
        confidence = _coerce_confidence(ext.get("confidence"))
        amount = _coerce_float(ext.get("amount"))
        if amount is None and ext.get("amount") is not None:
            confidence = min(confidence, 0.6)

        embed_parts = [
            str(ext.get("description") or ""),
            str(ext.get("vendor") or ""),
            str(ext.get("category") or ""),
            str(ext.get("summary") or ""),
        ]
        embed_input = "\n".join(p for p in embed_parts if p).strip()
        if not embed_input:
            embed_input = (state.get("raw_text") or "")[:2000]

        llm = self._llm(state)
        try:
            embedding = await llm.embedding_for_text(embed_input)
        except Exception as e:
            logger.warning("ingestion embedding skipped: %s", e)
            embedding = []

        requires_human_review = confidence < INGESTION_CONFIDENCE_AUTO_APPLY_THRESHOLD

        invoice_payload = {
            "description": ext.get("description") or "",
            "amount": amount if amount is not None else 0.0,
            "vendor": ext.get("vendor") or "",
            "category": ext.get("category") or "uncategorized",
            "is_recurring": bool(ext.get("is_recurring")),
            "embedding": embedding,
            "confidence": confidence,
            "summary": ext.get("summary") or "",
            "currency": ext.get("currency") or "",
            "vat_rate": ext.get("vat_rate") or "",
            "line_items": ext.get("line_items") if isinstance(ext.get("line_items"), list) else [],
        }

        return {
            **state,
            "result": {
                **invoice_payload,
                "requires_human_review": requires_human_review,
                "vector_hints": state.get("neighbors", []),
                "extracted": ext,
            },
        }
