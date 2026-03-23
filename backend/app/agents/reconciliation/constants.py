"""Reconciliation-specific limits and demo fixtures (not shared thresholds — see ``base.py``)."""

from typing import Any

BANK_TRANSACTION_FETCH_LIMIT = 80

DEMO_OPEN_INVOICES: list[dict[str, Any]] = [
    {"id": "inv_demo_1", "amount": "1200.00", "counterparty": "Acme Ltd"},
    {"id": "inv_demo_2", "amount": "118.40", "counterparty": "Cloud Co"},
]
