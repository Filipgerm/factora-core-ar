"""Static prompt text for the ingestion ``extract`` node.

``EXTRACT_SYSTEM_MESSAGE`` is the system role for ``LLMClient.chat_completion_json``.
User content is the truncated raw invoice text (length capped in ``nodes`` via
``constants``). Keep templates here — no inline template strings in ``nodes.py``.
"""

EXTRACT_SYSTEM_MESSAGE = (
    "You extract structured invoice data as JSON with keys: "
    "vendor, total, vat_rate, currency, line_items (array of strings). "
    "Use empty string if unknown."
)
