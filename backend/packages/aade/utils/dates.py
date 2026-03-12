from __future__ import annotations
from datetime import date, datetime
from typing import Union


def _to_ddmmyyyy(value: Union[str, date, datetime, None]) -> str | None:
    """
    Normalize input into 'dd/MM/yyyy' string as required by AADE GET endpoints.
    Accepts string, date, datetime.
    Returns None if input is None.
    """
    if value is None:
        return None

    if isinstance(value, datetime):
        return value.date().strftime("%d/%m/%Y")

    if isinstance(value, date):
        return value.strftime("%d/%m/%Y")

    if isinstance(value, str):
        txt = value.strip()
        # already dd/MM/yyyy
        if "/" in txt and len(txt) == 10:
            return txt
        # ISO?
        try:
            d = datetime.fromisoformat(txt).date()
            return d.strftime("%d/%m/%Y")
        except Exception:
            return txt  # leave unchanged

    return None
