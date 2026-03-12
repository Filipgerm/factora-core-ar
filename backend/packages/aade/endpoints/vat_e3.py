# endpoints/vat_e3.py
from __future__ import annotations
from typing import Dict, Any, Iterator, Optional, Protocol, Callable, Type, TypeVar

from pydantic import BaseModel
from packages.aade.http import AadeClient
from packages.aade.utils.pagination import paginate
from packages.aade.models.vat_info import (
    RequestVatInfoQuery,
    RequestVatInfoResponse,
)
from packages.aade.models.e3_info import (
    RequestE3InfoQuery,
    RequestE3InfoResponse,
)


# XML parser dependency for VAT & E3 endpoints
class VatE3XMLSerializer(Protocol):
    def parse_vat_info(self, xml_text: str) -> Dict[str, Any]: ...
    def parse_e3_info(self, xml_text: str) -> Dict[str, Any]: ...


TResp = TypeVar("TResp", bound=BaseModel)


class VatE3API:
    """
    Endpoint wrappers for:
      - GET /myDATA/RequestVatInfo
      - GET /myDATA/RequestE3Info

    Notes:
      - VAT supports GroupedPerDay; when present, AADE expects a boolean-like query ("true"/"false").
      - Responses are XML; we depend on a serializer that returns dicts matching the Pydantic responses.
    """

    def __init__(
        self, client: AadeClient, *, serializer: Optional[VatE3XMLSerializer] = None
    ) -> None:
        self._client = client
        self._serializer = serializer

    # -------- VAT --------
    def request_vat_info(self, q: RequestVatInfoQuery) -> RequestVatInfoResponse:
        params = q.model_dump(exclude_none=True)
        # Ensure AADE-friendly boolean strings for GroupedPerDay
        if "GroupedPerDay" in params:
            params["GroupedPerDay"] = "true" if params["GroupedPerDay"] else "false"

        # xml = self._client.get("/myDATA/RequestVatInfo", params=params).text  #Production
        xml = self._client.get("/RequestVatInfo", params=params).text
        if not self._serializer:
            raise RuntimeError(
                "XML serializer not set: inject one with parse_vat_info(xml) -> dict"
            )
        data = self._serializer.parse_vat_info(xml)
        return RequestVatInfoResponse.model_validate(data)

    def iterate_vat_info(
        self, q: RequestVatInfoQuery
    ) -> Iterator[RequestVatInfoResponse]:
        base_params = q.model_dump(exclude_none=True)
        if "GroupedPerDay" in base_params:
            base_params["GroupedPerDay"] = (
                "true" if base_params["GroupedPerDay"] else "false"
            )

        def _fetch(p: Dict[str, Any]) -> Dict[str, Any]:
            merged = {**base_params, **p}
            # xml = self._client.get("/myDATA/RequestVatInfo", params=merged).text #Production
            xml = self._client.get("/RequestVatInfo", params=merged).text
            if not self._serializer:
                raise RuntimeError(
                    "XML serializer not set: inject one with parse_vat_info(xml) -> dict"
                )
            return self._serializer.parse_vat_info(xml)

        for page in paginate(_fetch, {}):
            yield RequestVatInfoResponse.model_validate(page)

    # -------- E3 --------
    def request_e3_info(self, q: RequestE3InfoQuery) -> RequestE3InfoResponse:
        params = q.model_dump(exclude_none=True)
        if "GroupedPerDay" in params:
            params["GroupedPerDay"] = "true" if params["GroupedPerDay"] else "false"

        # xml = self._client.get("/myDATA/RequestE3Info", params=params).text # Production
        xml = self._client.get("/RequestE3Info", params=params).text
        if not self._serializer:
            raise RuntimeError(
                "XML serializer not set: inject one with parse_e3_info(xml) -> dict"
            )
        data = self._serializer.parse_e3_info(xml)
        return RequestE3InfoResponse.model_validate(data)

    def iterate_e3_info(self, q: RequestE3InfoQuery) -> Iterator[RequestE3InfoResponse]:
        base_params = q.model_dump(exclude_none=True)
        if "GroupedPerDay" in base_params:
            base_params["GroupedPerDay"] = (
                "true" if base_params["GroupedPerDay"] else "false"
            )

        def _fetch(p: Dict[str, Any]) -> Dict[str, Any]:
            merged = {**base_params, **p}
            # xml = self._client.get("/myDATA/RequestE3Info", params=merged).text # Production
            xml = self._client.get("/RequestE3Info", params=merged).text
            if not self._serializer:
                raise RuntimeError(
                    "XML serializer not set: inject one with parse_e3_info(xml) -> dict"
                )
            return self._serializer.parse_e3_info(xml)

        for page in paginate(_fetch, {}):
            yield RequestE3InfoResponse.model_validate(page)
