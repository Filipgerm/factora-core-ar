from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any


class ApiListMeta(BaseModel):
    next_page: int | None = Field(None, description="Next page number, if any")


class ApiListResponse(BaseModel):
    data: list[Any]
    meta: ApiListMeta | None = None
