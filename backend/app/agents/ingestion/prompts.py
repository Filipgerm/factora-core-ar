"""Prompt templates for ingestion (document text → structured invoice hints)."""

EXTRACT_SYSTEM_MESSAGE = (
    "You extract structured invoice data as JSON with keys: "
    "vendor, total, vat_rate, currency, line_items (array of strings). "
    "Use empty string if unknown."
)
