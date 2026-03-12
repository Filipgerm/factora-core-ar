from __future__ import annotations
from typing import Callable, Dict, Any, Iterator, Optional, Protocol

from packages.aade.http import AadeClient
from packages.aade.utils.pagination import paginate
from packages.aade.models.docs import (
    DocsQuery,
    RequestedDocsResponse,
)
from packages.aade.models.common import ContinuationTokenType


# Define a tiny protocol for the XML parser dependency.
class DocsXMLSerializer(Protocol):
    def parse_requested_docs(self, xml_text: str) -> Dict[str, Any]: ...


class DocsAPI:
    """Endpoint wrappers for /myDATA/RequestDocs and /myDATA/RequestTransmittedDocs.

    Notes:
      - Both endpoints share the same query shape and response container.
      - Responses are XML; we depend on an XML serializer that returns a dict
        matching RequestedDocsResponse for Pydantic validation.
    """

    def __init__(
        self, client: AadeClient, *, serializer: Optional[DocsXMLSerializer] = None
    ) -> None:
        self._client = client
        self._serializer = serializer

    # -------- RequestDocs --------
    def request_docs(self, q: DocsQuery) -> RequestedDocsResponse:
        xml = self._client.get(
            "/RequestDocs",
            params=q.model_dump(exclude_none=True),
        ).text
        if not self._serializer:
            raise RuntimeError(
                "XML serializer not set: inject one with parse_requested_docs(xml) -> dict"
            )
        data = self._serializer.parse_requested_docs(xml)
        return RequestedDocsResponse.model_validate(data)

    def iterate_docs(self, q: DocsQuery) -> Iterator[RequestedDocsResponse]:
        base_params = q.model_dump(exclude_none=True)

        def _fetch(p: Dict[str, Any]) -> Dict[str, Any]:
            merged = {**base_params, **p}
            xml = self._client.get("/RequestDocs", params=merged).text
            if not self._serializer:
                raise RuntimeError(
                    "XML serializer not set: inject one with parse_requested_docs(xml) -> dict"
                )
            return self._serializer.parse_requested_docs(xml)

        for page in paginate(_fetch, {}):
            yield RequestedDocsResponse.model_validate(page)

    # -------- RequestTransmittedDocs --------
    def request_transmitted_docs(self, q: DocsQuery) -> RequestedDocsResponse:
        xml = self._client.get(
            "/RequestTransmittedDocs",
            params=q.model_dump(exclude_none=True),
        ).text
        if not self._serializer:
            raise RuntimeError(
                "XML serializer not set: inject one with parse_requested_docs(xml) -> dict"
            )
        data = self._serializer.parse_requested_docs(xml)
        return RequestedDocsResponse.model_validate(data)

    def iterate_transmitted_docs(self, q: DocsQuery) -> Iterator[RequestedDocsResponse]:
        base_params = q.model_dump(exclude_none=True)

        def _fetch(p: Dict[str, Any]) -> Dict[str, Any]:
            merged = {**base_params, **p}
            xml = self._client.get("/RequestTransmittedDocs", params=merged).text
            if not self._serializer:
                raise RuntimeError(
                    "XML serializer not set: inject one with parse_requested_docs(xml) -> dict"
                )
            return self._serializer.parse_requested_docs(xml)

        for page in paginate(_fetch, {}):
            yield RequestedDocsResponse.model_validate(page)
