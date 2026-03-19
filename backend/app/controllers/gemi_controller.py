"""GemiController — bridges GEMI routes and GemiService."""

from __future__ import annotations

from typing import Literal

from app.services.gemi_service import GemiService


class GemiController:
    def __init__(self, service: GemiService) -> None:
        self.service = service

    async def gemi_search(
        self, query: str, mode: Literal["afm", "gemi_number"], limit: int = 10
    ):
        if query.isdigit():
            return await self.service.search(query=query, mode=mode, limit=limit)
        return {"warning": "Name search not yet implemented", "query": query}

    async def fetch_and_store_company_documents(self, afm: str):
        return await self.service.fetch_and_store_company_documents(afm)
