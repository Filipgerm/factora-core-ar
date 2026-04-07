"""GL journal-style line debit/credit rules.

Scope: Validates single-sided, non-negative amounts per line.
Contract: Pure functions; safe to import from Pydantic models and services.
Architectural notes: Matches PostgreSQL CHECK constraints on
``gl_journal_lines`` and ``gl_recurring_entry_template_lines``.
"""

from __future__ import annotations

from decimal import Decimal


def debit_credit_line_sides_valid(debit: Decimal, credit: Decimal) -> bool:
    """True when debit and credit are non-negative and exactly one is strictly positive."""
    if debit < 0 or credit < 0:
        return False
    if debit > 0 and credit > 0:
        return False
    if debit == 0 and credit == 0:
        return False
    return True
