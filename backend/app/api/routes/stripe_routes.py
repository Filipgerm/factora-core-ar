"""Stripe mirror and webhook routes (version prefix applied in ``main``)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request

from app.db.models.identity import UserRole
from app.dependencies import (
    require_auth,
    require_role,
    StripeCtrl,
    StripeWebhookCtrl,
)

router = APIRouter()


@router.post(
    "/webhook",
    response_model_exclude_none=True,
)
async def stripe_webhook(request: Request, controller: StripeWebhookCtrl):
    """Ingest Stripe webhooks (raw body + signature verification)."""
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    return await controller.ingest_webhook(payload, sig)


# --- Authenticated sync + mirror reads ------------------------------------


@router.post(
    "/sync/balance-transactions",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_balance_transactions(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_balance_transactions(
        page_size=page_size, max_pages=max_pages
    )


@router.post(
    "/sync/payouts",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_payouts(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_payouts(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/balance-snapshot",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_balance_snapshot(controller: StripeCtrl):
    return await controller.snapshot_balance()


@router.post(
    "/sync/customers",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_customers(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_customers(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/subscriptions",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_subscriptions(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_subscriptions(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/invoices",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_invoices(
    controller: StripeCtrl,
    page_size: int = Query(50, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_invoices(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/credit-notes",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_credit_notes(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_credit_notes(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/products",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_products(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_products(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/prices",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_prices(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_prices(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/payment-intents",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_payment_intents(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_payment_intents(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/refunds",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_refunds(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_refunds(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/disputes",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_disputes(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_disputes(page_size=page_size, max_pages=max_pages)


@router.post(
    "/sync/tax-rates",
    dependencies=[
        Depends(require_auth),
        Depends(require_role(UserRole.OWNER, UserRole.ADMIN)),
    ],
)
async def sync_tax_rates(
    controller: StripeCtrl,
    page_size: int = Query(100, ge=1, le=100),
    max_pages: int = Query(50, ge=1, le=200),
):
    return await controller.sync_tax_rates(page_size=page_size, max_pages=max_pages)


@router.get(
    "/mirror/balance-transactions",
    dependencies=[Depends(require_auth)],
)
async def list_balance_transactions(
    controller: StripeCtrl,
    limit: int = Query(100, ge=1, le=500),
):
    return await controller.list_balance_transactions(limit=limit)


@router.get(
    "/mirror/invoices",
    dependencies=[Depends(require_auth)],
)
async def list_invoices(
    controller: StripeCtrl,
    limit: int = Query(100, ge=1, le=500),
):
    return await controller.list_invoices(limit=limit)


@router.get(
    "/mirror/customers",
    dependencies=[Depends(require_auth)],
)
async def list_customers(
    controller: StripeCtrl,
    limit: int = Query(100, ge=1, le=500),
):
    return await controller.list_customers(limit=limit)
