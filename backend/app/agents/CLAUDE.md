# Agents Layer — LangGraph Rules

> This file is read in addition to the root `CLAUDE.md` and `backend/CLAUDE.md`.
> General FastAPI architecture, security, and DB rules live in `backend/CLAUDE.md`.
> This file covers only the AI agent layer.

---

<agents_architecture>

## Directory Structure

Each agent is a self-contained subdirectory. Graph wiring, state, nodes, tools, and
prompts are separated per agent.

```
app/agents/
  base.py                  ← Named confidence thresholds (forward-compatible).
                             LLM factory / shared retriever: planned consolidation;
                             Phase 2 graphs inject ``LLMClient`` at construction.
  ingestion/
    graph.py               ← LangGraph StateGraph + public agent class (compiled graph)
    state.py               ← TypedDict state schema for this agent
    nodes.py               ← Node callables (state_in → state_out)
    tools.py               ← Reserved / LangChain tools when wired
    prompts.py             ← Prompt templates for this agent
  reconciliation/
    graph.py
    state.py
    nodes.py
    tools.py
    prompts.py
  collections/
    graph.py
    state.py
    nodes.py
    tools.py
    prompts.py
```

## Implemented agents (Phase 2)

- **IngestionAgent** (`ingestion/`) — document text → structured invoice hints plus
  optional pgvector similarity context. This is **ingestion / extraction**, not
  ledger **transaction categorization**.
- **ReconciliationAgent** — bank lines vs stub invoices; exact-amount heuristic.
- **ARCollectionsAgent** — alerts → LLM-drafted emails → SMTP (demo-safe).

A future **Smart Categorization** agent (transaction → COA category) is product
vision and is **not** the same as ingestion.

## Partial compliance (confidence / human review)

The template below is the **target** contract for agents that emit automated
decisions. **Ingestion** and **reconciliation** Phase 2 states **do not** yet
include `confidence` or `requires_human_review`. Thresholds live in `base.py` for
when nodes are extended to populate them.

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

## Confidence Thresholds

Define all thresholds as named constants in `app/agents/base.py`.
Never hardcode a float inside a node or graph file.

| Agent           | Auto-apply (≥) | Requires human review (<) |
| --------------- | ---------------- | ------------------------- |
| Ingestion       | 0.85             | 0.85                      |
| Reconciliation  | 0.90             | 0.90                      |
| Collections     | "Act Mode" only; always human-gated in "Review Mode" |

## LLM & Embedding Standards

- **LLM (Phase 2)** — graphs construct `LLMClient` (or accept an injected instance)
  for OpenAI/Anthropic calls. A single factory in `base.py` will replace ad-hoc
  construction in a later refactor; do not add new raw `ChatOpenAI` usage in
  nodes.
- **Embeddings** — ingestion may use a service-injected vector store factory;
  shared pgvector helpers belong in `app/services/embeddings/`, not duplicated
  per node.
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
- **NEVER** hardcode a confidence threshold float — define it as a named constant
  in `base.py`.
- **NEVER** add checkpointing to the Ingestion agent.
- **NEVER** skip creating an `Alert` when `requires_human_review is True`.
- **NEVER** skip writing user feedback back to pgvector after human correction —
  the Active Learning Loop must close.

</never_list>
