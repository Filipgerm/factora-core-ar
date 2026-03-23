from __future__ import annotations
from typing import Any, Iterator

from packages.saltedge.http import SaltEdgeClient
from packages.saltedge.utils.pagination import paginate
from packages.saltedge.models.connections import ConnectionsResponse, Connection


class ConnectionsAPI:
    """Endpoint wrappers for /connections.* (v6)

    Notes:
      - Most list endpoints require `customer_id` (Salt Edge-assigned user id).
      - Pagination uses `from_id` and returns `meta.next_id` / `meta.next_page`.
    """

    def __init__(self, client: SaltEdgeClient) -> None:
        self._client = client

    # ----- List Connections -----
    def list(
        self,
        *,
        customer_id: str,
        from_id: str | None = None,
        per_page: int | None = None,
    ) -> ConnectionsResponse:
        params: dict[str, Any] = {"customer_id": customer_id}
        if from_id is not None:
            params["from_id"] = from_id
        if per_page is not None:
            params["per_page"] = per_page
        data = self._client.get("/connections", params=params).json()
        return ConnectionsResponse.model_validate(data)

    def iterate(
        self, *, customer_id: str, per_page: int | None = None
    ) -> Iterator[ConnectionsResponse]:
        def _fetch(p: dict[str, Any]) -> dict[str, Any]:
            base = {"customer_id": customer_id}
            if per_page is not None:
                base["per_page"] = per_page
            merged = {**base, **p}
            return self._client.get("/connections", params=merged).json()

        for page in paginate(_fetch, {}):
            yield ConnectionsResponse.model_validate(page)

    # ----- Get a single Connection -----
    def get(self, connection_id: str) -> Connection:
        data = self._client.get(f"/connections/{connection_id}").json()
        obj = data.get("data") if isinstance(data, dict) else None
        return Connection.model_validate(obj or {})

    # ----- Create /connect -----
    def connect(self, *, payload: dict) -> dict:
        """POST /connections/connect

        `payload` must comply with the OpenAPI spec (contains `data` with `customer_id`, `consent`, `kyc`, etc.).
        Returns the raw JSON response as server may include redirect URLs, etc.
        """
        return self._client.post("/connections/connect", json=payload).json()

    # ----- Reconnect -----
    def reconnect(self, connection_id: str, *, payload: dict | None = None) -> dict:
        return self._client.post(
            f"/connections/{connection_id}/reconnect", json=payload or {}
        ).json()

    # ----- Refresh -----
    def refresh(self, connection_id: str) -> dict:
        return self._client.post(
            f"/connections/{connection_id}/refresh",
            json={"data": {}},
        ).json()

    # ----- Background Refresh -----
    def background_refresh(self, connection_id: str) -> dict:
        return self._client.post(
            f"/connections/{connection_id}/background_refresh",
            json={"data": {}},
        ).json()
