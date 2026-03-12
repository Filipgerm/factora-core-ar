from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel


class Rate(BaseModel):
    currency_code: str
    rate: float
    fail: Optional[bool] = None  # true => rate is from previous available date


class RatesMeta(BaseModel):
    issued_on: Optional[str] = None  # format: date (YYYY-MM-DD)


class RatesResponse(BaseModel):
    data: List[Rate]
    meta: Optional[RatesMeta] = None
