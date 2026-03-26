# Agents Layer — LangGraph Rules

> This file is read in addition to the root `CLAUDE.md` and `backend/CLAUDE.md`.
> General FastAPI architecture, security, and DB rules live in `backend/CLAUDE.md`.
> This file covers only the AI agent layer.

---

<agents_architecture>

## Directory Structure

Agents are organized in two tiers based on complexity.

### Tier 1 — Flat (simple, single-phase agents)

Use when the agent has ≤ 5 nodes, ≤ 150 lines in nodes.py, and a single
logical phase. **Ingestion** is Tier 1 today. A future **categorization** agent
(transaction → COA) should use the same Tier-1 layout.

    agents/ingestion/   ← Phase 2 (current)
      __init__.py      ← Exports only: ``ingestion_graph``
      graph.py         ← StateGraph compile; exports module-level compiled graph
      state.py         ← TypedDict state definition
      nodes.py         ← All node functions
      tools.py         ← Reserved / tools when wired
      prompts.py       ← All prompt templates
      constants.py     ← Agent-specific limits (token/window sizes, kNN k, etc.)

### Tier 2 — Phase-split (multi-phase agents)

Use when the agent has > 5 nodes, exceeds 150 lines in nodes.py, or has
distinct phases with different concerns. Reconciliation and Collections
are built as Tier 2 from the start.

    agents/reconciliation/
      __init__.py      ← Exports only: ``reconciliation_graph``
      graph.py         ← StateGraph wiring only. Imports from nodes/.
      state.py         ← TypedDict state definition
      constants.py     ← Agent-specific constants
      prompts.py       ← All templates, organized by phase with comments
      tools/
        __init__.py
        search.py      ← Invoice search, embedding lookup
        ledger.py      ← Ledger read/write tools
      nodes/
        __init__.py
        ingestion.py   ← Parse and normalize bank transaction
        matching.py    ← Exact, partial, and embedding-based matching
        scoring.py     ← Confidence calculation and threshold evaluation
        decision.py    ← Route to auto-reconcile or PENDING_REVIEW + Alert

    agents/collections/
      __init__.py      ← Exports only: ``collections_graph``
      graph.py
      state.py
      constants.py
      prompts.py
      tools/
        __init__.py
        invoice.py     ← Overdue invoice queries
        email.py       ← Brevo / outbound mail tools (Gmail API send is not wired here)
      nodes/
        __init__.py
        monitor.py     ← Identify overdue invoices, calculate urgency
        drafting.py    ← Draft email content via LLM
        dispatch.py    ← Send via Brevo (Act Mode) or queue for review (Review Mode)

### The shared foundation

    agents/
      base.py          ← Shared **confidence-score** thresholds (auto-apply vs
                         human review) used when multiple agents agree on the
                         same scoring contract. LLM factory / shared retriever:
                         planned. Do **not** put agent-specific limits here.

## Module-level docstrings (required)

Every **significant** Python file under ``app/agents/`` (including ``base.py`` and
each agent package: ``graph.py``, ``nodes.py``, ``state.py``, ``prompts.py``,
``constants.py``, ``tools.py``, and package ``__init__.py``) MUST begin with a
**module-level docstring** so a reader can grasp purpose and data flow without
reading the whole file.

Use Google-style or short narrative prose. Adjust emphasis by file kind:

| File | Docstring should cover |
| ---- | ---------------------- |
| **graph.py** | End-to-end responsibility of the graph; name of the exported compiled graph; **numbered** high-level flow (which nodes run and in what order); note if wiring-only (no business logic in this file). |
| **nodes.py** | What each node phase does to state; external calls (LLM, DB, Brevo mail, vector search); invariants (e.g. tenant scoping). |
| **state.py** | Input vs output keys; optional runtime-injected keys (e.g. ``vector_store_factory``) and why they are not in ``constants.py``. |
| **prompts.py** | Which node consumes each template; tone/constraints (length, language). |
| **constants.py** | What belongs here vs ``base.py``; how constants are used in nodes (limits, k, placeholders, demo rows). |
| **tools.py** | Planned or reserved tools; why the Phase N graph does not wire them yet. |
| **``__init__.py``** | Public export rule (single graph symbol); one line on what that graph is for. |

Trivial one-liners are acceptable only when the file is a pure re-export
(e.g. ``__init__.py``) — but they must still state **what** is exported and **why**
the package exists. Do not omit the module docstring on “obvious” files; agents and
humans both benefit from the workflow summary.

### Public API rule

Every agent package ``__init__.py`` exports **exactly one** symbol: the compiled
graph (``ingestion_graph``, ``reconciliation_graph``, or ``collections_graph``).
Nothing else inside the agent package should be imported by ``services/`` or
routes.

    # ✅ CORRECT
    from app.agents.ingestion import ingestion_graph
    from app.agents.reconciliation import reconciliation_graph
    from app.agents.collections import collections_graph

    # ❌ WRONG — exposes internals, breaks encapsulation
    from app.agents.reconciliation.nodes import ReconciliationNodes

**Ingestion runtime hooks (not constants):** optional ``vector_store_factory`` and
(test-only) ``llm`` may be set on the **initial** ``ainvoke`` state dict — they are
runtime dependencies, not ``constants.py`` values. Production services pass
``vector_store_factory`` when RAG context is required; omit both for text-only
extraction.

## Implemented agents (Phase 2)

- **`ingestion_graph`** — document text → structured invoice hints plus optional
  pgvector similarity context. **Ingestion / extraction**, not ledger **transaction
  categorization**.
- **`reconciliation_graph`** — bank lines vs stub invoices; exact-amount heuristic.
- **`collections_graph`** — alerts → LLM-drafted emails → **Brevo** transactional send (demo-safe logging).

A future **Smart Categorization** agent (transaction → COA category) is product
vision and is **not** the same as ingestion.

## Partial compliance (confidence / human review)

The template below is the **target** contract for agents that emit automated
decisions. **Ingestion** and **reconciliation** Phase 2 states **do not** yet
include `confidence` or `requires_human_review`. Score thresholds live in
`base.py`; per-agent tuning (limits, k, fixtures) lives in each
``constants.py`` when nodes are extended.

## Invocation Pattern

Agents are always invoked **from a service method**. Never invoke an agent from a
controller or a route. The service prepares inputs, calls the graph, and persists
the result.

```python
# ✅ CORRECT — service invokes agent
class TransactionService:
    async def categorize(self, txn: Transaction) -> Transaction:
        result = await categorization_graph.ainvoke({
            "transaction": txn,
            "org_id": txn.organization_id,
        })
        txn.category = result["category"]
        txn.confidence = result["confidence"]
        txn.requires_human_review = result["requires_human_review"]
        await self.db.commit()
        return txn
```

## State Schema Convention (target)

Every `state.py` for **decision agents** should eventually define a `TypedDict`
with:

```python
from typing import TypedDict

class ReconciliationState(TypedDict):
    # --- Input fields (set at graph entry, never mutated by nodes) ---
    transaction: Transaction
    org_id: str

    # --- Output fields (written only by terminal nodes) ---
    matched_invoice_id: str | None
    match_type: str | None          # "exact" | "partial" | "none"

    # --- Mandatory on every agent (when automation is in play) ---
    confidence: float               # 0.0 – 1.0
    requires_human_review: bool     # True when confidence < threshold
```

Phase 2 ingestion/reconciliation states omit the last block until those graphs
emit scores.

## The Active Learning Loop

When `requires_human_review is True`, the calling service MUST:

1. Persist the agent's best-guess output with status `PENDING_REVIEW`.
2. Create an `Alert` record via `AlertService` to surface the item in the UI.
3. When the user confirms or corrects the suggestion, write the feedback back to
   the pgvector embeddings store — this is what improves future predictions.

Do not skip step 3. Without it, the loop does not close and the model does not learn.

## Constants: `base.py` vs per-agent `constants.py`

- **`base.py`** — shared **confidence-score** thresholds (0.0–1.0) that apply when
  multiple agents follow the same human-review contract. Never hardcode those
  floats in nodes.
- **`<agent>/constants.py`** — everything else that is agent-specific: fetch
  limits, RAG window sizes, top‑k for similarity, demo fixture rows, placeholder
  email addresses, copy limits for prompts, etc. Do not put these in
  ``state.py`` (state is runtime data, not configuration).

| Agent          | Auto-apply (≥) — lives in `base.py`                  | Requires human review (<) |
| -------------- | ---------------------------------------------------- | ------------------------- |
| Ingestion      | 0.85                                                 | 0.85                      |
| Reconciliation | 0.90                                                 | 0.90                      |
| Collections    | "Act Mode" only; always human-gated in "Review Mode" |

## LLM & Embedding Standards

- **LLM (Phase 2)** — graphs construct **`LLMClient`** (or accept an injected instance
  in tests). Runtime provider is **`LLM_PROVIDER`**: **`gemini`** (Google GenAI) or
  **`openai_compatible`** (LM Studio / local OpenAI-style HTTP). Do not add new raw
  provider SDK construction inside nodes beyond what `LLMClient` already wraps.
- **Embeddings** — dimensions are **`EMBEDDING_DIMENSIONS`** (DB **768**). Batch/single
  embedding calls go through **`app/services/embeddings/backend.py`** (Gemini,
  optional **sentence-transformers** with `uv sync --group local_ml`, or compatible
  HTTP). Ingestion may use a service-injected vector store factory; pgvector I/O
  stays in `app/services/embeddings/`, not duplicated per node.
- **Prompts** — all prompt templates live in `prompts.py`. Inline f-strings for
  **template text** inside `nodes.py` are forbidden (formatting user content via
  small helpers that call `prompts.py` is fine).
- **Async** — all node functions must be `async def`. Always use `graph.ainvoke()`.
  Never call `graph.invoke()` (sync) inside a FastAPI worker.

## Checkpointing Strategy

Not all agents need persistence. Apply this table strictly.

| Agent          | Strategy                                         | Reason                                                                                                                              |
| -------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Ingestion      | **Stateless** — permanent                        | Single-shot extraction. Runs to completion every call.                                                                              |
| Reconciliation | **Stateful** — add when building human-review UI | Multi-step matching must pause at low-confidence nodes, wait for user confirmation, then resume without re-running completed steps. |
| Collections    | **Stateful** — add when building Act Mode        | Must pause before dispatching emails, wait for approval, then resume.                                                               |

### Implementing Checkpointing (Reconciliation / Collections only)

Use `langgraph-checkpoint-postgres` pointed at the existing `SUPABASE_URI`.
No separate infrastructure is required — checkpoint tables are created in Supabase.

```python
# app/main.py — run once at startup via lifespan event
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

checkpointer = AsyncPostgresSaver.from_conn_string(settings.SUPABASE_URI)
await checkpointer.setup()  # creates checkpoint tables if they don't exist

# Compile graph with checkpointer
graph = workflow.compile(checkpointer=checkpointer)
```

```python
# In the service method — use the domain object's UUID as thread_id
config = {"configurable": {"thread_id": str(invoice_id)}}

# First invocation
result = await graph.ainvoke(input_data, config=config)

# Resume after human approval — pass None as input, same thread_id
result = await graph.ainvoke(None, config=config)
```

**Do not add checkpointing to the Ingestion agent. It is explicitly stateless.**

## Demo Mode for Agents

Every agent `ainvoke` call in a service method must be decorated with
`@demo_fixture(...)` so that `ENVIRONMENT=demo` returns a static fixture without
calling the LLM.

Add fixture files under `app/core/demo_fixtures/agents/` named to match the
decorator key (e.g., `ingestion_result.json`).

</agents_architecture>

---

<never_list>

## Agents NEVER List

- **NEVER** import from `api/`, `controllers/`, or `services/` inside an agent.
  The call direction is strictly: services → agents.
- **NEVER** instantiate provider SDKs directly inside a node when `LLMClient` or
  the upcoming `base.py` factory already covers the use case.
- **NEVER** write prompt **template strings** inline inside `nodes.py` — they
  belong in `prompts.py`.
- **NEVER** call `graph.invoke()` (synchronous) inside a FastAPI worker — use
  `graph.ainvoke()`.
- **NEVER** collapse an agent into a single flat module — always use the
  graph / state / nodes / tools / prompts subdirectory structure.
- **NEVER** hardcode a **shared confidence-score** threshold float — define it in
  `base.py`.
- **NEVER** hardcode agent-specific **limits, sizes, or placeholder strings** in
  nodes — define them in that agent's `constants.py`.
- **NEVER** add checkpointing to the Ingestion agent.
- **NEVER** skip creating an `Alert` when `requires_human_review is True`.
- **NEVER** skip writing user feedback back to pgvector after human correction —
  the Active Learning Loop must close.
- **NEVER** add or ship a significant module under ``app/agents/`` without a
  module-level docstring that explains workflow and responsibility (see
  **Module-level docstrings** above).

</never_list>
