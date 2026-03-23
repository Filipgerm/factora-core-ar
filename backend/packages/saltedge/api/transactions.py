from __future__ import annotations
from typing import Any, Optional, Dict

from packages.saltedge.http import SaltEdgeClient
from packages.saltedge.models.transactions import (
    TransactionsResponse,
    UpdateTransactionsRequestBody,
    UpdateTransactionsResponse,
)


class TransactionsAPI:
    def __init__(self, client: SaltEdgeClient) -> None:
        self._client = client

    # GET /transactions
    def list(
        self,
        *,
        connection_id: str,
        account_id: Optional[str] = None,
        pending: Optional[bool] = None,
        duplicated: Optional[bool] = None,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> TransactionsResponse:
        params: Dict[str, Any] = {"connection_id": connection_id}
        if account_id:
            params["account_id"] = account_id
        if pending is not None:
            params["pending"] = pending
        if duplicated is not None:
            params["duplicated"] = duplicated
        if from_id:
            params["from_id"] = from_id
        if per_page:
            params["per_page"] = per_page

        raw = self._client.get("/transactions", params=params).json()
        return TransactionsResponse.model_validate(raw)

    # PUT /transactions
    def update(
        self, *, payload: UpdateTransactionsRequestBody
    ) -> UpdateTransactionsResponse:
        raw = self._client.put("/transactions", json=payload.model_dump()).json()
        return UpdateTransactionsResponse.model_validate(raw)
