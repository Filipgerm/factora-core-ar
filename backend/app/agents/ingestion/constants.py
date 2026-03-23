"""Ingestion-only numeric limits (not cross-agent confidence thresholds).

Used by ``nodes.py`` for LLM input truncation and similarity-query window / k.
Shared score thresholds for future human-review logic live in ``app.agents.base``.
"""

EXTRACT_RAW_TEXT_MAX_CHARS = 12_000
SIMILARITY_QUERY_MAX_CHARS = 2_000
SIMILARITY_SEARCH_TOP_K = 5
