from __future__ import annotations
from typing import Any, Optional, Dict

from packages.saltedge.http import SaltEdgeClient
from packages.saltedge.models.rates import RatesResponse


class RatesAPI:
    def __init__(self, client: SaltEdgeClient) -> None:
        self._client = client

    def get_rates(self, *, date: Optional[str] = None) -> RatesResponse:
        # date: 'YYYY-MM-DD' (optional)
        params: Dict[str, Any] = {}
        if date:
            params["date"] = date
        raw = self._client.get("/rates", params=params).json()
        return RatesResponse.model_validate(raw)
