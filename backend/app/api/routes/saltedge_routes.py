from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Path, Query

from app.db.models.identity import UserRole
from app.dependencies import require_auth, require_role, SaltEdgeCtrl
from packages.saltedge.models.connections import (
    ConnectionsResponse,
    Connection,
    ConnectionActionResponse,
)
from packages.saltedge.models.consents import ConsentsResponse, ConsentResponse
from packages.saltedge.models.accounts import AccountsResponse
from packages.saltedge.models.rates import RatesResponse
from packages.saltedge.models.customers import (
    CustomersResponse,
    CustomerResponse,
    CreatedClientCustomerResponse,
    CreatedPartnerCustomerResponse,
    RemovedCustomerResponse,
)
from packages.saltedge.models.transactions import (
    TransactionsResponse,
    UpdateTransactionsRequestBody,
    UpdateTransactionsResponse,
)
from packages.saltedge.models.providers import ProviderResponse, ProvidersResponse
from packages.saltedge.models.payments import (
    CreatePaymentRequestBody,
    PaymentCreateResponse,
    PaymentResponse,
    PaymentsListResponse,
    UpdatePaymentResponse,
)

# 🔒 SECURE THE ENTIRE ROUTER
# By putting require_auth here, EVERY single route in this file
# now strictly requires a valid JWT Token.
router = APIRouter(dependencies=[Depends(require_auth)])


@router.get(
    "/accounts",
    response_model=AccountsResponse,
    summary="List customer accounts",
    description="Returns SaltEdge accounts filtered by customer or connection ID.",
)
async def list_accounts(
    ctl: SaltEdgeCtrl,
    customer_id: str = Query(None, description="SaltEdge customer ID"),
    connection_id: str = Query(None, description="SaltEdge connection ID"),
    per_page: Optional[int] = Query(None, description="Pagination limit"),
    from_id: Optional[str] = Query(None, description="Return results after this ID"),
):
    return await ctl.list_accounts(
        customer_id=customer_id,
        connection_id=connection_id,
        per_page=per_page,
        from_id=from_id,
    )


@router.get(
    "/connections",
    response_model=ConnectionsResponse,
    summary="List connections",
    description="Retrieve all SaltEdge connections associated with a specific customer. Supports pagination.",
)
async def list_connections(
    ctl: SaltEdgeCtrl,
    customer_id: str = Query(..., description="SaltEdge customer identifier"),
    per_page: Optional[int] = Query(None, description="Number of results per page"),
    from_id: Optional[str] = Query(
        None, description="Return results after this ID (for pagination)"
    ),
):
    return await ctl.list_connections(
        customer_id=customer_id, per_page=per_page, from_id=from_id
    )


@router.get(
    "/connections/{connection_id}",
    response_model=Connection,
    summary="Get connection details",
    description="Retrieve detailed information for a specific SaltEdge connection.",
)
async def get_connection(
    ctl: SaltEdgeCtrl,
    connection_id: str = Path(..., description="SaltEdge connection identifier"),
):
    return await ctl.get_connection(connection_id=connection_id)


@router.post(
    "/connections/connect",
    response_model=ConnectionActionResponse,
    summary="Create a new bank connection (Owner only)",
    description="Initiate a new SaltEdge connection (link a bank account). Requires OWNER role.",
    dependencies=[Depends(require_role(UserRole.OWNER))],
)
async def connect(
    ctl: SaltEdgeCtrl,
    payload: Dict[str, Any] = Body(
        ..., description="Connection creation payload (SaltEdge params)"
    ),
):
    return await ctl.connect(payload=payload)


@router.post(
    "/connections/{connection_id}/reconnect",
    response_model=ConnectionActionResponse,
    summary="Reconnect a connection",
    description="Reconnect an existing SaltEdge connection, typically required when authentication expires.",
)
async def reconnect(
    ctl: SaltEdgeCtrl,
    connection_id: str = Path(..., description="SaltEdge connection identifier"),
    payload: Optional[Dict[str, Any]] = Body(
        None, description="Optional reconnect params"
    ),
):
    return await ctl.reconnect(connection_id=connection_id, payload=payload)


@router.post(
    "/connections/{connection_id}/refresh",
    response_model=ConnectionActionResponse,
    summary="Refresh connection",
    description="Trigger data synchronization for an existing SaltEdge connection.",
)
async def refresh(
    ctl: SaltEdgeCtrl,
    connection_id: str = Path(..., description="SaltEdge connection identifier"),
):
    return await ctl.refresh(connection_id=connection_id)


@router.post(
    "/connections/{connection_id}/background_refresh",
    response_model=ConnectionActionResponse,
    summary="Background refresh connection",
    description="Start a background refresh for a SaltEdge connection.",
)
async def background_refresh(
    ctl: SaltEdgeCtrl,
    connection_id: str = Path(..., description="SaltEdge connection identifier"),
):
    return await ctl.background_refresh(connection_id=connection_id)


@router.get(
    "/consents",
    response_model=ConsentsResponse,
    summary="List consents",
    description="Retrieve consents filtered by `customer_id` and/or `connection_id`.",
)
async def list_consents(
    ctl: SaltEdgeCtrl,
    customer_id: Optional[str] = Query(
        None, description="SaltEdge customer identifier to filter consents"
    ),
    connection_id: str = Query(
        None, description="SaltEdge connection identifier to filter consents"
    ),
    per_page: Optional[int] = Query(
        None, description="Number of results per page (pagination limit)"
    ),
    from_id: Optional[str] = Query(
        None, description="Return results after this ID (cursor for pagination)"
    ),
):
    return await ctl.list_consents(
        customer_id=customer_id,
        connection_id=connection_id,
        per_page=per_page,
        from_id=from_id,
    )


@router.get(
    "/consents/{consent_id}",
    response_model=ConsentResponse,
    summary="Get consent details",
    description="Retrieve a specific consent by ID. You must provide either `connection_id` or `customer_id`.",
)
async def get_consent(
    ctl: SaltEdgeCtrl,
    consent_id: str = Path(..., description="SaltEdge consent identifier"),
    connection_id: str = Query(None, description="SaltEdge connection identifier"),
    customer_id: Optional[str] = Query(
        None, description="SaltEdge customer identifier"
    ),
):
    if not connection_id and not customer_id:
        raise HTTPException(
            status_code=422, detail="Provide connection_id or customer_id"
        )
    return await ctl.get_consent(
        consent_id=consent_id, connection_id=connection_id, customer_id=customer_id
    )


@router.post(
    "/consents/{consent_id}/revoke",
    response_model=ConsentResponse,
    summary="Revoke a consent",
    description="Revoke (invalidate) an existing consent by its identifier.",
)
async def revoke_consent(
    ctl: SaltEdgeCtrl,
    consent_id: str = Path(..., description="SaltEdge consent identifier"),
):
    return await ctl.revoke_consent(consent_id=consent_id)


@router.get(
    "/rates",
    response_model=RatesResponse,
    summary="Get exchange rates",
    description="Retrieve exchange rates. Optionally specify a historical `date` in `YYYY-MM-DD` format.",
)
async def get_rates(
    ctl: SaltEdgeCtrl,
    date: Optional[str] = Query(
        None, description="Historical date in YYYY-MM-DD format (optional)"
    ),
):
    return await ctl.get_rates(date=date)


# ---------- Customers ----------
@router.post(
    "/customers",
    response_model=CreatedClientCustomerResponse | CreatedPartnerCustomerResponse,
    summary="Create a new customer",
)
async def create_customer(
    ctl: SaltEdgeCtrl,
    payload: dict = Body(
        ..., description="Customer creation payload (SaltEdge format)"
    ),
):
    return await ctl.create_customer(payload=payload)


@router.get(
    "/customers",
    response_model=CustomersResponse,
    summary="List customers",
)
async def list_customers(
    ctl: SaltEdgeCtrl,
    per_page: Optional[int] = Query(None, description="Number of results per page"),
    from_id: Optional[str] = Query(None, description="Return results after this ID"),
):
    return await ctl.list_customers(per_page=per_page, from_id=from_id)


@router.get(
    "/customers/{customer_id}",
    response_model=CustomerResponse,
    summary="Get customer details",
)
async def get_customer(
    ctl: SaltEdgeCtrl,
    customer_id: str = Path(..., description="SaltEdge customer identifier"),
):
    return await ctl.get_customer(customer_id=customer_id)


@router.delete(
    "/customers/{customer_id}",
    response_model=RemovedCustomerResponse,
    summary="Delete customer",
)
async def delete_customer(
    ctl: SaltEdgeCtrl,
    customer_id: str = Path(..., description="SaltEdge customer identifier"),
):
    return await ctl.delete_customer(customer_id=customer_id)


# ---------- Transactions ----------
@router.get(
    "/transactions",
    response_model=TransactionsResponse,
    summary="List transactions",
)
async def list_transactions(
    ctl: SaltEdgeCtrl,
    connection_id: str = Query(..., description="SaltEdge connection identifier"),
    account_id: Optional[str] = Query(
        None, description="Filter by specific account ID"
    ),
    pending: Optional[bool] = Query(
        None, description="Filter only pending transactions"
    ),
    duplicated: Optional[bool] = Query(
        None, description="Filter duplicated transactions"
    ),
    from_id: Optional[str] = Query(None, description="Return results after this ID"),
    per_page: Optional[int] = Query(None, description="Number of results per page"),
):
    return await ctl.list_transactions(
        connection_id=connection_id,
        account_id=account_id,
        pending=pending,
        duplicated=duplicated,
        from_id=from_id,
        per_page=per_page,
    )


@router.put(
    "/transactions",
    response_model=UpdateTransactionsResponse,
    summary="Update transactions",
)
async def update_transactions(
    ctl: SaltEdgeCtrl,
    payload: UpdateTransactionsRequestBody = Body(...),
):
    return await ctl.update_transactions(payload=payload)


# ---------- Providers ----------
@router.get(
    "/providers",
    response_model=ProvidersResponse,
    summary="List providers",
)
async def list_providers(
    ctl: SaltEdgeCtrl,
    include_sandboxes: Optional[bool] = Query(None),
    country_code: Optional[str] = Query(None),
    include_ais_fields: Optional[bool] = Query(None),
    include_pis_fields: Optional[bool] = Query(None),
    include_credentials_fields: Optional[bool] = Query(None),
    exclude_inactive: Optional[bool] = Query(None),
    key_owner: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
    from_id: Optional[str] = Query(None),
    per_page: Optional[int] = Query(None),
):
    return await ctl.list_providers(
        include_sandboxes=include_sandboxes,
        country_code=country_code,
        include_ais_fields=include_ais_fields,
        include_pis_fields=include_pis_fields,
        include_credentials_fields=include_credentials_fields,
        exclude_inactive=exclude_inactive,
        key_owner=key_owner,
        mode=mode,
        from_id=from_id,
        per_page=per_page,
    )


@router.get(
    "/providers/{provider_code}",
    response_model=ProviderResponse,
    summary="Get provider details",
)
async def show_provider(
    ctl: SaltEdgeCtrl,
    provider_code: str = Path(...),
    include_ais_fields: Optional[bool] = Query(None),
    include_pis_fields: Optional[bool] = Query(None),
    include_credentials_fields: Optional[bool] = Query(None),
):
    return await ctl.show_provider(
        provider_code=provider_code,
        include_ais_fields=include_ais_fields,
        include_pis_fields=include_pis_fields,
        include_credentials_fields=include_credentials_fields,
    )


# ---------- Payments ----------
@router.post(
    "/payments/create",
    response_model=PaymentCreateResponse,
    summary="Create payment",
)
async def create_payment(
    ctl: SaltEdgeCtrl,
    payload: CreatePaymentRequestBody = Body(...),
):
    return await ctl.create_payment(payload=payload)


@router.get(
    "/payments",
    response_model=PaymentsListResponse,
    summary="List payments",
)
async def list_payments(
    ctl: SaltEdgeCtrl,
    customer_id: str = Query(...),
    from_id: Optional[str] = Query(None),
    per_page: Optional[int] = Query(None),
):
    return await ctl.list_payments(
        customer_id=customer_id, from_id=from_id, per_page=per_page
    )


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="Get payment details",
)
async def show_payment(
    ctl: SaltEdgeCtrl,
    payment_id: str = Path(...),
):
    return await ctl.show_payment(payment_id=payment_id)


@router.put(
    "/payments/{payment_id}/refresh",
    response_model=UpdatePaymentResponse,
    summary="Refresh payment",
)
async def refresh_payment(
    ctl: SaltEdgeCtrl,
    payment_id: str = Path(...),
):
    return await ctl.refresh_payment(payment_id=payment_id)
