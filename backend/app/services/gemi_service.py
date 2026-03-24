import asyncio
import re
from io import BytesIO
from typing import Any, Dict, List, Literal, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.gemi_client import GemiApiClient
from app.config import settings
from app.core.exceptions import GemiError, NotFoundError, ValidationError
from app.core.filename_content_disposition import extract_filename
from app.services.storage_upload_service import upload_file_to_storage

DEFAULT_DOWNLOAD_CONCURRENCY = 5


async def bounded_gather(*aws, limit: int):
    sem = asyncio.Semaphore(limit)

    async def run(coro):
        async with sem:
            return await coro

    return await asyncio.gather(*(run(c) for c in aws))


class GemiService:
    """
    High-level business logic that *composes* the API client.
    Keep this layer free of raw HTTP calls.
    """

    def __init__(
        self,
        db: AsyncSession,
        organization_id: Optional[str] = None,
        client: Optional[GemiApiClient] = None,
    ) -> None:
        self.db = db
        self.organization_id = organization_id
        self.client = client or GemiApiClient(api_key=settings.GEMH_API_KEY)

    def _digits(self, s: str) -> str:
        return re.sub(r"\D", "", s or "")

    # Works, but needs to be approved for use. Maybe unnecessary processing.
    def _afm_checksum_ok(self, afm: str) -> bool:
        # Greek AFM (VAT): 9 digits; check digit is mod-11 of weighted sum (2^8..2^1)
        if len(afm) != 9 or not afm.isdigit():
            return False
        weights = [2**i for i in range(8, 0, -1)]  # 256,128,...,2
        total = sum(int(d) * w for d, w in zip(afm[:8], weights))
        check = total % 11 % 10
        return check == int(afm[8])

    async def fetch_and_store_company_documents(self, afm: str) -> Dict[str, Any]:
        # 1) Search by AFM
        data = await self.client.search_companies_by_afm(afm)
        search_results = data.get("searchResults", [])
        if not search_results:
            raise NotFoundError("No results found for this AFM.", code="gemi.not_found")

        # Decide which result to use according to GEMI swagger documentation.
        company = search_results[0]
        ar_gemi: str = company.get("arGemi")
        company_name: str = (
            company.get("coNameEl") or company.get("coName") or "company"
        )

        # Optional: sanity prints / logging for activities
        # activities = company.get("activities", [])
        # for i, act in enumerate(activities):
        #     print(f"[{i}] {act.get('activity', {}).get('descr')}")

        # 2) List documents for this GEMI
        doc_data = await self.client.get_company_documents(ar_gemi)
        decisions: List[Dict[str, Any]] = doc_data.get("decision", []) or []

        # Filter only documents we know how to download (assemblyDecisionUrl, etc.)
        urls: List[str] = [
            d["assemblyDecisionUrl"]
            for d in decisions
            if isinstance(d, dict) and d.get("assemblyDecisionUrl")
        ]

        if not urls:
            return {
                "company": company_name,
                "documents_uploaded": 0,
                "message": f"No downloadable assembly decisions found for {company_name} (AR GEMI: {ar_gemi}).",
            }

        # 3) Download in parallel (bounded)
        downloads = await bounded_gather(
            *(self.client.download_binary(url) for url in urls),
            limit=DEFAULT_DOWNLOAD_CONCURRENCY,
        )

        # 4) Store to Database
        uploaded = 0
        for idx, resp in enumerate(downloads):
            contents: bytes = resp.content
            fallback = f"document_{idx+1}.pdf"
            # filename = extract_filename(resp.headers.get("content-disposition", ""), fallback)
            filename = f"{company_name}_{idx+1}"
            metadata = {
                "file_size": len(contents),
                "document_index": idx + 1,
                "ar_gemi": ar_gemi,
                "company_name": company_name,
            }
            if self.organization_id:
                metadata["organization_id"] = self.organization_id
            await upload_file_to_storage(
                BytesIO(contents), filename=filename, metadata=metadata
            )
            uploaded += 1

        return {
            "company": company_name,
            "documents_uploaded": uploaded,
            "message": f"✅ Uploaded {uploaded} documents for {company_name} (AR GEMI: {ar_gemi})",
        }

    async def search(
        self, query: str, mode: Literal["afm", "gemi_number"], limit: int = 10
    ) -> Dict[str, Any]:
        """
        Extension point if later you support live search engine.
        """
        digits = self._digits(query)

        # #throttle short inputs to keep API fast/cheap. FUTURE feature for non complete searches.
        # min_length = 3 if mode = "afm" else 4
        # if len(digits) < min_length:
        #     return {"items": [],
        #             "query": digits,
        #             "mode": mode
        #             }

        if mode == "afm":
            # If full AFM typed and checksum is valid → exact search
            if len(digits) == 9 and self._afm_checksum_ok(digits):
                data = await self.client.search_companies_by_afm(digits)
                items = self._normalize_results(data)
                return {
                    "items": items[:limit],
                    "query": digits,
                    "mode": mode,
                    "exact": True,
                }
            else:
                # not a valid AFM -> no call
                return {"items": [], "query": digits, "mode": mode, "exact": False}

        elif mode == "gemi_number":
            # AR GEMI is also an exact match on this endpoint
            data = await self.client.search_companies_by_gemi_number(digits)
            items = self._normalize_results(data)
            return {
                "items": items[:limit],
                "query": digits,
                "mode": mode,
                "exact": True,
            }

        raise ValidationError(
            f"Unsupported search mode: {mode}",
            code="validation.invalid_mode",
            fields={"mode": "Must be 'afm' or 'gemi_number'"},
        )

    def _normalize_results(self, raw: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Map upstream payload to a compact, UI-friendly suggestion format.
        Adjust keys to match your upstream API.
        """
        results = raw.get("searchResults", []) or raw.get("items", []) or []
        items: List[Dict[str, Any]] = []

        # When given full identifier, only one result provided
        def descr(d: Any) -> Optional[str]:
            return d.get("descr") if isinstance(d, dict) else None

        def clean(s: Any) -> str:
            return s.strip() if isinstance(s, str) else ""

        for company in results:
            if not isinstance(company, dict):
                continue

            # Prefer Greek name, then generic, then English list first item
            company_name = company.get("coNameEl") or company.get("coName") or "company"

            item = {
                "company_name": clean(company_name),
                "afm": company.get("afm") or "",
                "ar_gemi": company.get("arGemi") or "",
                "legal_type": descr(company.get("legalType")) or "",
                "zip_code": company.get("zipCode") or "",
                "municipality": descr(company.get("municipality")) or "",
                "city": company.get("city") or "",
                "street": company.get("street") or "",
                "street_number": company.get("streetNumber") or "",
                "phone": company.get("phone") or "",
                "email": company.get("email") or "",
                "objective": company.get("objective") or "",
                "status": descr(company.get("status")) or "",
                "gemi_office": descr(company.get("gemiOffice")) or "",
            }
            items.append(item)
        return items
