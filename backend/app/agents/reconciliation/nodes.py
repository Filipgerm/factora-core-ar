"""Reconciliation graph nodes."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models.banking import (
    BankAccountModel,
    ConnectionModel,
    CustomerModel,
    Transaction,
)

from app.agents.reconciliation.state import ReconciliationState


def stub_open_invoices() -> list[dict[str, Any]]:
    if settings.demo_mode:
        return [
            {"id": "inv_demo_1", "amount": "1200.00", "counterparty": "Acme Ltd"},
            {"id": "inv_demo_2", "amount": "118.40", "counterparty": "Cloud Co"},
        ]
    return []


async def fetch_transactions(
    db: AsyncSession,
    organization_id: str,
    limit: int = 80,
) -> list[dict[str, Any]]:
    stmt = (
        select(Transaction)
        .join(BankAccountModel, BankAccountModel.id == Transaction.account_id)
        .join(ConnectionModel, ConnectionModel.id == BankAccountModel.connection_id)
        .join(CustomerModel, CustomerModel.id == ConnectionModel.customer_id)
        .where(CustomerModel.organization_id == organization_id)
        .order_by(Transaction.made_on.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    txs = result.scalars().all()
    lines: list[dict[str, Any]] = []
    for t in txs:
        lines.append(
            {
                "id": t.id,
                "amount": str(t.amount),
                "description": t.description or "",
                "made_on": t.made_on.isoformat() if t.made_on else None,
            }
        )
    return lines


class ReconciliationNodes:
    async def load_bank(self, state: ReconciliationState) -> ReconciliationState:
        db: AsyncSession = state["db"]
        lines = await fetch_transactions(db, state["organization_id"])
        return {**state, "bank_lines": lines}

    async def load_invoices(self, state: ReconciliationState) -> ReconciliationState:
        return {**state, "open_invoices": stub_open_invoices()}

    async def match(self, state: ReconciliationState) -> ReconciliationState:
        matches: list[dict[str, Any]] = []
        review: list[dict[str, Any]] = []
        invoices = state.get("open_invoices", [])
        for line in state.get("bank_lines", []):
            try:
                amt = Decimal(line["amount"])
            except Exception:
                review.append({**line, "reason": "invalid_amount"})
                continue
            hits = [
                inv
                for inv in invoices
                if Decimal(str(inv.get("amount", "0"))) == amt
            ]
            if len(hits) == 1:
                matches.append(
                    {
                        "transaction_id": line["id"],
                        "invoice_id": hits[0]["id"],
                        "amount": line["amount"],
                    }
                )
            elif len(hits) > 1:
                review.append(
                    {**line, "reason": "ambiguous_amount", "candidates": hits}
                )
            else:
                review.append({**line, "reason": "no_exact_match"})
        return {**state, "matches": matches, "review_queue": review}
