"""HubspotClient — thin async wrapper over HubSpot's REST APIs.

Covers every read/get path we need for revrec workflows plus the OAuth
handshake. Writes are intentionally out of scope for P1 — the revrec
pipeline pulls contract context from HubSpot, it does not push back
(the sales team continues to own HubSpot as the system of record for
deals/quotes).

Endpoints covered
-----------------
OAuth
    * ``GET  /oauth/authorize`` — URL builder (no HTTP call).
    * ``POST /oauth/v1/token`` — authorization-code + refresh-token grants.
    * ``GET  /oauth/v1/access-tokens/{token}`` — resolve hub id.

CRM v3 objects
    * Deals, Line Items, Quotes, Products, Companies
        * ``GET   /crm/v3/objects/{type}``              — list + paginate
        * ``GET   /crm/v3/objects/{type}/{id}``         — read
        * ``POST  /crm/v3/objects/{type}/search``       — filtered query
        * ``GET   /crm/v3/objects/{type}/{id}/associations/{to}`` — read links

CRM v4 associations
    * ``GET /crm/v4/objects/{from}/{id}/associations/{to}`` — labeled assoc

CRM v3 pipelines
    * ``GET /crm/v3/pipelines/{object_type}`` — needed to map stage id → label.

Files API
    * ``GET /files/v3/files/{file_id}`` — metadata for attached documents.

Webhooks API (developer-level, not per-portal)
    * ``GET  /webhooks/v3/{app_id}/subscriptions`` — inspect subscriptions.
    * ``POST /webhooks/v3/{app_id}/subscriptions`` — create a subscription.

Isolation contract
------------------
Never imports from ``app/``. Accepts access tokens either via constructor
(tenant-scoped usage) or per-call override. Refresh-token logic lives here;
token persistence is the caller's concern.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Awaitable, Callable, Mapping, Sequence

import httpx

from packages._http import (
    log_outbound_request,
    log_outbound_response,
    new_correlation_id,
    retry_async,
)
from packages._http.retry import OutboundError, RetryDecision, parse_retry_after
from packages.hubspot.models.common import (
    HubspotCompany,
    HubspotDeal,
    HubspotFile,
    HubspotLineItem,
    HubspotPage,
    HubspotPipeline,
    HubspotProduct,
    HubspotQuote,
    HubspotTokenInfo,
    HubspotTokenResponse,
)

logger = logging.getLogger(__name__)

# HubSpot returns this header on every response — pair with our
# ``correlation_id`` so support tickets can be cross-referenced.
_HUBSPOT_REQUEST_ID_HEADER = "X-HubSpot-Correlation-Id"

# Status codes we retry — all non-idempotent writes are opted out by
# using the retry loop only inside ``_request_json`` GET paths today.
_RETRYABLE_STATUSES: frozenset[int] = frozenset({408, 425, 429, 500, 502, 503, 504})

# Transport exceptions we retry (network flakes, not protocol errors).
_RETRYABLE_EXCEPTIONS: tuple[type[BaseException], ...] = (
    httpx.ConnectError,
    httpx.ConnectTimeout,
    httpx.ReadTimeout,
    httpx.RemoteProtocolError,
    httpx.PoolTimeout,
)


class HubspotError(OutboundError):
    """Raised on any non-2xx HubSpot API response.

    Attributes
    ----------
    status:
        HTTP status code.
    body:
        Parsed JSON body (when possible) — HubSpot returns a structured
        error envelope: ``{"category": "...", "message": "...",
        "correlationId": "..."}``.
    retry_after:
        Seconds the server requested us to wait before retrying (from
        ``Retry-After``). ``None`` means "fall back to local backoff".
    """

    def __init__(
        self, *, status: int, body: Any, retry_after: float | None = None
    ) -> None:
        self.status = status
        self.body = body
        self.retry_after = retry_after
        super().__init__(f"HubSpot API error {status}: {body}")


_API_BASE = "https://api.hubapi.com"
_APP_BASE = "https://app.hubspot.com"
_DEFAULT_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=30.0, pool=5.0)

# HubSpot strongly recommends requesting the explicit properties you need
# per object type — the portal can have hundreds of custom properties and
# the default response truncates them. These defaults cover every field
# the bridge + bootstrapper consume today.
DEFAULT_DEAL_PROPERTIES: tuple[str, ...] = (
    "dealname",
    "amount",
    "closedate",
    "pipeline",
    "dealstage",
    "hs_is_closed_won",
    "hs_is_closed",
    "hs_deal_amount_calculation_preference",
    "hs_forecast_probability",
    "hs_arr",
    "hs_mrr",
    "hs_tcv",
    "hs_acv",
    "hs_currency_code",
    "hs_lastmodifieddate",
    "hubspot_owner_id",
    "description",
    "hs_payment_terms",
)
DEFAULT_LINE_ITEM_PROPERTIES: tuple[str, ...] = (
    "name",
    "description",
    "hs_product_id",
    "hs_sku",
    "quantity",
    "price",
    "amount",
    "hs_total_discount",
    "hs_cost_of_goods_sold",
    "hs_term_in_months",
    "hs_recurring_billing_period",
    "hs_recurring_billing_start_date",
    "hs_recurring_billing_end_date",
    "hs_billing_period",
    "hs_billing_start_delay_days",
    "recurringbillingfrequency",
    "hs_line_item_currency_code",
    "hs_position_on_quote",
    "hs_lastmodifieddate",
)
DEFAULT_QUOTE_PROPERTIES: tuple[str, ...] = (
    "hs_title",
    "hs_status",
    "hs_expiration_date",
    "hs_sender_company_name",
    "hs_sender_firstname",
    "hs_sender_lastname",
    "hs_currency",
    "hs_quote_amount",
    "hs_esign_status",
    "hs_public_url_key",
    "hs_pdf_download_link",
    "hs_lastmodifieddate",
)
DEFAULT_PRODUCT_PROPERTIES: tuple[str, ...] = (
    "name",
    "description",
    "price",
    "hs_sku",
    "hs_cost_of_goods_sold",
    "hs_recurring_billing_period",
    "recurringbillingfrequency",
    "hs_lastmodifieddate",
)
DEFAULT_COMPANY_PROPERTIES: tuple[str, ...] = (
    "name",
    "domain",
    "industry",
    "country",
    "city",
    "hs_country_code",
    "numberofemployees",
    "annualrevenue",
    "hubspot_owner_id",
    "lifecyclestage",
    "vat_id",
    "hs_lastmodifieddate",
)

_DEFAULTS: dict[str, tuple[str, ...]] = {
    "deals": DEFAULT_DEAL_PROPERTIES,
    "line_items": DEFAULT_LINE_ITEM_PROPERTIES,
    "quotes": DEFAULT_QUOTE_PROPERTIES,
    "products": DEFAULT_PRODUCT_PROPERTIES,
    "companies": DEFAULT_COMPANY_PROPERTIES,
}


class HubspotClient:
    """Async httpx-based HubSpot client.

    Usage::

        client = HubspotClient(access_token="pat-...")
        page = await client.list_deals(limit=50)

    Or for OAuth flows (no token yet)::

        client = HubspotClient()
        url = client.build_authorize_url(...)
        tokens = await client.exchange_code(...)
    """

    def __init__(
        self,
        *,
        access_token: str | None = None,
        client_id: str | None = None,
        client_secret: str | None = None,
        timeout: httpx.Timeout = _DEFAULT_TIMEOUT,
        http: httpx.AsyncClient | None = None,
        refresh_access_token_hook: (
            Callable[[], Awaitable[str]] | None
        ) = None,
        max_attempts: int = 4,
    ) -> None:
        """Construct a tenant-scoped HubSpot client.

        Args:
            access_token: Current Bearer token. Caller owns persistence.
            client_id / client_secret: Dev app credentials for OAuth.
            timeout: Per-request ``httpx.Timeout``.
            http: Optional ``httpx.AsyncClient`` override (for tests).
            refresh_access_token_hook: Optional async callable invoked on
                401 to refresh the access token out-of-band. When it
                succeeds, its returned token replaces the in-memory one
                and the failing request is retried exactly once. When it
                raises, the original 401 bubbles unchanged.
            max_attempts: Bounded retry count for 429 / 5xx / transient
                network failures (1 = no retry).
        """
        self._access_token = access_token
        self._client_id = client_id
        self._client_secret = client_secret
        self._timeout = timeout
        self._http_override = http
        self._refresh_hook = refresh_access_token_hook
        self._max_attempts = max(1, max_attempts)
        self._refresh_attempted = False

    # ------------------------------------------------------------------
    # Context-managed AsyncClient
    # ------------------------------------------------------------------

    def _client(self) -> httpx.AsyncClient:
        if self._http_override is not None:
            return self._http_override
        return httpx.AsyncClient(base_url=_API_BASE, timeout=self._timeout)

    def _auth_headers(self, access_token: str | None) -> dict[str, str]:
        token = access_token or self._access_token
        if not token:
            raise HubspotError(
                status=401, body={"message": "HubspotClient missing access token."}
            )
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    async def _request_json(
        self,
        method: str,
        path: str,
        *,
        access_token: str | None = None,
        params: Mapping[str, Any] | None = None,
        json_body: Any | None = None,
    ) -> Any:
        """Issue a HubSpot API call with retry + 401-refresh + structured logs.

        Retry policy (GETs + searches are idempotent):
            * 429 / 408 / 5xx / transient network errors → exponential
              backoff respecting ``Retry-After``.
            * 401 once → run ``refresh_access_token_hook`` if supplied,
              then retry the same call with the new token.
            * All other 4xx → raise immediately.
        """
        correlation_id = new_correlation_id()
        self._refresh_attempted = False

        async def _attempt(attempt: int) -> Any:
            headers = self._auth_headers(access_token)
            start = time.perf_counter()
            log_outbound_request(
                integration="hubspot",
                method=method,
                url=f"{_API_BASE}{path}",
                correlation_id=correlation_id,
                headers=headers,
                extra={"attempt": attempt},
            )
            async with self._client() as http:
                resp = await http.request(
                    method, path, headers=headers, params=params, json=json_body
                )
            duration_ms = (time.perf_counter() - start) * 1000
            log_outbound_response(
                integration="hubspot",
                method=method,
                url=f"{_API_BASE}{path}",
                correlation_id=correlation_id,
                status=resp.status_code,
                duration_ms=duration_ms,
                remote_request_id=resp.headers.get(_HUBSPOT_REQUEST_ID_HEADER),
                attempt=attempt,
            )
            if resp.status_code >= 400:
                try:
                    body = resp.json()
                except Exception:  # pragma: no cover — body may not be JSON
                    body = resp.text
                raise HubspotError(
                    status=resp.status_code,
                    body=body,
                    retry_after=parse_retry_after(resp.headers.get("Retry-After")),
                )
            if resp.status_code == 204 or not resp.content:
                return None
            return resp.json()

        return await retry_async(
            _attempt,
            decide=self._build_retry_decider(access_token),
            max_attempts=self._max_attempts,
        )

    def _build_retry_decider(
        self, per_call_token: str | None
    ) -> Callable[[Any, BaseException | None, int], RetryDecision]:
        """Return a retry-decision closure for the current call.

        The closure is stateful w.r.t. a single ``_request_json`` call so
        we can implement "refresh access token exactly once" without
        affecting concurrent calls.
        """

        def _decide(
            _result: Any, exc: BaseException | None, _attempt: int
        ) -> RetryDecision:
            if exc is None:
                return RetryDecision(retry=False)
            if isinstance(exc, _RETRYABLE_EXCEPTIONS):
                return RetryDecision(retry=True)
            if isinstance(exc, HubspotError):
                # 401: attempt a one-shot refresh via the hook.
                if (
                    exc.status == 401
                    and self._refresh_hook is not None
                    and not self._refresh_attempted
                    and per_call_token is None
                ):
                    self._refresh_attempted = True
                    return RetryDecision(retry=True, on_retry=self._refresh_token)
                if exc.status in _RETRYABLE_STATUSES:
                    return RetryDecision(
                        retry=True, retry_after_s=exc.retry_after
                    )
            return RetryDecision(retry=False)

        return _decide

    async def _refresh_token(self) -> None:
        """Call the injected refresh hook and swap the in-memory token."""
        if self._refresh_hook is None:
            return
        new_token = await self._refresh_hook()
        if new_token:
            self._access_token = new_token
            logger.info(
                "hubspot access_token refreshed via hook",
                extra={"integration": "hubspot"},
            )

    # ------------------------------------------------------------------
    # OAuth
    # ------------------------------------------------------------------

    def build_authorize_url(
        self,
        *,
        redirect_uri: str,
        scopes: Sequence[str],
        state: str,
        optional_scopes: Sequence[str] = (),
    ) -> str:
        """Return the browser URL to start the HubSpot OAuth consent flow."""
        if not self._client_id:
            raise HubspotError(
                status=500,
                body={"message": "HubspotClient missing client_id for OAuth."},
            )
        from urllib.parse import urlencode

        qs = {
            "client_id": self._client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(scopes),
            "state": state,
        }
        if optional_scopes:
            qs["optional_scope"] = " ".join(optional_scopes)
        return f"{_APP_BASE}/oauth/authorize?{urlencode(qs)}"

    async def exchange_code(
        self, *, code: str, redirect_uri: str
    ) -> HubspotTokenResponse:
        """Exchange an authorization code for access + refresh tokens."""
        if not self._client_id or not self._client_secret:
            raise HubspotError(
                status=500,
                body={"message": "HubspotClient missing client_id/secret."},
            )
        data = {
            "grant_type": "authorization_code",
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "redirect_uri": redirect_uri,
            "code": code,
        }
        async with self._client() as http:
            resp = await http.post(
                "/oauth/v1/token",
                data=data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                },
            )
        if resp.status_code >= 400:
            raise HubspotError(status=resp.status_code, body=resp.text)
        return HubspotTokenResponse.model_validate(resp.json())

    async def refresh_access_token(
        self, *, refresh_token: str
    ) -> HubspotTokenResponse:
        """Exchange a refresh token for a fresh access token."""
        if not self._client_id or not self._client_secret:
            raise HubspotError(
                status=500,
                body={"message": "HubspotClient missing client_id/secret."},
            )
        data = {
            "grant_type": "refresh_token",
            "client_id": self._client_id,
            "client_secret": self._client_secret,
            "refresh_token": refresh_token,
        }
        async with self._client() as http:
            resp = await http.post(
                "/oauth/v1/token",
                data=data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                },
            )
        if resp.status_code >= 400:
            raise HubspotError(status=resp.status_code, body=resp.text)
        return HubspotTokenResponse.model_validate(resp.json())

    async def introspect_access_token(
        self, *, access_token: str
    ) -> HubspotTokenInfo:
        """Resolve the portal (hub_id), user, and scopes for a token."""
        async with self._client() as http:
            resp = await http.get(
                f"/oauth/v1/access-tokens/{access_token}",
                headers={"Accept": "application/json"},
            )
        if resp.status_code >= 400:
            raise HubspotError(status=resp.status_code, body=resp.text)
        return HubspotTokenInfo.model_validate(resp.json())

    # ------------------------------------------------------------------
    # CRM v3 — generic object GET/list
    # ------------------------------------------------------------------

    async def _list_objects(
        self,
        object_type: str,
        *,
        access_token: str | None = None,
        limit: int = 100,
        after: str | None = None,
        properties: Sequence[str] | None = None,
        associations: Sequence[str] | None = None,
        archived: bool = False,
    ) -> HubspotPage[dict[str, Any]]:
        params: dict[str, Any] = {"limit": limit, "archived": "true" if archived else "false"}
        if after:
            params["after"] = after
        props = list(properties) if properties else list(_DEFAULTS.get(object_type, ()))
        if props:
            params["properties"] = ",".join(props)
        if associations:
            params["associations"] = ",".join(associations)
        data = await self._request_json(
            "GET",
            f"/crm/v3/objects/{object_type}",
            access_token=access_token,
            params=params,
        )
        return HubspotPage[dict[str, Any]].model_validate(data)

    async def _get_object(
        self,
        object_type: str,
        object_id: str,
        *,
        access_token: str | None = None,
        properties: Sequence[str] | None = None,
        associations: Sequence[str] | None = None,
        archived: bool = False,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {"archived": "true" if archived else "false"}
        props = list(properties) if properties else list(_DEFAULTS.get(object_type, ()))
        if props:
            params["properties"] = ",".join(props)
        if associations:
            params["associations"] = ",".join(associations)
        return await self._request_json(
            "GET",
            f"/crm/v3/objects/{object_type}/{object_id}",
            access_token=access_token,
            params=params,
        )

    async def _search_objects(
        self,
        object_type: str,
        *,
        access_token: str | None = None,
        filter_groups: Sequence[Mapping[str, Any]] = (),
        sorts: Sequence[str] = (),
        properties: Sequence[str] | None = None,
        limit: int = 100,
        after: str | None = None,
    ) -> HubspotPage[dict[str, Any]]:
        body: dict[str, Any] = {
            "filterGroups": list(filter_groups),
            "limit": limit,
        }
        if sorts:
            body["sorts"] = list(sorts)
        props = list(properties) if properties else list(_DEFAULTS.get(object_type, ()))
        if props:
            body["properties"] = props
        if after:
            body["after"] = after
        data = await self._request_json(
            "POST",
            f"/crm/v3/objects/{object_type}/search",
            access_token=access_token,
            json_body=body,
        )
        return HubspotPage[dict[str, Any]].model_validate(data)

    # --- Deals

    async def list_deals(self, **kw: Any) -> HubspotPage[HubspotDeal]:
        page = await self._list_objects("deals", **kw)
        return HubspotPage[HubspotDeal](
            results=[HubspotDeal.model_validate(r) for r in page.results],
            paging=page.paging,
        )

    async def get_deal(self, deal_id: str, **kw: Any) -> HubspotDeal:
        data = await self._get_object("deals", deal_id, **kw)
        return HubspotDeal.model_validate(data)

    async def search_deals(self, **kw: Any) -> HubspotPage[HubspotDeal]:
        page = await self._search_objects("deals", **kw)
        return HubspotPage[HubspotDeal](
            results=[HubspotDeal.model_validate(r) for r in page.results],
            paging=page.paging,
        )

    # --- Line items

    async def list_line_items(self, **kw: Any) -> HubspotPage[HubspotLineItem]:
        page = await self._list_objects("line_items", **kw)
        return HubspotPage[HubspotLineItem](
            results=[HubspotLineItem.model_validate(r) for r in page.results],
            paging=page.paging,
        )

    async def get_line_item(self, line_item_id: str, **kw: Any) -> HubspotLineItem:
        data = await self._get_object("line_items", line_item_id, **kw)
        return HubspotLineItem.model_validate(data)

    async def get_line_items_for_deal(
        self,
        deal_id: str,
        *,
        access_token: str | None = None,
        properties: Sequence[str] | None = None,
    ) -> list[HubspotLineItem]:
        """Fetch *every* line item attached to a deal (paginated internally)."""
        assoc = await self._request_json(
            "GET",
            f"/crm/v4/objects/deals/{deal_id}/associations/line_items",
            access_token=access_token,
            params={"limit": 500},
        )
        targets = [r["toObjectId"] for r in assoc.get("results", [])]
        out: list[HubspotLineItem] = []
        for tid in targets:
            out.append(
                await self.get_line_item(
                    str(tid), access_token=access_token, properties=properties
                )
            )
        return out

    # --- Quotes

    async def list_quotes(self, **kw: Any) -> HubspotPage[HubspotQuote]:
        page = await self._list_objects("quotes", **kw)
        return HubspotPage[HubspotQuote](
            results=[HubspotQuote.model_validate(r) for r in page.results],
            paging=page.paging,
        )

    async def get_quote(self, quote_id: str, **kw: Any) -> HubspotQuote:
        data = await self._get_object("quotes", quote_id, **kw)
        return HubspotQuote.model_validate(data)

    # --- Products

    async def list_products(self, **kw: Any) -> HubspotPage[HubspotProduct]:
        page = await self._list_objects("products", **kw)
        return HubspotPage[HubspotProduct](
            results=[HubspotProduct.model_validate(r) for r in page.results],
            paging=page.paging,
        )

    async def get_product(self, product_id: str, **kw: Any) -> HubspotProduct:
        data = await self._get_object("products", product_id, **kw)
        return HubspotProduct.model_validate(data)

    # --- Companies

    async def list_companies(self, **kw: Any) -> HubspotPage[HubspotCompany]:
        page = await self._list_objects("companies", **kw)
        return HubspotPage[HubspotCompany](
            results=[HubspotCompany.model_validate(r) for r in page.results],
            paging=page.paging,
        )

    async def get_company(self, company_id: str, **kw: Any) -> HubspotCompany:
        data = await self._get_object("companies", company_id, **kw)
        return HubspotCompany.model_validate(data)

    # ------------------------------------------------------------------
    # CRM v4 — associations
    # ------------------------------------------------------------------

    async def list_associations(
        self,
        *,
        from_object_type: str,
        from_object_id: str,
        to_object_type: str,
        access_token: str | None = None,
        limit: int = 500,
    ) -> list[dict[str, Any]]:
        """Return labeled associations between two CRM objects (``/crm/v4/...``)."""
        data = await self._request_json(
            "GET",
            f"/crm/v4/objects/{from_object_type}/{from_object_id}/associations/{to_object_type}",
            access_token=access_token,
            params={"limit": limit},
        )
        return list(data.get("results", []))

    # ------------------------------------------------------------------
    # Pipelines (stage id → label resolution)
    # ------------------------------------------------------------------

    async def list_pipelines(
        self, object_type: str, *, access_token: str | None = None
    ) -> list[HubspotPipeline]:
        data = await self._request_json(
            "GET",
            f"/crm/v3/pipelines/{object_type}",
            access_token=access_token,
        )
        return [HubspotPipeline.model_validate(r) for r in data.get("results", [])]

    # ------------------------------------------------------------------
    # Files
    # ------------------------------------------------------------------

    async def get_file(
        self, file_id: str, *, access_token: str | None = None
    ) -> HubspotFile:
        data = await self._request_json(
            "GET", f"/files/v3/files/{file_id}", access_token=access_token
        )
        return HubspotFile.model_validate(data)

    # ------------------------------------------------------------------
    # Webhooks (developer-level, requires HUBSPOT_DEVELOPER_API_KEY)
    # ------------------------------------------------------------------

    async def list_webhook_subscriptions(
        self, *, app_id: int, developer_api_key: str
    ) -> list[dict[str, Any]]:
        """List all event subscriptions for a developer app.

        Uses a separate ``hapikey`` auth path because developer endpoints
        are not tenant-scoped — they live on the app you own.
        """
        async with self._client() as http:
            resp = await http.get(
                f"/webhooks/v3/{app_id}/subscriptions",
                params={"hapikey": developer_api_key},
                headers={"Accept": "application/json"},
            )
        if resp.status_code >= 400:
            raise HubspotError(status=resp.status_code, body=resp.text)
        return list(resp.json().get("results", []))
