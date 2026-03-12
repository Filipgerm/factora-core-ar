from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from decimal import Decimal
from enum import Enum
from datetime import datetime, date, time


class CardNetwork(str, Enum):
    american_express = "american_express"
    china_unionpay = "china_unionpay"
    diners_club = "diners_club"
    jcb = "jcb"
    maestro = "maestro"
    master_card = "master_card"
    uatp = "uatp"
    visa = "visa"
    mir = "mir"


class TransactionsCount(BaseModel):
    posted: Optional[int] = None
    pending: Optional[int] = None


class GeneralAccountExtra(BaseModel):
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    assets: Optional[List[str]] = None
    available_amount: Optional[Decimal] = None
    balance_type: Optional[str] = None
    balance_updated_at: Optional[datetime] = None
    blocked_amount: Optional[Decimal] = None
    card_network: Optional[CardNetwork] = None
    cards: Optional[List[str]] = None
    holder_name: Optional[str] = None
    closing_balance: Optional[Decimal] = None
    credit_limit: Optional[Decimal] = None
    current_date: Optional[date] = None
    current_time: Optional[time] = None
    expiry_date: Optional[date] = None
    iban: Optional[str] = None
    bban: Optional[str] = None
    interest_rate: Optional[Decimal] = None
    interest_type: Optional[str] = None
    floating_interest_rate: Optional[Dict[str, Decimal]] = None
    masked_pan: Optional[str] = None
    remaining_payments: Optional[int] = None
    penalty_amount: Optional[Decimal] = None
    next_payment_amount: Optional[Decimal] = None
    next_payment_date: Optional[date] = None
    open_date: Optional[date] = None
    opening_balance: Optional[Decimal] = None
    partial: Optional[bool] = None
    provider_account_id: Optional[str] = None
    raw_balance: Optional[str] = None
    sort_code: Optional[str] = None
    statement_cut_date: Optional[date] = None
    status: Optional[str] = None
    swift: Optional[str] = None
    total_payment_amount: Optional[Decimal] = None
    transactions_count: Optional[TransactionsCount] = None
    payment_type: Optional[str] = None
    cashback_amount: Optional[Decimal] = None
    monthly_total_payment: Optional[Decimal] = None
    minimum_payment: Optional[Decimal] = None


class InvestmentAccountExtra(BaseModel):
    investment_amount: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    units: Optional[Decimal] = None
    indicative_unit_price: Optional[Decimal] = None
    interest_income: Optional[Decimal] = None
    interest_amount: Optional[Decimal] = None
    profit_amount: Optional[Decimal] = None
    profit_rate: Optional[Decimal] = None
    asset_class: Optional[str] = None
    product_type: Optional[str] = None
    total_unit_value: Optional[Decimal] = None
    fund_holdings: Optional[Dict[str, Any]] = None


class InsuranceAccountExtra(BaseModel):
    premium_frequency: Optional[str] = None
    policy_status: Optional[str] = None
    life_assured_name: Optional[str] = None
    premium_amount: Optional[Decimal] = None
    single_premium_amount: Optional[Decimal] = None
    financial_consultant: Optional[str] = None
    total_reversionary_bonus: Optional[Decimal] = None
    gross_surrender: Optional[Decimal] = None
    guaranteed_gross_surrender: Optional[Decimal] = None
    reversionary_bonus_cash_value: Optional[Decimal] = None
    owned_policy_amount: Optional[Decimal] = None
    policy_loan_limit: Optional[Decimal] = None
    policy_converted_to_paid_up: Optional[Decimal] = None
    paid_up_conversion_reversionary_bonus: Optional[Decimal] = None
    policy_components: Optional[Dict[str, Any]] = None


# "allOf": merge all props into one object
class AccountExtra(GeneralAccountExtra, InvestmentAccountExtra, InsuranceAccountExtra):
    pass


class Nature(str, Enum):
    account = "account"
    bonus = "bonus"
    card = "card"
    checking = "checking"
    credit = "credit"
    credit_card = "credit_card"
    debit_card = "debit_card"
    ewallet = "ewallet"
    insurance = "insurance"
    investment = "investment"
    loan = "loan"
    mortgage = "mortgage"
    savings = "savings"


class Account(BaseModel):
    id: str
    connection_id: str
    name: str
    nature: Nature
    balance: Decimal
    currency_code: str
    extra: AccountExtra
    created_at: datetime
    updated_at: datetime

    model_config = {
        "json_encoders": {
            Decimal: str,
        }
    }


class AccountsResponse(BaseModel):
    data: List[Account]
    meta: Optional[dict] = (
        None  # carries pagination meta (next_id/next_page) if provided
    )


class Balance(BaseModel):
    amount: Optional[float] = None
    currency_code: Optional[str] = None
    date: Optional[str] = None  # ISO date
    type: Optional[str] = None  # e.g., available, current
    extra: Optional[dict] = None
