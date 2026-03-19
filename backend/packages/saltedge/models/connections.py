from __future__ import annotations
from pydantic import BaseModel, Field, AliasChoices, ConfigDict, field_validator
from typing import List, Optional, Any, Dict
from enum import Enum
from datetime import datetime


class MetaObject(BaseModel):
    next_id: Optional[str] = None
    next_page: Optional[str] = None


class ConnectionStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    disabled = "disabled"


class Categorization(str, Enum):
    none = "none"
    personal = "personal"
    business = "business"


class Address(BaseModel):
    city: Optional[str] = None
    state: Optional[str] = None
    street: Optional[str] = None
    country_code: Optional[str] = None
    post_code: Optional[str] = None


class HolderInfoExtra(BaseModel):
    ssn: Optional[str] = None
    cpf: Optional[str] = None
    birth_date: Optional[str] = None
    document_number: Optional[str] = None


class HolderInfo(BaseModel):
    names: Optional[List[str]] = None
    emails: Optional[List[str]] = None
    phone_numbers: Optional[List[str]] = None
    addresses: Optional[List[Address]] = None
    extra: Optional[HolderInfoExtra] = None


class Stage(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class Attempt(BaseModel):
    id: Optional[str] = None
    consent_id: Optional[str] = None
    api_version: Optional[str] = None
    api_mode: Optional[str] = None
    automatic_fetch: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    fail_at: Optional[datetime] = None
    fail_error_class: Optional[str] = None
    fail_message: Optional[str] = None
    last_stage: Optional[Stage] = None


class Connection(BaseModel):
    id: str
    customer_id: str
    customer_identifier: str
    provider_code: str
    provider_name: str
    country_code: str
    status: ConnectionStatus
    automatic_refresh: bool
    created_at: datetime
    updated_at: datetime
    last_consent_id: str

    # optional
    categorization: Categorization = Categorization.none
    categorization_vendor: Optional[str] = None
    next_refresh_possible_at: Optional[datetime] = None
    last_attempt: Optional[Attempt] = None
    holder_info: Optional[HolderInfo] = None


class ConnectionsResponse(BaseModel):
    data: List[Connection]
    meta: Optional[MetaObject] = None


class ConnectionActionData(BaseModel):
    connect_url: str
    token: str


class ConnectionActionResponse(BaseModel):
    data: ConnectionActionData
