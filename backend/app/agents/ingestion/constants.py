"""Ingestion-only numeric limits (not cross-agent confidence thresholds).

Used by ``nodes.py`` for LLM input truncation, attachment bounds, and similarity k.
Shared score thresholds for human-review logic live in ``app.agents.base``.
"""

EXTRACT_RAW_TEXT_MAX_CHARS = 12_000
SIMILARITY_QUERY_MAX_CHARS = 2_000
SIMILARITY_SEARCH_TOP_K = 5

# Gmail / upload attachment safety (decoded byte size).
MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

# Vision path for image attachments (OpenAI image_url compatible MIME types).
VISION_IMAGE_MIME_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif"}
)
