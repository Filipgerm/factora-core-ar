from __future__ import annotations
from fastapi import APIRouter, Depends, Body, HTTPException, Path, Query
from typing import Optional, Dict, Any

from app.config import Settings as AppSettings
from app.services.saltedge_service import SaltEdgeService
from app.controllers.saltedge_controller import SaltEdgeController
from app.db.postgres import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession
from packages.saltedge.models.connections import ConnectionsResponse, Connection
from packages.saltedge.models.consents import ConsentsResponse, ConsentResponse
from packages.saltedge.models.accounts import (
    AccountsResponse,
)
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

# router = APIRouter(prefix="/saltedge", tags=["saltedge"])
router = APIRouter()


def get_controller() -> SaltEdgeController:
    app_settings = AppSettings()
    service = SaltEdgeService(app_settings)
    return SaltEdgeController(service)


@router.get(
    "/accounts",
    response_model=AccountsResponse,
    summary="List customer accounts",
    description="Returns SaltEdge accounts filtered by customer or connection ID.",
)
async def list_accounts(
    customer_id: str = Query(None, description="SaltEdge customer ID"),
    connection_id: str = Query(None, description="SaltEdge connection ID"),
    per_page: Optional[int] = Query(None, description="Pagination limit"),
    from_id: Optional[str] = Query(None, description="Return results after this ID"),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.list_accounts(
        db,
        customer_id=customer_id,
        connection_id=connection_id,
        per_page=per_page,
        from_id=from_id,
    )


@router.get(
    "/connections",
    response_model=ConnectionsResponse,
    summary="List connections",
    description="Retrieve all SaltEdge connections associated with a specific customer. "
    "Supports pagination via `per_page` and `from_id`.",
)
async def list_connections(
    customer_id: str = Query(..., description="SaltEdge customer identifier"),
    per_page: Optional[int] = Query(None, description="Number of results per page"),
    from_id: Optional[str] = Query(
        None, description="Return results after this ID (for pagination)"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.list_connections(
        db, customer_id=customer_id, per_page=per_page, from_id=from_id
    )


@router.get(
    "/connections/{connection_id}",
    response_model=Connection,
    summary="Get connection details",
    description="Retrieve detailed information for a specific SaltEdge connection.",
)
async def get_connection(
    connection_id: str = Path(..., description="SaltEdge connection identifier"),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.get_connection(db, connection_id=connection_id)


@router.post(
    "/connections/connect",
    summary="Create a new connection",
    description="Initiate a new SaltEdge connection (link a bank account) "
    "using connection parameters provided in the request body.",
)
def connect(
    payload: Dict[str, Any] = Body(
        ..., description="Connection creation payload (SaltEdge params)"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.connect(payload=payload)


@router.post(
    "/connections/{connection_id}/reconnect",
    summary="Reconnect a connection",
    description="Reconnect an existing SaltEdge connection, typically required when authentication expires.",
)
def reconnect(
    connection_id: str = Path(..., description="SaltEdge connection identifier"),
    payload: Optional[Dict[str, Any]] = Body(
        None, description="Optional reconnect params"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.reconnect(connection_id=connection_id, payload=payload)


@router.post(
    "/connections/{connection_id}/refresh",
    summary="Refresh connection",
    description="Trigger data synchronization for an existing SaltEdge connection.",
)
def refresh(
    connection_id: str = Path(..., description="SaltEdge connection identifier"),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.refresh(connection_id=connection_id)


@router.post(
    "/connections/{connection_id}/background_refresh",
    summary="Background refresh connection",
    description="Start a background refresh for a SaltEdge connection "
    "(non-blocking sync to update accounts & transactions).",
)
def background_refresh(
    connection_id: str = Path(..., description="SaltEdge connection identifier"),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.background_refresh(connection_id=connection_id)


# @router.post("/consents", response_model=ConsentResponse)
# def create_consent(payload: dict = Body(...), ctl: SaltEdgeController = Depends(get_controller)):
#     return ctl.create_consent(payload=payload)


@router.get(
    "/consents",
    response_model=ConsentsResponse,
    summary="List consents",
    description=(
        "Retrieve consents filtered by `customer_id` and/or `connection_id`. "
        "Supports pagination via `per_page` and `from_id`."
    ),
)
async def list_consents(
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
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.list_consents(
        db,
        customer_id=customer_id,
        connection_id=connection_id,
        per_page=per_page,
        from_id=from_id,
    )


@router.get(
    "/consents/{consent_id}",
    response_model=ConsentResponse,
    summary="Get consent details",
    description=(
        "Retrieve a specific consent by ID. "
        "**You must provide either `connection_id` or `customer_id`** to scope the lookup."
    ),
)
async def get_consent(
    consent_id: str = Path(..., description="SaltEdge consent identifier"),
    connection_id: str = Query(
        None,
        description="SaltEdge connection identifier (required if `customer_id` not provided)",
    ),
    customer_id: Optional[str] = Query(
        None,
        description="SaltEdge customer identifier (required if `connection_id` not provided)",
    ),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    if not connection_id and not customer_id:
        # avoid calling upstream and getting a 400
        raise HTTPException(
            status_code=422, detail="Provide connection_id or customer_id"
        )
    return await ctl.get_consent(
        db, consent_id=consent_id, connection_id=connection_id, customer_id=customer_id
    )


@router.post(
    "/consents/{consent_id}/revoke",
    response_model=ConsentResponse,
    summary="Revoke a consent",
    description="Revoke (invalidate) an existing consent by its identifier.",
)
def revoke_consent(
    consent_id: str = Path(..., description="SaltEdge consent identifier"),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.revoke_consent(consent_id=consent_id)


@router.get(
    "/rates",
    response_model=RatesResponse,
    summary="Get exchange rates",
    description=(
        "Retrieve exchange rates. Optionally specify a historical `date` in `YYYY-MM-DD` format; "
        "if omitted, the latest available rates are returned."
    ),
)
def get_rates(
    date: Optional[str] = Query(
        None, description="Historical date in YYYY-MM-DD format (optional)"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.get_rates(date=date)


# ---------- Customers ----------
@router.post(
    "/customers",
    response_model=CreatedClientCustomerResponse | CreatedPartnerCustomerResponse,
    summary="Create a new customer",
    description=(
        "Create a SaltEdge customer entity. "
        "The payload may vary depending on whether it's a client- or partner-created customer."
    ),
)
async def create_customer(
    payload: dict = Body(
        ..., description="Customer creation payload (SaltEdge format)"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.create_customer(db, payload=payload)


@router.get(
    "/customers",
    response_model=CustomersResponse,
    summary="List customers",
    description=(
        "Retrieve all SaltEdge customers. "
        "Supports pagination using `per_page` and `from_id` parameters."
    ),
)
async def list_customers(
    per_page: Optional[int] = Query(None, description="Number of results per page"),
    from_id: Optional[str] = Query(
        None, description="Return results after this ID (pagination cursor)"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.list_customers(db, per_page=per_page, from_id=from_id)


@router.get(
    "/customers/{customer_id}",
    response_model=CustomerResponse,
    summary="Get customer details",
    description="Retrieve detailed information about a specific SaltEdge customer.",
)
async def get_customer(
    customer_id: str = Path(..., description="SaltEdge customer identifier"),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.get_customer(db, customer_id=customer_id)


@router.delete(
    "/customers/{customer_id}",
    response_model=RemovedCustomerResponse,
    summary="Delete customer",
    description="Remove a SaltEdge customer. This action is irreversible.",
)
def delete_customer(
    customer_id: str = Path(..., description="SaltEdge customer identifier"),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.delete_customer(customer_id=customer_id)


# ---------- Transactions ----------
@router.get(
    "/transactions",
    response_model=TransactionsResponse,
    summary="List transactions",
    description=(
        "Retrieve transactions for a connection, optionally filtered "
        "by account, pending status, duplicated flag, or pagination."
    ),
)
async def list_transactions(
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
    from_id: Optional[str] = Query(
        None, description="Return results after this ID (pagination cursor)"
    ),
    per_page: Optional[int] = Query(None, description="Number of results per page"),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.list_transactions(
        db,
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
    description="Update transaction details in SaltEdge using the provided payload.",
)
def update_transactions(
    payload: UpdateTransactionsRequestBody = Body(
        ..., description="Request payload containing transaction update instructions"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.update_transactions(payload=payload)


# ---------- Providers ----------
@router.get(
    "/providers",
    response_model=ProvidersResponse,
    summary="List providers",
    description=(
        "Retrieve SaltEdge providers. Supports multiple filters including country, mode, and field inclusion flags. "
        "Pagination supported via `per_page` and `from_id`."
    ),
)
async def list_providers(
    include_sandboxes: Optional[bool] = Query(
        None, description="Include test/sandbox providers"
    ),
    country_code: Optional[str] = Query(
        None, description="Filter providers by ISO country code (e.g., 'GB', 'US')"
    ),
    include_ais_fields: Optional[bool] = Query(
        None, description="Include AIS (account information) fields"
    ),
    include_pis_fields: Optional[bool] = Query(
        None, description="Include PIS (payment initiation) fields"
    ),
    include_credentials_fields: Optional[bool] = Query(
        None, description="Include provider credential fields"
    ),
    exclude_inactive: Optional[bool] = Query(
        None, description="Exclude inactive or deprecated providers"
    ),
    key_owner: Optional[str] = Query(
        None, description="Filter by key owner: 'client' or 'provider'"
    ),
    mode: Optional[str] = Query(
        None, description="Filter providers by mode (e.g., 'oauth', 'oauth2')"
    ),
    from_id: Optional[str] = Query(
        None, description="Return results after this provider ID (pagination cursor)"
    ),
    per_page: Optional[int] = Query(None, description="Number of providers per page"),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.list_providers(
        db,
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
    description="Retrieve details about a specific SaltEdge provider by provider code.",
)
async def show_provider(
    provider_code: str = Path(
        ..., description="SaltEdge provider code (e.g., `fake_oauth_client_xf`)"
    ),
    include_ais_fields: Optional[bool] = Query(
        None, description="Include AIS (account information) fields"
    ),
    include_pis_fields: Optional[bool] = Query(
        None, description="Include PIS (payment initiation) fields"
    ),
    include_credentials_fields: Optional[bool] = Query(
        None, description="Include provider credential fields"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
    db: AsyncSession = Depends(get_db_session),
):
    return await ctl.show_provider(
        db,
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
    description="Initiate a new SaltEdge payment request using the provided payload.",
)
def create_payment(
    payload: CreatePaymentRequestBody = Body(
        ..., description="Payment request payload in SaltEdge format"
    ),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.create_payment(payload=payload)


@router.get(
    "/payments",
    response_model=PaymentsListResponse,
    summary="List payments",
    description="Retrieve all payments for a given customer. Supports pagination.",
)
def list_payments(
    customer_id: str = Query(..., description="SaltEdge customer identifier"),
    from_id: Optional[str] = Query(
        None, description="Return results after this ID (pagination cursor)"
    ),
    per_page: Optional[int] = Query(None, description="Number of results per page"),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.list_payments(
        customer_id=customer_id, from_id=from_id, per_page=per_page
    )


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse,
    summary="Get payment details",
    description="Retrieve information about a specific payment.",
)
def show_payment(
    payment_id: str = Path(..., description="SaltEdge payment identifier"),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.show_payment(payment_id=payment_id)


@router.put(
    "/payments/{payment_id}/refresh",
    response_model=UpdatePaymentResponse,
    summary="Refresh payment",
    description="Refresh payment status and details from SaltEdge.",
)
def refresh_payment(
    payment_id: str = Path(..., description="SaltEdge payment identifier"),
    ctl: SaltEdgeController = Depends(get_controller),
):
    return ctl.refresh_payment(payment_id=payment_id)
