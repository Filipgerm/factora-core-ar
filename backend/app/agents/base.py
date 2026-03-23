"""Shared agent constants (Phase 2 LangGraph).

**Partial compliance:** The global spec in ``agents/CLAUDE.md`` expects every agent
state to carry ``confidence`` (0.0–1.0) and ``requires_human_review``. The
**ingestion** and **reconciliation** graphs shipped in Phase 2 do not populate
those fields yet. Use the thresholds below when extending nodes to emit them.

Collections remains human-gated in Review Mode; auto-apply semantics apply only
when product "Act Mode" is enabled.
"""

INGESTION_CONFIDENCE_AUTO_APPLY_THRESHOLD = 0.85
RECONCILIATION_CONFIDENCE_AUTO_APPLY_THRESHOLD = 0.90
