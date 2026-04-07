"""CHECK debit/credit on journal and recurring template lines

Revision ID: f0e1d2c3b4a5
Revises: e8f9a0b1c2d3
Create Date: 2026-04-05

Enforces non-negative amounts and single-sided lines (no both zero, no both
positive), matching GlService._line_sides_valid.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "f0e1d2c3b4a5"
down_revision: Union[str, Sequence[str], None] = "e8f9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_LINE_CHECK = (
    "debit >= 0 AND credit >= 0 AND NOT (debit = 0 AND credit = 0) "
    "AND NOT (debit > 0 AND credit > 0)"
)


def upgrade() -> None:
    op.create_check_constraint(
        "ck_gl_journal_lines_debit_credit_line",
        "gl_journal_lines",
        _LINE_CHECK,
    )
    op.create_check_constraint(
        "ck_gl_recurring_template_lines_debit_credit_line",
        "gl_recurring_entry_template_lines",
        _LINE_CHECK,
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_gl_recurring_template_lines_debit_credit_line",
        "gl_recurring_entry_template_lines",
        type_="check",
    )
    op.drop_constraint(
        "ck_gl_journal_lines_debit_credit_line",
        "gl_journal_lines",
        type_="check",
    )
