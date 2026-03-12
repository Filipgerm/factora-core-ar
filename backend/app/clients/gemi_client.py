import os
from typing import Any, Dict, List, Optional, Tuple
import httpx
from fastapi import HTTPException

API_BASE = "https://opendata-api.businessportal.gr/api/opendata/v1"

class GemiApiClient:
    """
    Thin wrapper over GEMI OpenData API.
    Reuse this for *all* endpoints to avoid duplication.
    """
    def __init__(
        self,
        api_key: str,
        client: Optional[httpx.AsyncClient] = None,
        timeout: float = 70.0,
    ):
        self.api_key = api_key
        self._external_client = client  # if provided, we won't close it
        self._timeout = timeout

    def _headers(self) -> Dict[str, str]:
        return {
            "accept": "application/json",
            "api_key": self.api_key,
        }

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        stream: bool = False,
    ) -> httpx.Response:
        url = f"{API_BASE.rstrip('/')}/{path.lstrip('/')}"
        h = self._headers()
        if headers:
            h.update(headers)

        # Use injected client if present; otherwise create per call
        if self._external_client:
            client = self._external_client
            close_after = False
        else:
            client = httpx.AsyncClient(timeout=self._timeout)
            close_after = True

        try:
            resp = await client.request(method, url, params=params, headers=h, timeout=self._timeout, follow_redirects=True)
            if resp.status_code >= 400:
                # Try to surface API error body
                detail: Any
                try:
                    detail = resp.json()
                except Exception:
                    detail = resp.text
                raise HTTPException(status_code=resp.status_code, detail={"url": url, "params": params, "error": detail})
            return resp
        finally:
            if close_after:
                await client.aclose()

    # ===== High-level endpoint helpers =====

    async def search_companies_by_afm(self, afm: str) -> Dict[str, Any]:
        """
        GET /companies?afm=<afm>
        Returns JSON with 'searchResults'.
        """
        resp = await self._request("GET", "/companies", params={"afm": afm})
        return resp.json()
    
    async def search_companies_by_gemi_number(self, ar_gemi: str) -> Dict[str, Any]:
        """
        GET /companies?arGemi=<arGemi>
        Returns JSON with 'searchResults'
        """
        resp = await self._request("GET", "/companies", params={"arGemi": ar_gemi})
        return resp.json()

    async def get_company_documents(self, ar_gemi: str) -> Dict[str, Any]:
        """
        GET /companies/{ar_gemi}/documents
        Returns JSON with 'decision' array.
        """
        resp = await self._request("GET", f"/companies/{ar_gemi}/documents")
        return resp.json()

    async def download_binary(self, url: str) -> httpx.Response:
        """
        Download a binary file (PDF etc.). GEMI provides full URLs for documents.
        Note: these downloads also require `api_key` header, so we reuse _request by path-mapping.
        Since url is absolute, call httpx directly with headers to preserve API key.
        """
        if self._external_client:
            client = self._external_client
            close_after = False
        else:
            client = httpx.AsyncClient(timeout=self._timeout)
            close_after = True

        try:
            resp = await client.get(url, headers=self._headers(), timeout=self._timeout, follow_redirects=True)
            if resp.status_code >= 400:
                raise HTTPException(status_code=resp.status_code, detail={"url": url, "error": resp.text})
            return resp
        finally:
            if close_after:
                await client.aclose()