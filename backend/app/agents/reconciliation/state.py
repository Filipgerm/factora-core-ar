"""Reconciliation graph state — inputs and accumulated match results.

**Inputs:** ``organization_id``, ``db`` (``AsyncSession``).

**Filled by nodes:** ``bank_lines`` (normalized tx dicts), ``open_invoices`` (stub
or future real AR), ``matches`` (exact one-to-one amount hits), ``review_queue``
(invalid amount, ambiguous, or no match).
"""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class ReconciliationState(TypedDict, total=False):
    organization_id: str
    db: NotRequired[Any]
    bank_lines: list[dict[str, Any]]
    open_invoices: list[dict[str, Any]]
    matches: list[dict[str, Any]]
    review_queue: list[dict[str, Any]]
