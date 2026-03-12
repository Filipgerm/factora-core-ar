from __future__ import annotations
import httpx
from typing import Any, Mapping, Optional
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)
import xml.etree.ElementTree as ET

from app.config import Settings
from .errors import NetworkError, ApiError

DEFAULT_HEADERS = {
    "Accept": "application/xml",
}


class AadeClient:
    """Thin HTTP client for AADE myData API.

    Handles base URL, auth headers (aade-user-id & ocp-apim-subscription-key), timeouts, and retries.
    """

    def __init__(
        self, settings: Settings, *, transport: httpx.BaseTransport | None = None
    ) -> None:
        self.settings = settings
        self._client = httpx.Client(
            base_url=getattr(
                self.settings,
                "AADE_BASE_URL",
                "https://mydatapi.aade.gr/MYDATA",  # Production url for default.
                # "https://mydataapidev.aade.gr",   # Sandbox url
            ),
            timeout=30,
            headers={
                **DEFAULT_HEADERS,
                "aade-user-id": self.settings.AADE_USERNAME,
                "ocp-apim-subscription-key": self.settings.AADE_SUBSCRIPTION_KEY,
            },
            transport=transport,
        )

    def close(self) -> None:
        self._client.close()

    def _handle_response(self, resp: httpx.Response) -> httpx.Response:
        if 200 <= resp.status_code < 300:
            return resp

        message = None
        details = None

        # Try JSON first
        try:
            data = resp.json()
            if isinstance(data, dict):
                message = (
                    data.get("error_message")
                    or data.get("error")
                    or data.get("message")
                )
                details = data
        except Exception:
            pass

        # XML error (namespace-agnostic)
        if message is None:
            ct = (resp.headers.get("content-type") or "").lower()
            if "xml" in ct or resp.text.lstrip().startswith("<"):
                try:
                    root = ET.fromstring(resp.text)
                    # namespace-agnostic scan
                    msg_val = None
                    code_val = None
                    for el in root.iter():
                        local = el.tag.split("}", 1)[-1].lower()
                        txt = (el.text or "").strip()
                        if not txt:
                            continue
                        if local == "message" and not msg_val:
                            msg_val = txt
                        elif local == "code" and not code_val:
                            code_val = txt

                    if msg_val:
                        message = msg_val
                    if code_val:
                        details = {"code": code_val}
                except Exception:
                    pass

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
        params: Optional[Mapping[str, Any]] = None,
    ) -> httpx.Response:
        try:
            resp = self._client.request(method, url, headers=headers, params=params)
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
