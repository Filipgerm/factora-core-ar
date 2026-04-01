"""Ingestion-only numeric limits (not cross-agent confidence thresholds).

Used by ``nodes.py`` for LLM input truncation, attachment bounds, and similarity k.
Shared score thresholds for human-review logic live in ``app.agents.base``.
"""

EXTRACT_RAW_TEXT_MAX_CHARS = 12_000
SIMILARITY_QUERY_MAX_CHARS = 2_000
SIMILARITY_SEARCH_TOP_K = 5

# Maximum cosine distance (0–2 scale) for embedding-based counterparty resolution.
# Distance < 0.20 ≈ cosine similarity > 0.80 — strict enough to avoid cross-vendor
# false positives while handling name variants ("AWS" vs "Amazon Web Services").
COUNTERPARTY_RESOLVE_MAX_DISTANCE = 0.20

# Gmail / upload attachment safety (decoded byte size).
MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024

# Vision path for image attachments (OpenAI image_url compatible MIME types).
VISION_IMAGE_MIME_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp", "image/gif"}
)
