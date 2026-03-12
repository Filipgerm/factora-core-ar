from app.services.gemi_service import GemiService
from typing import Literal


class GemiController:
    def __init__(self, service: GemiService):
        self.service = service

    async def gemi_search(
        self, query: str, mode: Literal["afm", "gemi_number"], limit: int = 10
    ):
        # You can later detect AFM vs name. For now assume AFM if numeric length fits.
        if query.isdigit():
            return await self.service.search(query=query, mode=mode, limit=limit)
        # else: implement name search when you add a client method
        return {"warning": "Name search not yet implemented", "query": query}

    async def fetch_and_store_company_documents(self, afm: str):
        return await self.service.fetch_and_store_company_documents(afm)


def get_gemi_controller():
    return GemiController(GemiService())
