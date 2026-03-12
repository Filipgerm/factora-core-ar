from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, date
from enum import Enum


class ConsentStatus(str, Enum):
    active = "active"
    expired = "expired"
    revoked = "revoked"


class CollectedBy(str, Enum):
    client = "client"
    saltedge = "saltedge"


class RevokeReason(str, Enum):
    expired = "expired"
    client = "client"
    provider = "provider"
    saltedge = "saltedge"


class Consent(BaseModel):
    id: str
    connection_id: str
    customer_id: str
    status: ConsentStatus
    scopes: List[str]
    period_days: Optional[int] = None
    expires_at: Optional[datetime] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    collected_by: Optional[CollectedBy] = None
    revoked_at: Optional[datetime] = None
    revoke_reason: Optional[RevokeReason] = None
    created_at: datetime
    updated_at: datetime


class ConsentsResponse(BaseModel):
    data: List[Consent]
    meta: Optional[dict] = None


class ConsentResponse(BaseModel):
    data: Consent
