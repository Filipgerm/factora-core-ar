"""GemiController — bridges GEMI routes and GemiService."""

from __future__ import annotations

from typing import Literal

from app.models.gemi import GemiDocumentsFetchResponse, GemiSearchResponse
from app.services.gemi_service import GemiService


class GemiController:
    def __init__(self, service: GemiService) -> None:
        self.service = service

    async def gemi_search(
        self, query: str, mode: Literal["afm", "gemi_number"], limit: int = 10
    ) -> GemiSearchResponse:
        if query.isdigit():
            raw = await self.service.search(query=query, mode=mode, limit=limit)
            return GemiSearchResponse.model_validate(raw)
        return GemiSearchResponse(
            items=[],
            query=query,
            mode=mode,
            exact=False,
            warning="Name search not yet implemented",
        )

    async def fetch_and_store_company_documents(self, afm: str) -> GemiDocumentsFetchResponse:
        raw = await self.service.fetch_and_store_company_documents(afm)
        return GemiDocumentsFetchResponse.model_validate(raw)
