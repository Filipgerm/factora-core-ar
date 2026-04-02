"""LangGraph nodes for document ingestion (Gmail-ready attachment + text pipeline).

**Flow:**
    1. ``materialize`` — decode base64 attachment; PDFs append extracted text to
       ``raw_text``; images set ``vision_image_*`` for the extract node.
    2. ``validate`` — require non-empty text and/or a staged vision image.
    3. ``context`` — pgvector neighbors via ``vector_store_factory``, queried from
       raw email metadata BEFORE extraction so hints reach the LLM.
    4. ``extract`` — LLM JSON (text or vision) with ERP fields + confidence;
       receives ``neighbors`` as a formatted hint block in the user message.
    5. ``resolve_counterparty`` — maps the extracted vendor name/VAT number to an
       existing Counterparty row; Phase 1 exact VAT lookup, Phase 2 embedding
       similarity over counterparty-linked embeddings.
    6. ``check_recurrence`` — DB temporal-pattern check using the resolved
       counterparty FK (or vendor ILIKE fallback for new vendors); overrides
       the LLM's ``is_recurring`` when ≥ 3 distinct months with avg gap ≤ 3.
    7. ``finalize`` — embedding via ``LLMClient.embedding_for_text``, merge
       ``requires_human_review`` using ``INGESTION_CONFIDENCE_AUTO_APPLY_THRESHOLD``.

**Side effects:** LLM HTTP when not in demo mode; vector search and invoice history
queries scoped by ``organization_id``. Agents do not call Gmail.
"""

from __future__ import annotations

import base64
import logging
import re
from io import BytesIO
from typing import Any

from pypdf import PdfReader
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.base import INGESTION_CONFIDENCE_AUTO_APPLY_THRESHOLD
from app.db.models.counterparty import Counterparty
from app.db.models.invoices import Invoice
from app.agents.ingestion.constants import (
    COUNTERPARTY_RESOLVE_MAX_DISTANCE,
    EXTRACT_RAW_TEXT_MAX_CHARS,
    MAX_ATTACHMENT_BYTES,
    SIMILARITY_QUERY_MAX_CHARS,
    SIMILARITY_SEARCH_TOP_K,
    VISION_IMAGE_MIME_TYPES,
)
from app.agents.ingestion.prompts import (
    EXTRACT_SYSTEM_MESSAGE,
    EXTRACT_VISION_SYSTEM_MESSAGE,
    format_context_hints,
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

    async def validate(self, state: IngestionState) -> IngestionState | None:
        if "result" in state:
            return state
        has_text = bool((state.get("raw_text") or "").strip())
        has_vision = bool(state.get("vision_image_base64"))
        if not has_text and not has_vision:
            return {**state, "result": {"error": "empty_text"}}
        return None  # LangGraph treats None as "no state update" — skip to next node.

    async def context(self, state: IngestionState) -> IngestionState:
        """Fetch pgvector neighbors BEFORE extraction using raw email metadata.

        Querying from email subject/sender + raw text means the LLM has access
        to organisation-historical context (including human corrections) when it
        makes its extraction decisions in the ``extract`` node.
        """
        if "result" in state:
            return state
        factory = self._vector_store_factory(state)
        if factory is None:
            return {**state, "neighbors": []}
        db: AsyncSession = state["db"]
        vs = factory(db, state["organization_id"])
        # Use pre-extraction signals: email subject and sender give the clearest
        # semantic signal; fall back to the raw document body.
        header_parts = [
            str(state.get("email_subject") or ""),
            str(state.get("email_from") or ""),
        ]
        query_text = (
            "\n".join(p for p in header_parts if p).strip()
            or (state.get("raw_text") or "")[:SIMILARITY_QUERY_MAX_CHARS]
        )
        try:
            neighbors = await vs.similarity_search(
                query_text[:SIMILARITY_QUERY_MAX_CHARS],
                k=SIMILARITY_SEARCH_TOP_K,
            )
        except Exception as e:
            logger.warning("similarity search skipped: %s", e)
            neighbors = []
        return {**state, "neighbors": neighbors}

    async def extract(self, state: IngestionState) -> IngestionState:
        if "result" in state:
            return state
        llm = self._llm(state)
        neighbors = state.get("neighbors") or []
        hints = format_context_hints(neighbors)

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
                "issue_date": "",
                "due_date": "",
            }
            return {**state, "extracted": extracted}

        if state.get("vision_image_base64") and state.get("vision_image_mime"):
            user_text = format_vision_user_content(
                email_subject=state.get("email_subject") or "",
                email_from=state.get("email_from") or "",
                body_hint=state.get("raw_text") or "",
                hints=hints,
            )
            extracted = await llm.chat_completion_json_vision(
                system_message=EXTRACT_VISION_SYSTEM_MESSAGE,
                user_text=user_text,
                image_base64=state["vision_image_base64"],
                image_mime_type=state["vision_image_mime"],
            )
            return {**state, "extracted": extracted}

        truncated = state["raw_text"][:EXTRACT_RAW_TEXT_MAX_CHARS]
        messages = [
            {"role": "system", "content": EXTRACT_SYSTEM_MESSAGE},
            {"role": "user", "content": format_extract_user_content(truncated, hints)},
        ]
        extracted = await llm.chat_completion_json(messages)
        return {**state, "extracted": extracted}

    async def resolve_counterparty(self, state: IngestionState) -> IngestionState:
        """Map the extracted vendor to an existing Counterparty record in the DB.

        **Phase 1 — VAT number lookup (exact, high precision):**
            If the LLM extracted a ``vendor_vat_number``, query ``counterparties``
            by ``(organization_id, vat_number)`` after upper-casing and stripping
            whitespace from both sides. Greek AFM (ΑΦΜ) and EU VAT IDs are handled
            identically. If matched, short-circuit — no embedding call needed.

        **Phase 2 — Embedding similarity (fuzzy, bounded by COUNTERPARTY_RESOLVE_MAX_DISTANCE):**
            Embed the extracted vendor name string, then query
            ``organization_embeddings`` restricted to rows that already carry a
            ``counterparty_id`` FK. The nearest embedding whose cosine distance is
            below the threshold wins. This handles name variants ("AWS",
            "Amazon Web Services", "Amazon Ireland Ltd") that share the same
            counterparty row without needing exact string matching.

        Sets ``state["resolved_counterparty_id"]`` to the matched UUID or ``None``.
        Downstream nodes (``check_recurrence``) and ``finalize`` consume this key.
        """
        if "result" in state:
            return state

        ext = state.get("extracted") or {}
        org_id = state["organization_id"]
        db: AsyncSession = state["db"]

        # --- Phase 1: exact VAT number match ---
        raw_vat = (ext.get("vendor_vat_number") or "").strip().upper().replace(" ", "")
        if raw_vat:
            try:
                cp_id = await db.scalar(
                    select(Counterparty.id)
                    .where(
                        Counterparty.organization_id == org_id,
                        func.upper(func.replace(Counterparty.vat_number, " ", ""))
                        == raw_vat,
                        Counterparty.deleted_at.is_(None),
                    )
                    .limit(1)
                )
                if cp_id:
                    logger.debug("resolve_counterparty: VAT match → %s", cp_id)
                    return {**state, "resolved_counterparty_id": str(cp_id)}
            except Exception as e:
                logger.warning("resolve_counterparty VAT lookup failed: %s", e)

        # --- Phase 2: embedding similarity over counterparty-linked rows ---
        vendor = (ext.get("vendor") or "").strip()
        if not vendor:
            return {**state, "resolved_counterparty_id": None}

        llm = self._llm(state)
        try:
            vec = await llm.embedding_for_text(vendor)
        except Exception as e:
            logger.warning("resolve_counterparty embedding failed: %s", e)
            return {**state, "resolved_counterparty_id": None}

        # Raw SQL is required here: SQLAlchemy ORM has no native binding for the
        # pgvector `<=>` cosine-distance operator. `qv` is safe because every
        # element was coerced to float() before string-formatting; `oid` is a
        # named bind parameter handled by SQLAlchemy's parameterisation layer.
        qv = "[" + ",".join(str(float(x)) for x in vec) + "]"
        sql = text(
            """
            SELECT counterparty_id::text,
                   (embedding <=> CAST(:qv AS vector)) AS distance
            FROM organization_embeddings
            WHERE organization_id = CAST(:oid AS uuid)
              AND counterparty_id IS NOT NULL
            ORDER BY embedding <=> CAST(:qv AS vector)
            LIMIT 1
            """
        )
        try:
            res = await db.execute(sql, {"qv": qv, "oid": org_id})
            row = res.mappings().first()
        except Exception as e:
            logger.warning("resolve_counterparty similarity query failed: %s", e)
            return {**state, "resolved_counterparty_id": None}

        if row and float(row["distance"]) < COUNTERPARTY_RESOLVE_MAX_DISTANCE:
            logger.debug(
                "resolve_counterparty: embedding match dist=%.3f → %s",
                row["distance"],
                row["counterparty_id"],
            )
            return {**state, "resolved_counterparty_id": str(row["counterparty_id"])}

        return {**state, "resolved_counterparty_id": None}

    async def check_recurrence(self, state: IngestionState) -> IngestionState:
        """Override the LLM's is_recurring flag using real invoice history.

        Strategy:
          1. Prefer the ``resolved_counterparty_id`` from the preceding node for an
             exact FK join — this correctly groups "AWS", "Amazon Web Services", and
             "Amazon Ireland Ltd" under one counterparty.  Falls back to
             case-insensitive vendor name matching for new vendors not yet in the DB.
          2. Among matched invoices, retain only "attribute-similar" ones: amount
             within ±25% of the extracted amount (when known). Falls back to all
             matched rows when fewer than 3 similar ones exist.
          3. Extract distinct calendar (year, month) pairs from those invoices.
          4. Sort chronologically; compute average gap between consecutive months.
             Gap ≤ 3 covers monthly, bi-monthly, and quarterly billing cycles.
          5. count ≥ 3 AND avg gap ≤ 3 → mark is_recurring=True (hard override).
        """
        if "result" in state:
            return state
        ext = dict(state.get("extracted") or {})
        db: AsyncSession = state["db"]
        org_id = state["organization_id"]
        extracted_amount = _coerce_float(ext.get("amount"))
        counterparty_id = state.get("resolved_counterparty_id")

        if counterparty_id:
            # Precise path: FK join — handles all vendor name variants correctly.
            q = select(Invoice.amount, Invoice.issue_date).where(
                Invoice.organization_id == org_id,
                Invoice.counterparty_id == counterparty_id,
                Invoice.deleted_at.is_(None),
                Invoice.issue_date.is_not(None),
            )
        else:
            # Fallback: substring ILIKE for vendors not yet in the DB.
            # Escape LIKE metacharacters so a vendor named "50%" can't widen the
            # match; then wrap in % for case-insensitive substring search.
            vendor = (ext.get("vendor") or "").strip()
            if not vendor:
                return {**state, "recurrence_months_found": 0}
            safe_vendor = (
                vendor.replace("!", "!!").replace("%", "!%").replace("_", "!_")
            )
            q = select(Invoice.amount, Invoice.issue_date).where(
                Invoice.organization_id == org_id,
                Invoice.counterparty_display_name.ilike(f"%{safe_vendor}%", escape="!"),
                Invoice.deleted_at.is_(None),
                Invoice.issue_date.is_not(None),
            )

        try:
            result = await db.execute(q)
            rows = result.all()
        except Exception as e:
            logger.warning("check_recurrence DB query failed: %s", e)
            return {**state, "recurrence_months_found": 0}

        if not rows:
            return {**state, "recurrence_months_found": 0}

        # Prefer amount-similar invoices; fall back to all vendor matches if sparse.
        if extracted_amount and extracted_amount > 0:
            similar_dates = [
                r.issue_date
                for r in rows
                if r.amount is not None
                and float(r.amount) > 0
                and abs(float(r.amount) - extracted_amount)
                / max(float(r.amount), extracted_amount)
                <= 0.25
            ]
            if len(similar_dates) < 3:
                similar_dates = [r.issue_date for r in rows]
        else:
            similar_dates = [r.issue_date for r in rows]

        # Count distinct calendar months.
        months = sorted({(d.year, d.month) for d in similar_dates if d})
        month_count = len(months)

        if month_count >= 3:
            # Verify a consistent billing cadence: avg gap ≤ 3 calendar months.
            gaps = [
                (months[i + 1][0] - months[i][0]) * 12
                + (months[i + 1][1] - months[i][1])
                for i in range(len(months) - 1)
            ]
            avg_gap = sum(gaps) / len(gaps)
            if avg_gap <= 3:
                ext["is_recurring"] = True

        return {**state, "extracted": ext, "recurrence_months_found": month_count}

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
            "line_items": (
                ext.get("line_items") if isinstance(ext.get("line_items"), list) else []
            ),
            "issue_date": (str(ext.get("issue_date") or "")).strip(),
            "due_date": (str(ext.get("due_date") or "")).strip(),
        }

        return {
            **state,
            "result": {
                **invoice_payload,
                "requires_human_review": requires_human_review,
                "vector_hints": state.get("neighbors", []),
                "resolved_counterparty_id": state.get("resolved_counterparty_id"),
                "recurrence_months_found": state.get("recurrence_months_found", 0),
                "extracted": ext,
            },
        }
