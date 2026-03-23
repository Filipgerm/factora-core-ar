"""Cross-agent confidence thresholds (Phase 2 LangGraph).

**Purpose:** Single place for **shared** numeric thresholds used when multiple
agents adopt the same auto-apply vs human-review contract. Per-agent fetch limits,
prompt windows, and placeholders live in each agent's ``constants.py``.

**Partial compliance:** ``agents/CLAUDE.md`` expects ``confidence`` and
``requires_human_review`` on state for decision agents. Ingestion and reconciliation
Phase 2 graphs do not set those fields yet — import these constants when nodes
start emitting scores.

**Collections:** human-gated in Review Mode; auto-apply only when product "Act Mode"
is enabled (separate from the floats below).
"""

INGESTION_CONFIDENCE_AUTO_APPLY_THRESHOLD = 0.85
RECONCILIATION_CONFIDENCE_AUTO_APPLY_THRESHOLD = 0.90
