from __future__ import annotations
from typing import Any, Optional, Dict

from packages.saltedge.http import SaltEdgeClient
from packages.saltedge.models.customers import (
    CustomersResponse,
    CustomerResponse,
    CreatedClientCustomerResponse,
    CreatedPartnerCustomerResponse,
    RemovedCustomerResponse,
)


class CustomersAPI:
    def __init__(self, client: SaltEdgeClient) -> None:
        self._client = client

    # POST /customers (oneOf request/response: client or partner)
    def create(self, *, payload: Dict[str, Any]):
        raw = self._client.post("/customers", json=payload).json()
        # The spec returns oneOf: CreatedClientCustomerResponse | CreatedPartnerCustomerResponse
        # We can try to detect presence of "email" to choose the model, else default to client shape.
        try:
            data = (raw or {}).get("data", {})
            if isinstance(data, dict) and "email" in data:
                return CreatedPartnerCustomerResponse.model_validate(raw)
            return CreatedClientCustomerResponse.model_validate(raw)
        except Exception:
            # fallback: return raw if validation fails (optional)
            return raw

    # GET /customers
    def list(
        self, *, from_id: Optional[str] = None, per_page: Optional[int] = None
    ) -> CustomersResponse:
        params: Dict[str, Any] = {}
        if from_id:
            params["from_id"] = from_id
        if per_page:
            params["per_page"] = per_page
        raw = self._client.get("/customers", params=params).json()
        return CustomersResponse.model_validate(raw)

    # GET /customers/{customer_id}
    def get(self, *, customer_id: str) -> CustomerResponse:
        raw = self._client.get(f"/customers/{customer_id}").json()
        return CustomerResponse.model_validate(raw)

    # DELETE /customers/{customer_id}
    def delete(self, *, customer_id: str) -> RemovedCustomerResponse:
        raw = self._client.delete(f"/customers/{customer_id}").json()
        return RemovedCustomerResponse.model_validate(raw)
