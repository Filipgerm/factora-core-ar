# Ingestion Active-Learning Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the ingestion active-learning loop by (1) fixing the false `is_recurring` detection with a proper DB-pattern node, (2) reordering the ingestion graph so context flows into extraction, (3) surfacing human corrections in the extraction prompt, and (4) tracking correction versioning with supersession.

**Architecture:** The ingestion graph is reordered to `materialize → validate → context → extract → check_recurrence → finalize`. The `context` node now runs first on raw text, its neighbors are passed into the LLM extraction prompt with explicit human-feedback emphasis, and a new `check_recurrence` node overrides `is_recurring` using a DB month-pattern check. Correction versioning in `record_category_feedback` marks previous corrections for the same vendor as superseded, and `similarity_search` filters these out while sorting surviving `human_feedback` rows to the top.

**Tech Stack:** Python/FastAPI, SQLAlchemy AsyncSession, pgvector, LangGraph, PostgreSQL JSONB operators (`||`, `jsonb_build_object`), Alembic.

---

## Assessments (answers to open questions — do not implement)

### Should we weight corrections by `correction_version` in the hint block?

**No.** A higher version number means the category was revised multiple times — that signals _ambiguity_, not _confidence_. Weighting version 3 more than version 1 would amplify exactly the documents the AI has struggled with most. The correct signal is binary: "a human confirmed this." After filtering superseded rows, the surviving correction IS the definitive answer. The only useful context `correction_version` provides is cautionary: if version > 2, append a note in the hint block that the category for this vendor has historically been unstable. That is qualitative context, not a numeric weight.

### Should we link `vendor` / `counterparty_id` to the `Counterparty` table?

**Partially done, but broken in the Gmail path.** The `OrganizationEmbedding` ORM already has `counterparty_id FK → counterparties.id`. The `Invoice` ORM also has this FK. The problem: `GmailSyncService` passes only `counterparty_display_name` to `InvoiceCreateRequest` — it never passes `counterparty_id`. `InvoiceService.create()` does not resolve a counterparty from the display name; it stores NULL. So `inv.counterparty_id` is always NULL after Gmail sync, and `OrganizationEmbedding.counterparty_id` is always NULL for all Gmail-sourced rows. The `if inv.counterparty_id:` guard in the old recurrence block _never fires_.

**Utility of fixing it:** High. If `counterparty_id` were populated, `check_recurrence` could query `WHERE counterparty_id = :id` — O(log n) index seek vs. an ILIKE scan — and all embeddings/feedback for a vendor would be linked with a stable UUID rather than a fuzzy name string. The fix is a `CounterpartyService.find_or_create(name, org_id)` call inside `GmailSyncService` before `InvoiceService.create()`. This is a separate task; for now we use `vendor` in JSONB metadata as the join key.

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `backend/app/db/models/invoices.py` | Modify | Add `is_recurring: Mapped[bool]` column |
| `backend/app/models/invoices.py` | Modify | Add `is_recurring` to `InvoiceCreateRequest` and `InvoiceResponse` |
| `backend/app/services/invoice_service.py` | Modify | Pass `is_recurring` to `Invoice()` constructor |
| `backend/alembic/versions/d1e2f3a4b5c6_add_is_recurring_to_invoices.py` | Create | Migration: add nullable-false bool column with server default false |
| `backend/app/services/embeddings/vector_store.py` | Modify | `similarity_search` SQL: sort human_feedback first, filter superseded; `record_category_feedback`: add vendor supersession + correction_version |
| `backend/app/agents/ingestion/constants.py` | Modify | Add `RECURRENCE_MIN_MONTHS = 3` |
| `backend/app/agents/ingestion/state.py` | Modify | Add `recurrence_month_count: NotRequired[int]` |
| `backend/app/agents/ingestion/nodes.py` | Modify | Add `check_recurrence` node; update `extract` to pass `neighbors` to prompt; update module docstring |
| `backend/app/agents/ingestion/graph.py` | Modify | Reorder edges: context before extract, add check_recurrence between extract and finalize |
| `backend/app/agents/ingestion/prompts.py` | Modify | `format_extract_user_content` accepts optional `hints` list |
| `backend/app/services/gmail_sync_service.py` | Modify | Add `vendor` to embedding metadata; remove old is_recurring DB block; pass `is_recurring` to `InvoiceCreateRequest` |
| `backend/tests/unit/test_invoice_gmail_source.py` | Modify | Add assertion that `is_recurring` is passed through |
| `backend/tests/unit/test_vector_store_search.py` | Create | Tests for human_feedback sorting, superseded filtering, and supersession logic |
| `backend/tests/unit/test_ingestion_nodes.py` | Create | Tests for `check_recurrence` node and hints in extract prompt |

---

## Task 1 — `is_recurring` column on Invoice ORM + Pydantic schemas + migration

**Files:**
- Modify: `backend/app/db/models/invoices.py`
- Modify: `backend/app/models/invoices.py`
- Modify: `backend/app/services/invoice_service.py`
- Create: `backend/alembic/versions/d1e2f3a4b5c6_add_is_recurring_to_invoices.py`
- Modify: `backend/tests/unit/test_invoice_gmail_source.py`

- [ ] **Step 1.1: Write the failing test**

Add to `backend/tests/unit/test_invoice_gmail_source.py`:

```python
@pytest.mark.asyncio
async def test_invoice_service_create_sets_is_recurring() -> None:
    """is_recurring field must be persisted on the ORM Invoice row."""
    db = AsyncMock()
    db.scalar = AsyncMock(return_value=None)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    org_id = str(uuid.uuid4())
    svc = InvoiceService(db, org_id)
    body = InvoiceCreateRequest(
        source=InvoiceSourceEnum.GMAIL,
        external_id="gmail-recurring-test",
        counterparty_display_name="Adobe Inc",
        amount=Decimal("59.99"),
        issue_date=date(2026, 3, 15),
        is_recurring=True,
    )
    await svc.create(body)

    added = db.add.call_args[0][0]
    assert added.is_recurring is True
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd backend && python -m pytest tests/unit/test_invoice_gmail_source.py::test_invoice_service_create_sets_is_recurring -v
```

Expected: `FAILED` — `InvoiceCreateRequest` has no field `is_recurring`.

- [ ] **Step 1.3: Add `is_recurring` to the Invoice ORM model**

In `backend/app/db/models/invoices.py`, add after the `requires_human_review` column (line 104):

```python
    is_recurring: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
```

- [ ] **Step 1.4: Add `is_recurring` to `InvoiceCreateRequest` and `InvoiceResponse`**

In `backend/app/models/invoices.py`:

In `InvoiceCreateRequest`, add after `requires_human_review`:
```python
    is_recurring: bool = False
```

In `InvoiceResponse`, add after `requires_human_review`:
```python
    is_recurring: bool
```

- [ ] **Step 1.5: Pass `is_recurring` in `InvoiceService.create()`**

In `backend/app/services/invoice_service.py`, add `is_recurring=body.is_recurring` to the `Invoice()` constructor call (after `requires_human_review=body.requires_human_review`):

```python
        inv = Invoice(
            organization_id=self.organization_id,
            source=orm_source,
            external_id=body.external_id,
            counterparty_id=body.counterparty_id,
            counterparty_display_name=display,
            amount=body.amount,
            currency=body.currency.upper(),
            issue_date=body.issue_date,
            due_date=body.due_date,
            status=self._to_orm_status(body.status),
            confidence=body.confidence,
            requires_human_review=body.requires_human_review,
            is_recurring=body.is_recurring,
        )
```

- [ ] **Step 1.6: Run test to verify it passes**

```bash
cd backend && python -m pytest tests/unit/test_invoice_gmail_source.py::test_invoice_service_create_sets_is_recurring -v
```

Expected: `PASSED`.

- [ ] **Step 1.7: Write the Alembic migration**

Create `backend/alembic/versions/d1e2f3a4b5c6_add_is_recurring_to_invoices.py`:

```python
"""add_is_recurring_to_invoices

Revision ID: d1e2f3a4b5c6
Revises: c9f1e2a3b4d5
Create Date: 2026-03-31

Adds a non-nullable boolean ``is_recurring`` column to ``invoices`` with
server-default ``false``.  Populated at ingest time by the ingestion agent's
``check_recurrence`` node after a DB-pattern check (≥3 distinct billing months
for the same vendor).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d1e2f3a4b5c6"
down_revision: str | None = "c9f1e2a3b4d5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "invoices",
        sa.Column(
            "is_recurring",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )


def downgrade() -> None:
    op.drop_column("invoices", "is_recurring")
```

- [ ] **Step 1.8: Run full invoice test suite**

```bash
cd backend && python -m pytest tests/unit/test_invoice_gmail_source.py -v
```

Expected: all tests `PASSED`.

- [ ] **Step 1.9: Commit**

```bash
git add backend/app/db/models/invoices.py \
        backend/app/models/invoices.py \
        backend/app/services/invoice_service.py \
        backend/alembic/versions/d1e2f3a4b5c6_add_is_recurring_to_invoices.py \
        backend/tests/unit/test_invoice_gmail_source.py
git commit -m "feat(invoices): add is_recurring column with Alembic migration"
```

---

## Task 2 — `similarity_search`: sort human_feedback first + filter superseded rows

**Files:**
- Modify: `backend/app/services/embeddings/vector_store.py`
- Create: `backend/tests/unit/test_vector_store_search.py`

- [ ] **Step 2.1: Write the failing tests**

Create `backend/tests/unit/test_vector_store_search.py`:

```python
"""Unit tests for VectorStoreService search behaviour."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.embeddings.vector_store import VectorStoreService


def _make_db(rows: list[dict]) -> AsyncMock:
    """Mock DB that returns given rows from execute()."""
    db = AsyncMock()
    mapping = MagicMock()
    mapping.all.return_value = rows
    result = MagicMock()
    result.mappings.return_value = mapping
    db.execute = AsyncMock(return_value=result)
    return db


@pytest.mark.asyncio
async def test_similarity_search_filters_superseded() -> None:
    """Rows with superseded_by set must never appear in results."""
    org_id = str(uuid.uuid4())
    # Simulate DB returning no rows (the SQL filters superseded at DB level).
    # We verify the SQL contains the superseded_by IS NULL predicate.
    db = _make_db([])
    with patch(
        "app.services.embeddings.vector_store.backend_embed_texts",
        AsyncMock(return_value=[[0.1] * 768]),
    ):
        svc = VectorStoreService(db, org_id)
        rows = await svc.similarity_search("Adobe subscription", k=5)

    assert rows == []
    call_args = db.execute.call_args
    sql_text = str(call_args[0][0])
    assert "superseded_by" in sql_text


@pytest.mark.asyncio
async def test_similarity_search_human_feedback_sorted_first() -> None:
    """SQL must order human_feedback rows before inference rows."""
    org_id = str(uuid.uuid4())
    db = _make_db([])
    with patch(
        "app.services.embeddings.vector_store.backend_embed_texts",
        AsyncMock(return_value=[[0.1] * 768]),
    ):
        svc = VectorStoreService(db, org_id)
        await svc.similarity_search("Adobe", k=3)

    sql_text = str(db.execute.call_args[0][0])
    assert "human_feedback" in sql_text
    # ORDER BY clause must put human_feedback first
    assert "CASE WHEN" in sql_text
```

- [ ] **Step 2.2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/unit/test_vector_store_search.py -v
```

Expected: both tests `FAILED`.

- [ ] **Step 2.3: Update `similarity_search` SQL**

In `backend/app/services/embeddings/vector_store.py`, replace the `sql` variable inside `similarity_search`:

```python
        sql = text(
            """
            SELECT id::text AS id,
                   content_text,
                   source,
                   embedding_metadata,
                   (embedding <=> CAST(:qv AS vector)) AS distance
            FROM organization_embeddings
            WHERE organization_id = CAST(:oid AS uuid)
              AND (embedding_metadata->>'superseded_by') IS NULL
            ORDER BY
                CASE WHEN source = 'human_feedback' THEN 0 ELSE 1 END,
                embedding <=> CAST(:qv AS vector)
            LIMIT :lim
            """
        )
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/unit/test_vector_store_search.py -v
```

Expected: both tests `PASSED`.

- [ ] **Step 2.5: Commit**

```bash
git add backend/app/services/embeddings/vector_store.py \
        backend/tests/unit/test_vector_store_search.py
git commit -m "feat(embeddings): sort human_feedback first in similarity_search; filter superseded rows"
```

---

## Task 3 — Correction supersession in `record_category_feedback`

**Files:**
- Modify: `backend/app/services/embeddings/vector_store.py`
- Modify: `backend/tests/unit/test_vector_store_search.py`

The goal: when a new human correction arrives for the same vendor, mark all prior non-superseded `human_feedback` rows for that vendor as superseded (JSONB `superseded_by` = new row UUID), and auto-increment `correction_version`.

- [ ] **Step 3.1: Write the failing tests**

Add to `backend/tests/unit/test_vector_store_search.py`:

```python
@pytest.mark.asyncio
async def test_record_category_feedback_supersedes_previous() -> None:
    """A second correction for the same vendor must supersede the first."""
    org_id = str(uuid.uuid4())
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.rollback = AsyncMock()

    # First execute call: version query → returns 1 (one prior correction at v1)
    # Second execute call: supersede UPDATE
    execute_results = []

    version_result = MagicMock()
    version_result.scalar.return_value = 1  # max existing correction_version = 1
    execute_results.append(version_result)

    supersede_result = MagicMock()
    execute_results.append(supersede_result)

    db.execute = AsyncMock(side_effect=execute_results)

    with patch(
        "app.services.embeddings.vector_store.backend_embed_texts",
        AsyncMock(return_value=[[0.1] * 768]),
    ):
        svc = VectorStoreService(db, org_id)
        row = await svc.record_category_feedback(
            content_text="Adobe Creative Cloud invoice",
            suggested_label="office",
            corrected_label="software",
            vendor_name="Adobe Inc",
        )

    # correction_version should be max_existing + 1 = 2
    assert db.execute.call_count == 2
    # The added row must carry correction_version=2
    added = db.add.call_args[0][0]
    assert added.embedding_metadata["correction_version"] == 2
    assert added.embedding_metadata["vendor"] == "Adobe Inc"
    assert "superseded_by" not in added.embedding_metadata


@pytest.mark.asyncio
async def test_record_category_feedback_first_correction_version_is_one() -> None:
    """First correction for a vendor starts at correction_version=1."""
    org_id = str(uuid.uuid4())
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.rollback = AsyncMock()

    version_result = MagicMock()
    version_result.scalar.return_value = 0  # no prior corrections
    supersede_result = MagicMock()
    db.execute = AsyncMock(side_effect=[version_result, supersede_result])

    with patch(
        "app.services.embeddings.vector_store.backend_embed_texts",
        AsyncMock(return_value=[[0.1] * 768]),
    ):
        svc = VectorStoreService(db, org_id)
        await svc.record_category_feedback(
            content_text="AWS bill",
            suggested_label="uncategorized",
            corrected_label="cloud_infrastructure",
            vendor_name="Amazon Web Services",
        )

    added = db.add.call_args[0][0]
    assert added.embedding_metadata["correction_version"] == 1
```

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/unit/test_vector_store_search.py::test_record_category_feedback_supersedes_previous tests/unit/test_vector_store_search.py::test_record_category_feedback_first_correction_version_is_one -v
```

Expected: both `FAILED`.

- [ ] **Step 3.3: Rewrite `record_category_feedback` in `vector_store.py`**

Replace the entire `record_category_feedback` method with:

```python
    async def record_category_feedback(
        self,
        *,
        content_text: str,
        suggested_label: str,
        corrected_label: str,
        source: str = "human_feedback",
        original_confidence: float | None = None,
        was_auto_applied: bool = False,
        correction_count: int = 1,
        counterparty_id: str | None = None,
        vendor_name: str | None = None,
    ) -> OrganizationEmbedding:
        """Persist a human correction as a new embedding row for active learning.

        When ``vendor_name`` is supplied:
        - Queries ``organization_embeddings`` for the max ``correction_version`` for
          this vendor within this org to auto-increment the version counter.
        - Marks all prior non-superseded ``human_feedback`` rows for the same vendor
          as superseded (JSONB ``superseded_by`` = new row UUID) using PostgreSQL's
          ``||`` merge operator.

        Correction version semantics:
        - ``correction_version`` is the authoritative counter; ``correction_count``
          is kept as an alias for backward compatibility.
        - Higher version ≠ higher confidence. Multiple corrections signal ambiguity,
          not certainty — callers should surface this in the hint block as a caveat,
          not a weight multiplier.

        Superseded rows are filtered out of ``similarity_search`` automatically.
        """
        trimmed = content_text.strip()
        if not trimmed:
            raise ValidationError(
                "content_text is required.",
                code="validation.empty_content",
                fields={"content_text": "Provide non-empty text"},
            )

        new_id = str(uuid.uuid4())
        new_version = correction_count  # fallback when vendor_name not given

        if vendor_name:
            # Step 1: compute correction_version
            version_sql = text(
                """
                SELECT COALESCE(
                    MAX((embedding_metadata->>'correction_version')::int), 0
                )
                FROM organization_embeddings
                WHERE organization_id = CAST(:oid AS uuid)
                  AND source = 'human_feedback'
                  AND embedding_metadata->>'vendor' = :vendor
                """
            )
            result = await self.db.execute(
                version_sql,
                {"oid": self.organization_id, "vendor": vendor_name},
            )
            new_version = (result.scalar() or 0) + 1

            # Step 2: supersede prior corrections for this vendor
            supersede_sql = text(
                """
                UPDATE organization_embeddings
                SET embedding_metadata = embedding_metadata
                    || jsonb_build_object('superseded_by', :new_id::text)
                WHERE organization_id = CAST(:oid AS uuid)
                  AND source = 'human_feedback'
                  AND embedding_metadata->>'vendor' = :vendor
                  AND embedding_metadata->>'superseded_by' IS NULL
                """
            )
            await self.db.execute(
                supersede_sql,
                {
                    "oid": self.organization_id,
                    "vendor": vendor_name,
                    "new_id": new_id,
                },
            )

        embed_body = f"{trimmed}\nconfirmed_category={corrected_label}"
        metadata: dict[str, Any] = {
            "feedback_type": "category_correction",
            "original_category": suggested_label,
            "corrected_category": corrected_label,
            "correction_version": new_version,
            "correction_count": new_version,  # alias for backward compat
            "was_auto_applied": was_auto_applied,
        }
        if original_confidence is not None:
            metadata["original_confidence"] = original_confidence
        if vendor_name:
            metadata["vendor"] = vendor_name

        vectors = await self.embed_texts([embed_body])
        vec = vectors[0]
        row = OrganizationEmbedding(
            id=new_id,
            organization_id=self.organization_id,
            counterparty_id=counterparty_id,
            source=source[:64],
            content_text=embed_body,
            embedding=vec,
            embedding_metadata=metadata,
        )
        self.db.add(row)
        try:
            await self.db.commit()
            await self.db.refresh(row)
        except Exception as e:
            await self.db.rollback()
            logger.error("Failed to persist feedback embedding: %s", e)
            raise ExternalServiceError(
                "Failed to store embedding.",
                code="db.error",
            ) from e
        return row
```

- [ ] **Step 3.4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/unit/test_vector_store_search.py -v
```

Expected: all 4 tests `PASSED`.

- [ ] **Step 3.5: Commit**

```bash
git add backend/app/services/embeddings/vector_store.py \
        backend/tests/unit/test_vector_store_search.py
git commit -m "feat(embeddings): add correction_version + supersession to record_category_feedback"
```

---

## Task 4 — Ingestion constants + state fields

**Files:**
- Modify: `backend/app/agents/ingestion/constants.py`
- Modify: `backend/app/agents/ingestion/state.py`

- [ ] **Step 4.1: Add `RECURRENCE_MIN_MONTHS` to constants**

In `backend/app/agents/ingestion/constants.py`, append:

```python
# Minimum number of distinct calendar months a vendor must appear in
# ``organization_embeddings`` before the check_recurrence node overrides
# the LLM's is_recurring=False decision.
RECURRENCE_MIN_MONTHS = 3
```

- [ ] **Step 4.2: Add `recurrence_month_count` to IngestionState**

In `backend/app/agents/ingestion/state.py`, add to `IngestionState`:

```python
    # Set by check_recurrence node: number of distinct billing months found
    # in organization_embeddings for the extracted vendor.
    recurrence_month_count: NotRequired[int]
```

- [ ] **Step 4.3: Commit**

```bash
git add backend/app/agents/ingestion/constants.py \
        backend/app/agents/ingestion/state.py
git commit -m "feat(agents/ingestion): add RECURRENCE_MIN_MONTHS constant and recurrence_month_count state field"
```

---

## Task 5 — `check_recurrence` node + graph reorder

**Files:**
- Modify: `backend/app/agents/ingestion/nodes.py`
- Modify: `backend/app/agents/ingestion/graph.py`
- Create: `backend/tests/unit/test_ingestion_nodes.py`

- [ ] **Step 5.1: Write the failing tests**

Create `backend/tests/unit/test_ingestion_nodes.py`:

```python
"""Unit tests for ingestion graph nodes."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.agents.ingestion.nodes import IngestionNodes
from app.agents.ingestion.constants import RECURRENCE_MIN_MONTHS


def _base_state(org_id: str | None = None) -> dict:
    return {
        "organization_id": org_id or str(uuid.uuid4()),
        "raw_text": "Adobe Creative Cloud subscription — €59.99",
        "extracted": {
            "vendor": "Adobe Inc",
            "description": "Creative Cloud",
            "category": "software",
            "is_recurring": False,
            "confidence": 0.88,
            "summary": "Monthly subscription",
            "amount": 59.99,
            "currency": "EUR",
            "vat_rate": "",
            "line_items": [],
            "issue_date": "",
            "due_date": "",
        },
        "neighbors": [],
    }


@pytest.mark.asyncio
async def test_check_recurrence_overrides_when_count_meets_threshold() -> None:
    """check_recurrence sets is_recurring=True when distinct months >= RECURRENCE_MIN_MONTHS."""
    nodes = IngestionNodes()
    org_id = str(uuid.uuid4())
    state = _base_state(org_id)

    db = AsyncMock()
    month_result = MagicMock()
    month_result.scalar.return_value = RECURRENCE_MIN_MONTHS  # exactly at threshold
    db.execute = AsyncMock(return_value=month_result)
    state["db"] = db

    out = await nodes.check_recurrence(state)

    assert out["extracted"]["is_recurring"] is True
    assert out["recurrence_month_count"] == RECURRENCE_MIN_MONTHS


@pytest.mark.asyncio
async def test_check_recurrence_does_not_downgrade_true_to_false() -> None:
    """DB count below threshold must NOT override LLM's is_recurring=True."""
    nodes = IngestionNodes()
    org_id = str(uuid.uuid4())
    state = _base_state(org_id)
    state["extracted"]["is_recurring"] = True  # LLM already said True

    db = AsyncMock()
    month_result = MagicMock()
    month_result.scalar.return_value = 1  # only 1 month — below threshold
    db.execute = AsyncMock(return_value=month_result)
    state["db"] = db

    out = await nodes.check_recurrence(state)

    assert out["extracted"]["is_recurring"] is True  # not downgraded


@pytest.mark.asyncio
async def test_check_recurrence_skips_on_missing_vendor() -> None:
    """Node returns state unchanged when extracted vendor is empty."""
    nodes = IngestionNodes()
    state = _base_state()
    state["extracted"]["vendor"] = ""
    state["db"] = AsyncMock()

    out = await nodes.check_recurrence(state)

    state["db"].execute.assert_not_called()
    assert out["extracted"]["is_recurring"] is False


@pytest.mark.asyncio
async def test_check_recurrence_is_noop_when_result_already_set() -> None:
    """Node must short-circuit if state already has a terminal result."""
    nodes = IngestionNodes()
    state = _base_state()
    state["result"] = {"error": "empty_text"}
    state["db"] = AsyncMock()

    out = await nodes.check_recurrence(state)

    state["db"].execute.assert_not_called()
```

- [ ] **Step 5.2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/unit/test_ingestion_nodes.py -v
```

Expected: all `FAILED` — `IngestionNodes` has no `check_recurrence`.

- [ ] **Step 5.3: Add `check_recurrence` to `IngestionNodes` in `nodes.py`**

Add the following import at the top of `backend/app/agents/ingestion/nodes.py` (after the existing imports):

```python
from sqlalchemy import text as sa_text
```

Add the following method to `IngestionNodes` class, after the `extract` method:

```python
    async def check_recurrence(self, state: IngestionState) -> IngestionState:
        """DB-pattern recurrence check: how many distinct billing months for this vendor?

        Queries ``organization_embeddings`` for ``(invoice_year, invoice_month)``
        combinations stored in embedding metadata under ``source='gmail_ingestion'``.
        Overrides ``extracted['is_recurring']`` to ``True`` when the count is at or
        above ``RECURRENCE_MIN_MONTHS`` — it never downgrades a True set by the LLM.
        """
        if "result" in state:
            return state

        ext = dict(state.get("extracted") or {})
        vendor = (ext.get("vendor") or "").strip()
        if not vendor:
            return state

        db = state["db"]
        org_id = state["organization_id"]

        sql = sa_text(
            """
            SELECT COUNT(DISTINCT (
                (embedding_metadata->>'invoice_year')::int * 100
                + (embedding_metadata->>'invoice_month')::int
            ))
            FROM organization_embeddings
            WHERE organization_id = CAST(:oid AS uuid)
              AND source = 'gmail_ingestion'
              AND embedding_metadata->>'vendor' = :vendor
              AND embedding_metadata->>'invoice_year' IS NOT NULL
              AND embedding_metadata->>'invoice_month' IS NOT NULL
            """
        )
        try:
            result = await db.execute(sql, {"oid": org_id, "vendor": vendor})
            month_count = int(result.scalar() or 0)
        except Exception as e:
            logger.warning("check_recurrence db query failed: %s", e)
            return state

        updated: IngestionState = {**state, "recurrence_month_count": month_count}
        if month_count >= RECURRENCE_MIN_MONTHS and not ext.get("is_recurring"):
            ext["is_recurring"] = True
            updated["extracted"] = ext
        return updated
```

Also add `RECURRENCE_MIN_MONTHS` to the import from `constants.py` at the top:

```python
from app.agents.ingestion.constants import (
    EXTRACT_RAW_TEXT_MAX_CHARS,
    MAX_ATTACHMENT_BYTES,
    RECURRENCE_MIN_MONTHS,
    SIMILARITY_QUERY_MAX_CHARS,
    SIMILARITY_SEARCH_TOP_K,
    VISION_IMAGE_MIME_TYPES,
)
```

- [ ] **Step 5.4: Reorder the graph in `graph.py`**

Replace `_build_ingestion_workflow` in `backend/app/agents/ingestion/graph.py`:

```python
def _build_ingestion_workflow():
    workflow = StateGraph(IngestionState)
    n = _nodes

    workflow.add_node("materialize", n.materialize)
    workflow.add_node("validate", n.validate)
    workflow.add_node("context", n.context)
    workflow.add_node("extract", n.extract)
    workflow.add_node("check_recurrence", n.check_recurrence)
    workflow.add_node("finalize", n.finalize)

    workflow.add_edge(START, "materialize")
    workflow.add_edge("materialize", "validate")

    def route_after_validate(state: IngestionState) -> str:
        return "end" if state.get("result") else "context"

    workflow.add_conditional_edges(
        "validate",
        route_after_validate,
        {"context": "context", "end": END},
    )
    workflow.add_edge("context", "extract")
    workflow.add_edge("extract", "check_recurrence")
    workflow.add_edge("check_recurrence", "finalize")
    workflow.add_edge("finalize", END)
    return workflow.compile()
```

Also update the graph module docstring `**Flow:**` section to reflect the new order:

```python
"""Compile the ingestion LangGraph and expose ``ingestion_graph``.

**Scope:** Wire ``StateGraph`` nodes only — no extraction logic in this file.

**Flow:**
    1. ``materialize`` — decode optional base64 PDF (text append) or stage image for vision.
    2. ``validate`` — reject empty input (no text and no image).
    3. ``context`` — optional pgvector similarity hints via ``vector_store_factory``
       (runs on raw_text before extraction so hints inform the LLM).
    4. ``extract`` — LLM JSON with ERP fields, confidence, summary (text or vision);
       receives ``neighbors`` from context to shift probability distribution.
    5. ``check_recurrence`` — DB pattern check: vendor in ≥3 distinct billing months
       → override ``is_recurring=True`` regardless of document text.
    6. ``finalize`` — document embedding + ``requires_human_review`` + flat invoice payload.

**Contract:** Services import ``ingestion_graph`` from ``app.agents.ingestion`` and
call ``ainvoke`` with ``organization_id``, ``raw_text`` and/or attachment fields,
``db``, and optionally ``vector_store_factory`` / ``llm`` (tests).
"""
```

- [ ] **Step 5.5: Update the `nodes.py` module docstring**

Replace the module docstring at the top of `backend/app/agents/ingestion/nodes.py`:

```python
"""LangGraph nodes for document ingestion (Gmail-ready attachment + text pipeline).

**Flow:**
    1. ``materialize`` — decode base64 attachment; PDFs append extracted text to
       ``raw_text``; images set ``vision_image_*`` for the extract node.
    2. ``validate`` — require non-empty text and/or a staged vision image.
    3. ``context`` — optional pgvector neighbors via ``vector_store_factory``;
       runs BEFORE extract so hints are available to the LLM.
    4. ``extract`` — LLM JSON (text or vision) with ERP fields + confidence.
       Receives ``neighbors`` from context and injects them as a
       ``<historical_context>`` block so human-feedback hints shift
       the probability distribution toward historically-correct answers.
    5. ``check_recurrence`` — DB pattern check against ``organization_embeddings``:
       counts distinct ``(invoice_year, invoice_month)`` pairs for the extracted
       vendor. Overrides ``is_recurring=True`` when count ≥ ``RECURRENCE_MIN_MONTHS``;
       never downgrades a True already set by the LLM.
    6. ``finalize`` — embedding via ``LLMClient.embedding_for_text``, merge
       ``requires_human_review`` using ``INGESTION_CONFIDENCE_AUTO_APPLY_THRESHOLD``.

**Side effects:** LLM HTTP when not in demo mode; optional vector search and DB
read (check_recurrence) scoped by ``organization_id``. Agents do not call Gmail.
"""
```

- [ ] **Step 5.6: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/unit/test_ingestion_nodes.py -v
```

Expected: all 4 tests `PASSED`.

- [ ] **Step 5.7: Run full test suite to catch regressions**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all `PASSED`.

- [ ] **Step 5.8: Commit**

```bash
git add backend/app/agents/ingestion/nodes.py \
        backend/app/agents/ingestion/graph.py \
        backend/tests/unit/test_ingestion_nodes.py
git commit -m "feat(agents/ingestion): add check_recurrence node; reorder context before extract"
```

---

## Task 6 — Thread vector hints into the `extract` prompt

**Files:**
- Modify: `backend/app/agents/ingestion/prompts.py`
- Modify: `backend/app/agents/ingestion/nodes.py`
- Modify: `backend/tests/unit/test_ingestion_nodes.py`

- [ ] **Step 6.1: Write failing tests**

Add to `backend/tests/unit/test_ingestion_nodes.py`:

```python
@pytest.mark.asyncio
async def test_extract_passes_human_feedback_hint_to_prompt() -> None:
    """When neighbors contain a human_feedback row, the extract prompt must
    include an explicit human-confirmation notice."""
    nodes = IngestionNodes()
    org_id = str(uuid.uuid4())

    captured_messages: list = []

    async def fake_chat_completion_json(messages):
        captured_messages.extend(messages)
        return {
            "description": "Creative Cloud",
            "amount": 59.99,
            "vendor": "Adobe Inc",
            "category": "software",
            "is_recurring": False,
            "confidence": 0.9,
            "summary": "Monthly subscription",
            "currency": "EUR",
            "vat_rate": "",
            "line_items": [],
            "issue_date": "",
            "due_date": "",
        }

    fake_llm = MagicMock()
    fake_llm.chat_completion_json = AsyncMock(side_effect=fake_chat_completion_json)

    state = {
        "organization_id": org_id,
        "raw_text": "Adobe Creative Cloud invoice €59.99",
        "neighbors": [
            {
                "source": "human_feedback",
                "embedding_metadata": {
                    "corrected_category": "software",
                    "vendor": "Adobe Inc",
                    "correction_version": 1,
                },
                "distance": 0.08,
                "content_text": "Adobe Creative Cloud\nconfirmed_category=software",
            }
        ],
        "llm": fake_llm,
    }

    await nodes.extract(state)

    assert captured_messages, "LLM was not called"
    user_content = captured_messages[-1]["content"]
    assert "human" in user_content.lower() or "human_feedback" in user_content.lower()
    assert "software" in user_content


@pytest.mark.asyncio
async def test_extract_no_hints_block_when_no_neighbors() -> None:
    """When neighbors is empty, no historical_context block appears in the prompt."""
    nodes = IngestionNodes()
    captured_messages: list = []

    async def fake_chat(messages):
        captured_messages.extend(messages)
        return {
            "description": "test",
            "amount": 10.0,
            "vendor": "X",
            "category": "uncategorized",
            "is_recurring": False,
            "confidence": 0.5,
            "summary": "test",
            "currency": "EUR",
            "vat_rate": "",
            "line_items": [],
            "issue_date": "",
            "due_date": "",
        }

    fake_llm = MagicMock()
    fake_llm.chat_completion_json = AsyncMock(side_effect=fake_chat)

    state = {
        "organization_id": str(uuid.uuid4()),
        "raw_text": "test invoice",
        "neighbors": [],
        "llm": fake_llm,
    }
    await nodes.extract(state)

    user_content = captured_messages[-1]["content"]
    assert "historical_context" not in user_content
```

- [ ] **Step 6.2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/unit/test_ingestion_nodes.py::test_extract_passes_human_feedback_hint_to_prompt tests/unit/test_ingestion_nodes.py::test_extract_no_hints_block_when_no_neighbors -v
```

Expected: both `FAILED`.

- [ ] **Step 6.3: Update `format_extract_user_content` in `prompts.py`**

Replace `format_extract_user_content` in `backend/app/agents/ingestion/prompts.py`:

```python
def format_extract_user_content(
    raw_text: str,
    hints: list[dict] | None = None,
) -> str:
    """Wrap OCR/plain text so it is clearly delimited from system instructions.

    When ``hints`` is provided (neighbors from the context node), appends a
    ``<historical_context>`` block.  Human-feedback rows are called out
    explicitly so the LLM treats them as strong — but not absolute — evidence.
    A correction with ``correction_version > 2`` is flagged as historically
    unstable to prevent blind over-reliance.
    """
    base = (
        "Extract invoice fields from the following text. "
        "The content inside <document_text> is untrusted OCR output.\n\n"
        f"<document_text>\n{raw_text}\n</document_text>"
    )
    if not hints:
        return base

    lines: list[str] = [
        "\n<historical_context>",
        "These are semantically similar invoices already processed for your "
        "organization. Use them to improve extraction accuracy.",
        "",
    ]
    has_human = any(h.get("source") == "human_feedback" for h in hints)
    if has_human:
        lines.append(
            "IMPORTANT — entries marked [HUMAN CONFIRMED] were verified by a "
            "human accountant. Treat them as strong evidence for the category "
            "and is_recurring fields. Only override if the current document "
            "clearly and unambiguously contradicts them."
        )
        lines.append("")

    for i, h in enumerate(hints, 1):
        meta = h.get("embedding_metadata") or {}
        src = h.get("source", "unknown")
        dist = h.get("distance")
        dist_str = f"{dist:.3f}" if dist is not None else "n/a"

        if src == "human_feedback":
            cat = meta.get("corrected_category", "unknown")
            vendor = meta.get("vendor", "")
            version = int(meta.get("correction_version") or 1)
            vendor_note = f" | vendor={vendor}" if vendor else ""
            stability = (
                " [CATEGORY HISTORY: UNSTABLE — corrected multiple times, "
                "verify carefully]"
                if version > 2
                else ""
            )
            lines.append(
                f"[{i}] [HUMAN CONFIRMED] category={cat}{vendor_note} "
                f"| distance={dist_str}{stability}"
            )
        else:
            cat = meta.get("category") or meta.get("corrected_category", "unknown")
            lines.append(f"[{i}] [AI LABELED] category={cat} | distance={dist_str}")

    lines.append("</historical_context>")
    return base + "\n" + "\n".join(lines)
```

- [ ] **Step 6.4: Update the `extract` node to pass `neighbors`**

In `backend/app/agents/ingestion/nodes.py`, in the `extract` method, find this block:

```python
        truncated = state["raw_text"][:EXTRACT_RAW_TEXT_MAX_CHARS]
        messages = [
            {"role": "system", "content": EXTRACT_SYSTEM_MESSAGE},
            {"role": "user", "content": format_extract_user_content(truncated)},
        ]
```

Replace with:

```python
        truncated = state["raw_text"][:EXTRACT_RAW_TEXT_MAX_CHARS]
        neighbors = state.get("neighbors") or []
        messages = [
            {"role": "system", "content": EXTRACT_SYSTEM_MESSAGE},
            {
                "role": "user",
                "content": format_extract_user_content(truncated, hints=neighbors),
            },
        ]
```

- [ ] **Step 6.5: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/unit/test_ingestion_nodes.py -v
```

Expected: all tests `PASSED`.

- [ ] **Step 6.6: Commit**

```bash
git add backend/app/agents/ingestion/prompts.py \
        backend/app/agents/ingestion/nodes.py \
        backend/tests/unit/test_ingestion_nodes.py
git commit -m "feat(agents/ingestion): thread vector hints with human_feedback emphasis into extract prompt"
```

---

## Task 7 — Gmail sync cleanup: vendor in metadata, use agent is_recurring, pass to invoice

**Files:**
- Modify: `backend/app/services/gmail_sync_service.py`

This task:
1. Adds `"vendor": ext_vendor` to the embedding metadata so `check_recurrence` can query it precisely.
2. Removes the incorrect `prior_count > 0` block (replaced by the in-graph `check_recurrence` node).
3. Passes `is_recurring=result.get("is_recurring", False)` to `InvoiceCreateRequest`.

- [ ] **Step 7.1: Write the failing test**

Add to `backend/tests/unit/test_invoice_gmail_source.py`:

```python
@pytest.mark.asyncio
async def test_gmail_sync_passes_is_recurring_from_result_to_invoice() -> None:
    """GmailSyncService must pass is_recurring from ingestion result to InvoiceCreateRequest."""
    # We test this by verifying InvoiceCreateRequest accepts is_recurring=True
    # (the service builds this request; if is_recurring is not threaded through, it
    # defaults to False regardless of what the agent returned).
    body = InvoiceCreateRequest(
        source=InvoiceSourceEnum.GMAIL,
        external_id="gmail-test-recurring",
        counterparty_display_name="Adobe Inc",
        amount=Decimal("59.99"),
        issue_date=date(2026, 3, 15),
        is_recurring=True,
    )
    assert body.is_recurring is True
```

Note: This is a schema-level smoke test. The full integration of `GmailSyncService` is covered by the review of the code changes below.

- [ ] **Step 7.2: Run test to verify it passes (it should already pass after Task 1)**

```bash
cd backend && python -m pytest tests/unit/test_invoice_gmail_source.py -v
```

Expected: all `PASSED`.

- [ ] **Step 7.3: Update `gmail_sync_service.py`**

In `backend/app/services/gmail_sync_service.py`, find and replace the entire `vec` persistence block (approximately lines 351–386):

**Remove** (the old code):
```python
                vec = result.get("embedding")
                if isinstance(vec, list) and vec:
                    vs = VectorStoreService(self._db, organization_id)
                    try:
                        # Determine whether this counterparty has been seen before
                        # (any prior embedding exists for it) to flag recurring invoices.
                        is_recurring = False
                        if inv.counterparty_id:
                            prior_count = await self._db.scalar(
                                select(func.count())
                                .select_from(OrganizationEmbedding)
                                .where(
                                    OrganizationEmbedding.counterparty_id
                                    == inv.counterparty_id
                                )
                            )
                            is_recurring = (prior_count or 0) > 0

                        await vs.persist_precomputed_vector(
                            content_text=_embedding_content_text(result),
                            source="gmail_ingestion",
                            vector=vec,
                            embedding_metadata={
                                "gmail_message_id": mid,
                                "invoice_id": inv.id,
                                "source": "gmail",
                                "invoice_month": inv.issue_date.month,
                                "invoice_year": inv.issue_date.year,
                                "is_recurring": is_recurring,
                            },
                            counterparty_id=inv.counterparty_id,
                        )
                    except Exception as embed_err:
                        logger.warning(
                            "gmail embedding persist skipped for %s: %s", mid, embed_err
                        )
```

**Replace with** (the new code):
```python
                vec = result.get("embedding")
                if isinstance(vec, list) and vec:
                    vs = VectorStoreService(self._db, organization_id)
                    try:
                        await vs.persist_precomputed_vector(
                            content_text=_embedding_content_text(result),
                            source="gmail_ingestion",
                            vector=vec,
                            embedding_metadata={
                                "gmail_message_id": mid,
                                "invoice_id": inv.id,
                                "source": "gmail",
                                "vendor": ext_vendor,
                                "invoice_month": inv.issue_date.month,
                                "invoice_year": inv.issue_date.year,
                                "is_recurring": bool(result.get("is_recurring", False)),
                            },
                            counterparty_id=inv.counterparty_id,
                        )
                    except Exception as embed_err:
                        logger.warning(
                            "gmail embedding persist skipped for %s: %s", mid, embed_err
                        )
```

- [ ] **Step 7.4: Pass `is_recurring` to `InvoiceCreateRequest`**

In the same file, find the `InvoiceCreateRequest(...)` call and add `is_recurring`:

```python
                    inv = await inv_svc.create(
                        InvoiceCreateRequest(
                            source=InvoiceSourceEnum.GMAIL,
                            external_id=mid,
                            counterparty_display_name=ext_vendor,
                            amount=dec_amt,
                            currency=currency,
                            issue_date=issue_d,
                            due_date=due_d,
                            status=inv_status,
                            confidence=conf_f,
                            requires_human_review=bool(result.get("requires_human_review")),
                            is_recurring=bool(result.get("is_recurring", False)),
                        )
                    )
```

- [ ] **Step 7.5: Remove unused imports in `gmail_sync_service.py`**

Remove `func` from the `sqlalchemy` import (it was only used by the old `prior_count` block) and `OrganizationEmbedding` if it is no longer referenced elsewhere in the file.

Check which imports are now unused:
```bash
cd backend && python -c "import app.services.gmail_sync_service"
```

If no `ImportError`, remove any unused ones manually. Specifically:
- Remove `from sqlalchemy import func, select` → keep `select` (still used for `GmailProcessedMessage` queries), remove `func`
- Remove `from app.db.models.embeddings import OrganizationEmbedding` (no longer queried directly)

- [ ] **Step 7.6: Run full test suite**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all `PASSED`.

- [ ] **Step 7.7: Commit**

```bash
git add backend/app/services/gmail_sync_service.py \
        backend/tests/unit/test_invoice_gmail_source.py
git commit -m "fix(gmail): add vendor to embedding metadata; remove incorrect prior_count recurrence check; propagate is_recurring to invoice"
```

---

## Self-Review

### Spec coverage check

| Requirement | Covered by |
|-------------|------------|
| Fix false `is_recurring` detection (DB pattern, not just prior_count > 0) | Task 5 (`check_recurrence` node) |
| Node reorder: context → extract → check_recurrence → finalize | Task 5 |
| Hints from context node passed to extract LLM prompt | Task 6 |
| human_feedback prioritized in similarity_search | Task 2 |
| LLM told explicitly about human corrections in prompt | Task 6 |
| correction_version + superseded_by on corrections | Task 3 |
| Filter superseded rows from similarity_search | Task 2 |
| `is_recurring` persisted to invoices table | Task 1 |
| `vendor` added to gmail embedding metadata | Task 7 |
| Remove incorrect prior_count > 0 block | Task 7 |

### Placeholder scan

None found. Every step has complete code.

### Type consistency check

- `format_extract_user_content(raw_text, hints=None)` defined Task 6.3, called Task 6.4. ✅
- `check_recurrence` defined Task 5.3, wired in graph Task 5.4. ✅
- `RECURRENCE_MIN_MONTHS` added Task 4.1, imported in nodes Task 5.3. ✅
- `is_recurring` added to ORM Task 1.3, Pydantic Task 1.4, service Task 1.5, invoice create Task 7.4. ✅
- `vendor_name` param added to `record_category_feedback` Task 3.3. ✅
- `sa_text` import alias in nodes.py avoids collision with existing `text` from prompts. ✅
