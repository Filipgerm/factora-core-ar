from __future__ import annotations
from typing import Optional, List, Dict, Any
from typing_extensions import Annotated
from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.functional_validators import BeforeValidator

# Reuse MetaObject (next_id, next_page) from connections models
from packages.saltedge.models.connections import MetaObject


# Reusable converter: list[...] -> list[str]
def _list_to_strs(v: Any):
    if isinstance(v, list):
        return [str(x) for x in v]
    return v


class TransactionExtra(BaseModel):
    account_balance_snapshot: Optional[float] = None
    account_number: Optional[str] = None
    additional: Optional[str] = None
    asset_amount: Optional[float] = None
    asset_code: Optional[str] = None
    categorization_confidence: Optional[float] = None
    check_number: Optional[str] = None
    closing_balance: Optional[float] = None
    constant_code: Optional[str] = None
    convert: Optional[bool] = None
    customer_category_code: Optional[str] = None
    customer_category_name: Optional[str] = None
    exchange_rate: Optional[Dict[str, Any]] = None
    id: Optional[str] = None
    end_to_end_id: Optional[str] = None
    information: Optional[str] = None
    mcc: Optional[str] = None
    merchant_id: Optional[str] = None
    opening_balance: Optional[float] = None
    original_amount: Optional[float] = None
    original_category: Optional[str] = None
    original_currency_code: Optional[str] = None
    original_subcategory: Optional[str] = None
    payee: Optional[str] = None
    payee_information: Optional[str] = None
    payer: Optional[str] = None
    payer_information: Optional[str] = None
    possible_duplicate: Optional[bool] = None
    posted_by_aspsp: Optional[bool] = None
    posting_date: Optional[str] = None  # date
    posting_time: Optional[str] = None
    record_number: Optional[str] = None
    specific_code: Optional[str] = None
    tags: Optional[List[str]] = None
    time: Optional[str] = None  # time
    transfer_account_name: Optional[str] = None
    type: Optional[str] = None
    unit_price: Optional[float] = None
    units: Optional[float] = None
    variable_code: Optional[str] = None


class Transaction(BaseModel):
    id: Optional[str] = None
    account_id: Optional[str] = None
    duplicated: Optional[bool] = None
    mode: Optional[str] = None  # normal|fee|transfer
    status: Optional[str] = None  # posted|pending
    made_on: Optional[str] = None  # date
    amount: Optional[float] = None
    currency_code: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    extra: Optional[TransactionExtra] = None
    created_at: Optional[str] = None  # date-time
    updated_at: Optional[str] = None  # date-time


class TransactionsResponse(BaseModel):
    data: List[Transaction]
    meta: Optional[MetaObject] = None


# ----- PUT /transactions payload & response -----


class UpdateTransactionsData(BaseModel):
    connection_id: str
    transaction_ids: Annotated[List[str], BeforeValidator(_list_to_strs)]
    duplicate: bool
    model_config = ConfigDict(extra="allow")


class UpdateTransactionsRequestBody(BaseModel):
    data: UpdateTransactionsData
    model_config = ConfigDict(extra="allow")


class UpdateTransactionsDataResult(BaseModel):
    duplicated: bool = True
    transaction_ids: Annotated[List[str], BeforeValidator(_list_to_strs)]
    model_config = ConfigDict(extra="allow")


class UpdateTransactionsResponse(BaseModel):
    data: UpdateTransactionsDataResult
    model_config = ConfigDict(extra="allow")
