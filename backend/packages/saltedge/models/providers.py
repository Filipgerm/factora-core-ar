from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from packages.saltedge.models.connections import MetaObject


class ProviderFieldOption(BaseModel):
    name: str
    english_name: str
    localized_name: str
    option_value: str
    selected: bool
    model_config = ConfigDict(extra="allow")


class ProviderField(BaseModel):
    # Used by both credentials_fields and interactive_fields
    name: str
    english_name: str
    localized_name: str
    nature: str  # text | password | select | dynamic_select | file | number
    optional: bool
    position: int
    extra: Optional[dict] = None
    field_options: Optional[List[ProviderFieldOption]] = None
    model_config = ConfigDict(extra="allow")


class Provider(BaseModel):
    id: str
    code: str
    name: str
    country_code: str
    bic_codes: List[str]
    identification_codes: List[str]
    status: str
    mode: str
    regulated: bool
    logo_url: str
    timezone: str
    supported_iframe_embedding: bool
    optional_interactivity: bool
    customer_notified_on_sign_in: bool
    created_at: str
    updated_at: str

    # Optional/conditional AIS fields
    automatic_fetch: Optional[bool] = None
    custom_pendings_period: Optional[int] = None
    holder_info: Optional[List[str]] = None
    instruction_for_connections: Optional[str] = None
    interactive_for_connections: Optional[bool] = None
    max_consent_days: Optional[int] = None
    max_fetch_interval: Optional[int] = None
    fetch_policies: Optional[dict] = None
    max_interactive_delay: Optional[int] = None
    refresh_timeout: Optional[int] = None
    supported_account_extra_fields: Optional[List[str]] = None
    supported_account_natures: Optional[List[str]] = None
    supported_account_types: Optional[List[str]] = None  # personal | business
    supported_fetch_scopes: Optional[List[str]] = None
    supported_transaction_extra_fields: Optional[List[str]] = None

    # Optional/conditional PIS fields
    payment_templates: Optional[List[str]] = None
    instruction_for_payments: Optional[str] = None
    interactive_for_payments: Optional[bool] = None
    required_payment_fields: Optional[List[dict]] = None
    supported_payment_fields: Optional[List[dict]] = None
    no_funds_rejection_supported: Optional[bool] = None

    # Credentials & interactive fields (when include_credentials_fields=true)
    credentials_fields: Optional[List[ProviderField]] = None
    interactive_fields: Optional[List[ProviderField]] = None

    # Other optional attributes from the spec
    dynamic_registration_code: Optional[str] = None
    group_code: Optional[str] = None
    group_name: Optional[str] = None
    hub: Optional[str] = None

    model_config = ConfigDict(extra="allow")


class ProviderResponse(BaseModel):
    data: Provider
    model_config = ConfigDict(extra="allow")


class ProvidersResponse(BaseModel):
    data: List[Provider]
    meta: Optional[MetaObject] = None
    model_config = ConfigDict(extra="allow")
