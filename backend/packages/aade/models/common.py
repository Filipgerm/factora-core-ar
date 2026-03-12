from __future__ import annotations
from pydantic import BaseModel, Field
from typing import Any, Optional


class ContinuationTokenType(BaseModel):
    nextPartitionKey: Optional[str] = None
    nextRowKey: Optional[str] = None


class ErrorType(BaseModel):
    message: str
    code: Optional[str] = None
