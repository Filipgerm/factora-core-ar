from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict
from packages.saltedge.models.connections import MetaObject  # <- as requested


# ----- Payment Templates -----


class PaymentTemplateExtraField(BaseModel):
    validation_regexp: Optional[str] = None
    model_config = ConfigDict(extra="allow")


class PaymentTemplateField(BaseModel):
    name: Optional[str] = None
    english_name: Optional[str] = None
    localized_name: Optional[str] = None
    nature: Optional[str] = None  # text|password|select|file|number|dynamic_select
    position: Optional[int] = None
    extra: Optional[PaymentTemplateExtraField] = None
    optional: Optional[bool] = None
    model_config = ConfigDict(extra="allow")


class PaymentTemplate(BaseModel):
    identifier: Optional[str] = None
    description: Optional[str] = None
    payment_fields: Optional[List[PaymentTemplateField]] = None
    model_config = ConfigDict(extra="allow")


class PaymentTemplateResponse(BaseModel):
    data: Optional[PaymentTemplate] = None
    model_config = ConfigDict(extra="allow")


class PaymentTemplatesResponse(BaseModel):
    data: Optional[List[PaymentTemplate]] = None
    model_config = ConfigDict(extra="allow")


# ----- Payment core models -----


class LastAttempt(BaseModel):
    id: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None
    model_config = ConfigDict(extra="allow")


class Payment(BaseModel):
    id: Optional[str] = None
    customer_id: Optional[str] = None
    provider_code: Optional[str] = None
    provider_name: Optional[str] = None
    refresh_interval: Optional[int] = None
    refresh_timeout: Optional[int] = None
    status: Optional[str] = None
    raw_provider_status: Optional[str] = None
    template_identifier: Optional[str] = None
    payment_attributes: Optional[Dict[str, Any]] = None
    last_attempt: Optional[LastAttempt] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    model_config = ConfigDict(extra="allow")


class PaymentResponse(BaseModel):
    data: Optional[Payment] = None
    model_config = ConfigDict(extra="allow")


# NOTE: In the YAML example, the list endpoint returns an array of payments (+ meta).
# We'll model that explicitly to avoid ambiguity.
class PaymentsListResponse(BaseModel):
    data: List[Payment]
    meta: Optional[MetaObject] = None
    model_config = ConfigDict(extra="allow")


# ----- Create Payment: payload & response -----


class CreatePaymentProvider(BaseModel):
    code: Optional[str] = None
    include_sandboxes: Optional[bool] = None
    model_config = ConfigDict(extra="allow")


class CreatePaymentWidget(BaseModel):
    template: Optional[str] = None
    theme: Optional[str] = None
    javascript_callback_type: Optional[str] = None
    disable_provider_search: Optional[bool] = None
    skip_provider_selection: Optional[bool] = None
    show_consent_confirmation: Optional[bool] = None
    popular_providers_country: Optional[str] = None
    skip_final_screen: Optional[bool] = None
    skip_processing_screen: Optional[bool] = None
    model_config = ConfigDict(extra="allow")


class CreatePaymentAttempt(BaseModel):
    cancellation_scopes: Optional[List[str]] = (
        None  # e.g. ["timeout", "insufficient_funds"]
    )
    custom_fields: Optional[Dict[str, Any]] = None
    return_to: Optional[str] = None
    locale: Optional[str] = None
    model_config = ConfigDict(extra="allow")


class CreatePaymentKYC(BaseModel):
    type_of_account: Optional[str] = None
    model_config = ConfigDict(extra="allow")


class CreatePaymentData(BaseModel):
    payment_attributes: Dict[str, Any]  # required by spec, but we'll still accept extra
    template_identifier: str
    customer_id: Optional[str] = None
    customer_identifier: Optional[str] = None
    provider: Optional[CreatePaymentProvider] = None
    return_error_class: Optional[bool] = None
    return_payment_id: Optional[bool] = None
    widget: Optional[CreatePaymentWidget] = None
    attempt: Optional[CreatePaymentAttempt] = None
    kyc: Optional[CreatePaymentKYC] = None
    model_config = ConfigDict(extra="allow")


class CreatePaymentRequestBody(BaseModel):
    data: CreatePaymentData
    model_config = ConfigDict(extra="allow")


class PaymentCreateData(BaseModel):
    expires_at: Optional[str] = None
    payment_url: Optional[str] = None
    customer_id: Optional[str] = None
    payment_id: Optional[str] = None
    model_config = ConfigDict(extra="allow")


class PaymentCreateResponse(BaseModel):
    data: PaymentCreateData
    model_config = ConfigDict(extra="allow")


# ----- Update / Refresh payment response -----


class UpdatePaymentResponse(BaseModel):
    # The refresh endpoint returns a complete Payment object as "data"
    data: Payment
    model_config = ConfigDict(extra="allow")
