from __future__ import annotations
import httpx
from typing import Any, Mapping, Optional
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.config import Settings
from .errors import NetworkError, ApiError

DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}


class SaltEdgeClient:
    """Thin HTTP client for Salt Edge v6.

    Handles base URL, auth headers (App-id & Secret), timeouts, and retries.
    """

    def __init__(
        self, settings: Settings, *, transport: httpx.BaseTransport | None = None
    ) -> None:
        self.settings = settings
        self._client = httpx.Client(
            base_url=getattr(
                self.settings, "SALTEDGE_BASE_URL", "https://www.saltedge.com/api/v6"
            ),
            timeout=30,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "App-id": self.settings.SALTEDGE_APP_ID,
                "Secret": self.settings.SALTEDGE_SECRET,
            },
            transport=transport,
        )

    def close(self) -> None:
        self._client.close()

    def _handle_response(self, resp: httpx.Response) -> httpx.Response:
        if 200 <= resp.status_code < 300:
            return resp
        # Try to extract Salt Edge error payload
        try:
            data = resp.json()
        except Exception:
            data = None
        message = None
        details = None
        if isinstance(data, dict):
            message = (
                data.get("error_message") or data.get("error") or data.get("message")
            )
            details = data
        raise ApiError(resp.status_code, message or "Unexpected API error", details)

    @retry(
        retry=retry_if_exception_type(NetworkError),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=8),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    def _request(
        self,
        method: str,
        url: str,
        *,
        headers: Optional[Mapping[str, str]] = None,
        json: Any = None,
        params: Optional[Mapping[str, Any]] = None,
    ) -> httpx.Response:
        try:
            resp = self._client.request(
                method, url, headers=headers, json=json, params=params
            )
        except httpx.TimeoutException as e:
            raise NetworkError(f"Timeout: {e}") from e
        except httpx.TransportError as e:
            raise NetworkError(f"Transport error: {e}") from e
        return self._handle_response(resp)

    def get(
        self,
        url: str,
        *,
        params: Optional[Mapping[str, Any]] = None,
        headers: Optional[Mapping[str, str]] = None,
    ) -> httpx.Response:
        return self._request("GET", url, params=params, headers=headers)

    def post(
        self,
        url: str,
        *,
        json: Any = None,
        headers: Optional[Mapping[str, str]] = None,
        params: Optional[Mapping[str, Any]] = None,
    ) -> httpx.Response:
        return self._request("POST", url, json=json, headers=headers, params=params)

    def delete(
        self, url: str, *, headers: Optional[Mapping[str, str]] = None
    ) -> httpx.Response:
        return self._request("DELETE", url, headers=headers)

    def put(
        self,
        url: str,
        *,
        json: Any = None,
        headers: Optional[Mapping[str, str]] = None,
        params: Optional[Mapping[str, Any]] = None,
    ) -> httpx.Response:
        return self._request("PUT", url, json=json, headers=headers, params=params)
