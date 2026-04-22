"""HubSpot integration routes (prefix ``/v1/hubspot``).

Routes
------
Connect (OAuth)::

    GET  /connect/authorize          -> {authorization_url}  (auth required)
    GET  /connect/callback?code&state -> 302 redirect to frontend settings
    GET  /connect/connections        -> list linked portals   (auth required)
    POST /connect/disconnect         -> soft disconnect        (auth required)

Webhook (HubSpot → us)::

    POST /webhook                    -> batched events, signature-verified

Read endpoints (agents + frontend)::

    GET  /deals                      -> list deals mirrored for org
    GET  /deals/{hubspot_id}         -> read a deal w/ raw properties
    GET  /deals/{hubspot_id}/line-items -> deal's line items (PO candidates)
    GET  /quotes                     -> list quotes
    GET  /products                   -> list products
    GET  /companies                  -> list companies
    POST /sync/backfill              -> trigger full deal backfill

Note: we intentionally do NOT expose a write/upsert endpoint. HubSpot is
the system of record for CRM; the revrec pipeline is read-only from
that side. Writes back into HubSpot (e.g. amount enrichment) are
future work.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Query, Request
from pydantic import BaseModel

from app.db.models.identity import UserRole
from app.dependencies import (
    AuthUser,
    CurrentOrgId,
    HubspotCtrl,
    require_auth,
    require_role,
)

router = APIRouter()


class HubspotDisconnectRequest(BaseModel):
    hub_id: int


class HubspotBackfillRequest(BaseModel):
    hub_id: int


# ---------------------------------------------------------------------------
# OAuth connect
# ---------------------------------------------------------------------------


@router.get(
    "/connect/authorize",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def authorize(
    controller: HubspotCtrl,
    user: AuthUser,
    org_id: CurrentOrgId,
):
    """Return the HubSpot OAuth URL for this organization."""
    return await controller.start_oauth(
        user_id=str(user["sub"]), organization_id=org_id
    )


@router.get("/connect/callback")
async def oauth_callback(
    controller: HubspotCtrl,
    code: str = Query(..., min_length=1),
    state: str = Query(..., min_length=1),
):
    """OAuth redirect target. Browser-driven; no JSON body."""
    return await controller.oauth_callback(code=code, state=state)


@router.get(
    "/connect/connections",
    dependencies=[Depends(require_auth)],
)
async def list_connections(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
):
    return await controller.list_connections(organization_id=org_id)


@router.post(
    "/connect/disconnect",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def disconnect(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
    req: HubspotDisconnectRequest,
):
    return await controller.disconnect(
        organization_id=org_id, hub_id=req.hub_id
    )


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------


@router.post("/webhook", include_in_schema=False)
async def webhook(
    request: Request,
    controller: HubspotCtrl,
    x_hubspot_signature_v3: str | None = Header(default=None),
    x_hubspot_request_timestamp: str | None = Header(default=None),
):
    """HubSpot webhook receiver. Signature verified by the controller."""
    raw = await request.body()
    return await controller.handle_webhook(
        raw_body=raw,
        method=request.method,
        request_url=str(request.url),
        signature_header=x_hubspot_signature_v3,
        timestamp_header=x_hubspot_request_timestamp,
    )


# ---------------------------------------------------------------------------
# Read endpoints
# ---------------------------------------------------------------------------


@router.get("/deals", dependencies=[Depends(require_auth)])
async def list_deals(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return await controller.list_deals(
        organization_id=org_id, limit=limit, offset=offset
    )


@router.get("/deals/{hubspot_id}", dependencies=[Depends(require_auth)])
async def get_deal(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
    hubspot_id: str,
):
    return await controller.get_deal(
        organization_id=org_id, hubspot_id=hubspot_id
    )


@router.get(
    "/deals/{hubspot_id}/line-items",
    dependencies=[Depends(require_auth)],
)
async def list_line_items_for_deal(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
    hubspot_id: str,
):
    return await controller.list_line_items_for_deal(
        organization_id=org_id, hubspot_deal_id=hubspot_id
    )


@router.get("/quotes", dependencies=[Depends(require_auth)])
async def list_quotes(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return await controller.list_quotes(
        organization_id=org_id, limit=limit, offset=offset
    )


@router.get("/products", dependencies=[Depends(require_auth)])
async def list_products(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return await controller.list_products(
        organization_id=org_id, limit=limit, offset=offset
    )


@router.get("/companies", dependencies=[Depends(require_auth)])
async def list_companies(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return await controller.list_companies(
        organization_id=org_id, limit=limit, offset=offset
    )


@router.post(
    "/sync/backfill",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def trigger_backfill(
    controller: HubspotCtrl,
    org_id: CurrentOrgId,
    req: HubspotBackfillRequest,
):
    return await controller.trigger_backfill(
        organization_id=org_id, hub_id=req.hub_id
    )
