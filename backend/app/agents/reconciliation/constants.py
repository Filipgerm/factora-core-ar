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
    {"id": "inv_demo_3", "amount": "45280.00", "counterparty": "Nordic Parts AB"},
    {"id": "inv_demo_4", "amount": "9900.00", "counterparty": "Baltic Freight OÜ"},
    {"id": "inv_demo_5", "amount": "4200.00", "counterparty": "Stripe"},
    {"id": "inv_demo_6", "amount": "3100.00", "counterparty": "Atlas Cloud Services IKE"},
    {"id": "inv_demo_7", "amount": "8750.50", "counterparty": "Helios Analytics OÜ"},
    {"id": "inv_demo_8", "amount": "26400.00", "counterparty": "Mediterranean Trading SA"},
    {"id": "inv_demo_9", "amount": "5125.25", "counterparty": "Benelux Retail BV"},
    {"id": "inv_demo_10", "amount": "18990.00", "counterparty": "Enterprise renewal pool"},
    {"id": "inv_demo_11a", "amount": "3333.33", "counterparty": "Misc customer A"},
    {"id": "inv_demo_11b", "amount": "3333.33", "counterparty": "Misc customer B"},
]
