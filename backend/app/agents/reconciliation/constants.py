"""Reconciliation tuning: SQL fetch cap and demo open-invoice rows.

``BANK_TRANSACTION_FETCH_LIMIT`` caps how many recent transactions ``load_bank`` pulls.
``DEMO_OPEN_INVOICES`` seeds stub matching in ``demo`` mode only. Cross-agent
confidence thresholds belong in ``app.agents.base``, not here.
"""

from typing import Any

BANK_TRANSACTION_FETCH_LIMIT = 80

DEMO_OPEN_INVOICES: list[dict[str, Any]] = [
    {"id": "inv_demo_1", "amount": "1200.00", "counterparty": "Acme Ltd"},
    {"id": "inv_demo_2", "amount": "118.40", "counterparty": "Cloud Co"},
]
