"""Pydantic request/response models for the general ledger API."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class GlAccountTypeEnum(StrEnum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class GlNormalBalanceEnum(StrEnum):
    DEBIT = "debit"
    CREDIT = "credit"


class GlSubledgerKindEnum(StrEnum):
    NONE = "none"
    AR = "ar"
    AP = "ap"


class GlPeriodStatusEnum(StrEnum):
    OPEN = "open"
    SOFT_CLOSE = "soft_close"
    HARD_CLOSE = "hard_close"


class GlJournalStatusEnum(StrEnum):
    DRAFT = "draft"
    POSTED = "posted"


class GlRecurringFrequencyEnum(StrEnum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


# --- Legal entities ---


class GlLegalEntityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    functional_currency: str
    is_primary: bool


# --- Dimensions ---


class GlDimensionValueResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dimension_id: str
    code: str
    label: str


class GlDimensionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    key: str
    label: str
    values: list[GlDimensionValueResponse] = Field(default_factory=list)


# --- Accounts ---


class GlAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    parent_account_id: str | None
    code: str
    name: str
    account_type: GlAccountTypeEnum
    normal_balance: GlNormalBalanceEnum
    subledger_kind: GlSubledgerKindEnum
    is_active: bool
    is_control_account: bool
    sort_order: int


class GlAccountCreateRequest(BaseModel):
    parent_account_id: str | None = None
    code: str = Field(..., min_length=1, max_length=32)
    name: str = Field(..., min_length=1, max_length=255)
    account_type: GlAccountTypeEnum
    normal_balance: GlNormalBalanceEnum
    subledger_kind: GlSubledgerKindEnum = GlSubledgerKindEnum.NONE
    is_active: bool = True
    is_control_account: bool = False
    sort_order: int = 0


class GlAccountUpdateRequest(BaseModel):
    parent_account_id: str | None = None
    name: str | None = Field(None, min_length=1, max_length=255)
    account_type: GlAccountTypeEnum | None = None
    normal_balance: GlNormalBalanceEnum | None = None
    subledger_kind: GlSubledgerKindEnum | None = None
    is_active: bool | None = None
    is_control_account: bool | None = None
    sort_order: int | None = None


# --- Periods ---


class GlAccountingPeriodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    period_start: date
    period_end: date
    label: str
    status: GlPeriodStatusEnum


class GlAccountingPeriodUpdateRequest(BaseModel):
    status: GlPeriodStatusEnum


# --- Journal ---


class GlJournalLineInput(BaseModel):
    account_id: str
    description: str | None = None
    debit: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    credit: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    line_order: int = 0
    dimension_value_ids: list[str] = Field(default_factory=list)


class GlJournalLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_id: str
    description: str | None
    debit: Decimal
    credit: Decimal
    line_order: int
    dimension_value_ids: list[str] = Field(default_factory=list)


class GlJournalEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    legal_entity_id: str
    posting_period_id: str | None
    status: GlJournalStatusEnum
    document_currency: str
    base_currency: str
    fx_rate_to_base: Decimal | None
    memo: str | None
    reference: str | None
    source_batch_id: str | None
    posted_at: datetime | None
    created_at: datetime
    updated_at: datetime
    lines: list[GlJournalLineResponse] = Field(default_factory=list)
    total_debit: Decimal
    total_credit: Decimal


class GlJournalEntryCreateRequest(BaseModel):
    legal_entity_id: str
    posting_period_id: str | None = None
    document_currency: str = Field(..., min_length=3, max_length=3)
    base_currency: str = Field(default="EUR", min_length=3, max_length=3)
    fx_rate_to_base: Decimal | None = Field(None, gt=Decimal("0"))
    memo: str | None = None
    reference: str | None = None
    lines: list[GlJournalLineInput] = Field(..., min_length=2)


class GlJournalEntryUpdateRequest(BaseModel):
    posting_period_id: str | None = None
    document_currency: str | None = Field(None, min_length=3, max_length=3)
    base_currency: str | None = Field(None, min_length=3, max_length=3)
    fx_rate_to_base: Decimal | None = Field(None, gt=Decimal("0"))
    memo: str | None = None
    reference: str | None = None
    lines: list[GlJournalLineInput] | None = None


# --- Billing batches ---


class GlBillingBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    legal_entity_id: str | None
    external_batch_id: str
    source_system: str
    event_count: int
    total_amount: Decimal
    currency: str
    received_at: datetime


# --- Revenue (IFRS 15 style) ---


class GlRevenueWaterfallPoint(BaseModel):
    period_month: date
    deferred_opening: Decimal
    recognized_in_period: Decimal
    deferred_closing: Decimal


class GlRevenueScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    legal_entity_id: str
    contract_name: str
    currency: str
    total_contract_value: Decimal
    lines: list[GlRevenueWaterfallPoint] = Field(default_factory=list)


# --- Recurring templates ---


class GlRecurringTemplateLineInput(BaseModel):
    account_id: str
    description: str | None = None
    debit: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    credit: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))
    line_order: int = 0


class GlRecurringTemplateLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_id: str
    description: str | None
    debit: Decimal
    credit: Decimal
    line_order: int


class GlRecurringTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    legal_entity_id: str
    name: str
    memo: str | None
    frequency: GlRecurringFrequencyEnum
    day_of_month: int
    is_active: bool
    template_lines: list[GlRecurringTemplateLineResponse] = Field(default_factory=list)


class GlRecurringTemplateCreateRequest(BaseModel):
    legal_entity_id: str
    name: str = Field(..., min_length=1, max_length=255)
    memo: str | None = None
    frequency: GlRecurringFrequencyEnum
    day_of_month: int = Field(default=1, ge=1, le=28)
    is_active: bool = True
    template_lines: list[GlRecurringTemplateLineInput] = Field(..., min_length=2)


class GlRecurringTemplateUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    memo: str | None = None
    frequency: GlRecurringFrequencyEnum | None = None
    day_of_month: int | None = Field(None, ge=1, le=28)
    is_active: bool | None = None
    template_lines: list[GlRecurringTemplateLineInput] | None = None


# --- Trial balance ---


class GlTrialBalanceRowResponse(BaseModel):
    account_id: str
    account_code: str
    account_name: str
    debit_total: Decimal
    credit_total: Decimal


# --- FX ---


class GlFxQuoteResponse(BaseModel):
    from_currency: str
    to_currency: str
    rate: Decimal


# --- Audit ---


class GlAuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    subject_type: str
    subject_id: str
    action: str
    actor_user_id: str | None
    payload: dict | None
    created_at: datetime
