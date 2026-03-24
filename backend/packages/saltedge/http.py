from __future__ import annotations
import re
import httpx
from typing import Any, Mapping, Optional
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.config import Settings
from app.core.demo import get_demo_payload
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

    def _demo_saltedge_response(
        self,
        method: str,
        url: str,
        *,
        json_body: Any = None,
        params: Optional[Mapping[str, Any]] = None,
    ) -> httpx.Response:
        """Return a synthetic Salt Edge v6 JSON response (demo mode only; no real HTTP)."""
        path = url.split("?", 1)[0].rstrip("/") or "/"
        params = dict(params or {})

        def ok(data: Any) -> httpx.Response:
            return httpx.Response(200, json=data)

        if method == "GET" and path == "/accounts":
            return ok(get_demo_payload("saltedge_accounts"))
        if method == "GET" and path == "/customers":
            return ok(get_demo_payload("saltedge_customers"))
        if method == "POST" and path == "/customers":
            inner = (json_body or {}).get("data") or {}
            cid = inner.get("customer_id") or "demo-customer-created"
            return ok(
                {
                    "data": {
                        "customer_id": cid,
                        "identifier": inner.get("identifier") or "Demo customer",
                        "categorization_type": inner.get("categorization_type")
                        or "business",
                        "blocked_at": None,
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z",
                    }
                }
            )
        m = re.fullmatch(r"/customers/([^/]+)", path)
        if m is not None:
            cid = m.group(1)
            if method == "GET":
                for row in get_demo_payload("saltedge_customers").get("data", []):
                    if row.get("customer_id") == cid:
                        return ok({"data": row})
                return httpx.Response(
                    404, json={"error_message": "Customer not found"}
                )
            if method == "DELETE":
                return ok({"data": {"deleted": True, "customer_id": cid}})
        if method == "GET" and path == "/transactions":
            return ok(get_demo_payload("saltedge_transactions"))
        if method == "PUT" and path == "/transactions":
            ids = (json_body or {}).get("data", {}).get("transaction_ids") or []
            return ok({"data": {"duplicated": False, "transaction_ids": ids}})
        if method == "GET" and path == "/connections":
            return ok(get_demo_payload("saltedge_connections"))
        m = re.fullmatch(r"/connections/([^/]+)", path)
        if m is not None:
            cid = m.group(1)
            conn_rows = get_demo_payload("saltedge_connections").get("data") or []
            for c in conn_rows:
                if c.get("id") == cid:
                    return ok({"data": c})
            return httpx.Response(404, json={"error_message": "Connection not found"})
        if method == "POST" and path == "/connections/connect":
            return ok(
                {
                    "data": {
                        "secret": "demo-connect-secret",
                        "expires_at": "2099-12-31T23:59:59Z",
                        "connect_url": "https://example.com/saltedge/demo-connect",
                    }
                }
            )
        if method == "POST" and re.fullmatch(
            r"/connections/([^/]+)/reconnect", path
        ):
            return ok({"data": {}})
        if method == "POST" and re.fullmatch(r"/connections/([^/]+)/refresh", path):
            return ok({"data": {}})
        if method == "POST" and re.fullmatch(
            r"/connections/([^/]+)/background_refresh", path
        ):
            return ok({"data": {}})
        if method == "GET" and path == "/consents":
            return ok({"data": [], "meta": {"next_id": None, "next_page": None}})
        m_rev = re.fullmatch(r"/consents/([^/]+)/revoke", path)
        if m_rev is not None and method == "POST":
            consent_id = m_rev.group(1)
            return ok(
                {
                    "data": {
                        "id": consent_id,
                        "connection_id": "demo-connection-001",
                        "customer_id": "demo-customer-se-001",
                        "status": "revoked",
                        "scopes": ["account_information"],
                        "revoked_at": "2024-03-01T08:30:00Z",
                        "created_at": "2024-01-15T10:00:00Z",
                        "updated_at": "2024-03-01T08:30:00Z",
                    }
                }
            )
        m_co = re.fullmatch(r"/consents/([^/]+)", path)
        if m_co is not None and method == "GET":
            consent_id = m_co.group(1)
            return ok(
                {
                    "data": {
                        "id": consent_id,
                        "connection_id": "demo-connection-001",
                        "customer_id": params.get("customer_id")
                        or "demo-customer-se-001",
                        "status": "active",
                        "scopes": ["account_information"],
                        "created_at": "2024-01-15T10:00:00Z",
                        "updated_at": "2024-03-01T08:30:00Z",
                    }
                }
            )
        if method == "GET" and path == "/rates":
            return ok(
                {
                    "data": [{"currency_code": "EUR", "rate": 1.0}],
                    "meta": {"issued_on": "2025-01-01"},
                }
            )
        demo_provider = {
            "id": "prov_demo_gr_1",
            "code": "demo_bank_gr",
            "name": "Demo Bank Greece",
            "country_code": "GR",
            "bic_codes": ["DEMBGRAA"],
            "identification_codes": [],
            "status": "active",
            "mode": "ais",
            "regulated": True,
            "logo_url": "https://example.com/logo.png",
            "timezone": "Europe/Athens",
            "supported_iframe_embedding": True,
            "optional_interactivity": False,
            "customer_notified_on_sign_in": False,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
        }
        if method == "GET" and path == "/providers":
            return ok({"data": [demo_provider], "meta": {"next_id": None}})
        m = re.fullmatch(r"/providers/([^/]+)", path)
        if m is not None and method == "GET":
            p = dict(demo_provider)
            p["code"] = m.group(1)
            return ok({"data": p})
        if method == "GET" and path == "/payments":
            return ok({"data": [], "meta": {"next_id": None}})
        m_pr = re.fullmatch(r"/payments/([^/]+)/refresh", path)
        if m_pr is not None and method == "PUT":
            pid = m_pr.group(1)
            return ok(
                {
                    "data": {
                        "id": pid,
                        "customer_id": "demo-customer-se-001",
                        "status": "pending",
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-03-01T08:30:00Z",
                    }
                }
            )
        m_pay = re.fullmatch(r"/payments/([^/]+)", path)
        if m_pay is not None and method == "GET":
            pid = m_pay.group(1)
            return ok(
                {
                    "data": {
                        "id": pid,
                        "customer_id": params.get("customer_id")
                        or "demo-customer-se-001",
                        "status": "pending",
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z",
                    }
                }
            )
        if method == "POST" and path == "/payments/create":
            return ok(
                {
                    "data": {
                        "payment_id": "demo-payment-001",
                        "payment_url": "https://example.com/demo-payment",
                        "customer_id": (json_body or {})
                        .get("data", {})
                        .get("customer_id"),
                    }
                }
            )

        raise ApiError(
            501,
            f"Demo mode: unmocked Salt Edge request {method} {url}",
            {"method": method, "url": url},
        )

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
        if self.settings.demo_mode:
            demo_resp = self._demo_saltedge_response(
                method, url, json_body=json, params=params
            )
            return self._handle_response(demo_resp)
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
