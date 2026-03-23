from __future__ import annotations
from typing import Any, Optional

from packages.saltedge.http import SaltEdgeClient
from packages.saltedge.models.consents import ConsentsResponse, ConsentResponse


class ConsentsAPI:
    def __init__(self, client: SaltEdgeClient) -> None:
        self._client = client

    # def create(self, payload: dict) -> ConsentResponse:
    #     data = self._client.post("/consents", json=payload).json()
    #     return ConsentResponse.model_validate(data)

    def list(
        self,
        *,
        customer_id: Optional[str] = None,
        connection_id: Optional[str] = None,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> ConsentsResponse:
        params: dict[str, Any] = {}
        if customer_id:
            params["customer_id"] = customer_id
        if connection_id:
            params["connection_id"] = connection_id
        if from_id:
            params["from_id"] = from_id
        if per_page:
            params["per_page"] = per_page
        data = self._client.get("/consents", params=params).json()
        print("params", params)
        print("data", data)
        return ConsentsResponse.model_validate(data)

    def get(
        self,
        consent_id: str,
        *,
        connection_id: str | None = None,
        customer_id: str | None = None,
    ) -> dict:
        params: dict[str, Any] = {}
        if connection_id is not None:
            params["connection_id"] = connection_id
        if customer_id is not None:
            params["customer_id"] = customer_id
        return self._client.get(f"/consents/{consent_id}", params=params).json()

    def revoke(self, *, consent_id: str) -> ConsentResponse:
        data = self._client.post(
            f"/consents/{consent_id}/revoke", json={"data": {}}
        ).json()
        return ConsentResponse.model_validate(data)
