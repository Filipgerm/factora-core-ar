from __future__ import annotations
from typing import Any, Iterator, Optional

from packages.saltedge.http import SaltEdgeClient
from packages.saltedge.utils.pagination import paginate
from packages.saltedge.models.accounts import (
    Account,
    AccountsResponse,
)


class AccountsAPI:
    def __init__(self, client: SaltEdgeClient) -> None:
        self._client = client

    # ---------- List & Get ----------
    def list(
        self,
        *,
        customer_id: Optional[str] = None,
        connection_id: Optional[str] = None,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> AccountsResponse:
        params: dict[str, Any] = {}
        if customer_id:
            params["customer_id"] = customer_id
        if connection_id:
            params["connection_id"] = connection_id
        if from_id:
            params["from_id"] = from_id
        if per_page:
            params["per_page"] = per_page
        data = self._client.get("/accounts", params=params).json()
        return AccountsResponse.model_validate(data)

    def iterate(
        self,
        *,
        customer_id: Optional[str] = None,
        connection_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> Iterator[AccountsResponse]:
        def _fetch(p: dict[str, Any]) -> dict[str, Any]:
            base: dict[str, Any] = {}
            if customer_id:
                base["customer_id"] = customer_id
            if connection_id:
                base["connection_id"] = connection_id
            if per_page:
                base["per_page"] = per_page
            return self._client.get("/accounts", params={**base, **p}).json()

        for page in paginate(_fetch, {}):
            yield AccountsResponse.model_validate(page)
