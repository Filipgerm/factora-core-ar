from __future__ import annotations
from typing import Optional
from packages.saltedge.http import SaltEdgeClient
from packages.saltedge.models.payments import (
    CreatePaymentRequestBody,
    PaymentCreateResponse,
    PaymentResponse,
    PaymentsListResponse,
    UpdatePaymentResponse,
)


class PaymentsAPI:
    def __init__(self, client: SaltEdgeClient) -> None:
        self._client = client

    # POST /payments/create
    def create(self, *, payload: CreatePaymentRequestBody) -> PaymentCreateResponse:
        raw = self._client.post("/payments/create", json=payload.model_dump()).json()
        return PaymentCreateResponse.model_validate(raw)

    # GET /payments?customer_id=...
    def list(
        self,
        *,
        customer_id: str,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> PaymentsListResponse:
        params = {
            "customer_id": customer_id,
            "from_id": from_id,
            "per_page": per_page,
        }
        params = {k: v for k, v in params.items() if v is not None}

        raw = self._client.get("/payments", params=params).json()
        return PaymentsListResponse.model_validate(raw)

    # GET /payments/{payment_id}
    def show(self, *, payment_id: str) -> PaymentResponse:
        raw = self._client.get(f"/payments/{payment_id}").json()
        return PaymentResponse.model_validate(raw)

    # PUT /payments/{payment_id}/refresh
    def refresh(self, *, payment_id: str) -> UpdatePaymentResponse:
        raw = self._client.put(f"/payments/{payment_id}/refresh").json()
        return UpdatePaymentResponse.model_validate(raw)
