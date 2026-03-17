from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ExternalServiceError, NotFoundError
from packages.saltedge.errors import ApiError, NetworkError

logger = logging.getLogger(__name__)
from packages.saltedge.models.connections import ConnectionsResponse, Connection
from app.services.saltedge_service import SaltEdgeService
from packages.saltedge.models.accounts import (
    AccountsResponse,
)
from packages.saltedge.models.consents import ConsentsResponse, ConsentResponse
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


class SaltEdgeController:
    """Thin controller layer to translate service calls and handle errors."""

    def __init__(self, service: SaltEdgeService) -> None:
        self.service = service

    async def _handle_service_call(self, coro, db: AsyncSession, *args, **kwargs):
        """Invoke a service coroutine and map known error types to HTTPException.

        SaltEdge ``ApiError`` → 502 Bad Gateway
        SaltEdge ``NetworkError`` → 503 Service Unavailable
        All other exceptions propagate and are caught by the global AppError handler.
        """
        try:
            return await coro(db, *args, **kwargs)
        except ApiError as e:
            raise HTTPException(
                status_code=502,
                detail=f"SaltEdge API error: {e}",
            )
        except NetworkError as e:
            raise HTTPException(
                status_code=503,
                detail=f"SaltEdge network error: {e}",
            )

    # ---------- Accounts ----------
    async def list_accounts(
        self,
        db: AsyncSession,
        *,
        customer_id: str | None = None,
        connection_id: str | None = None,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> AccountsResponse:
        return await self._handle_service_call(
            self.service.list_accounts,
            db,
            customer_id=customer_id,
            connection_id=connection_id,
            per_page=per_page,
            from_id=from_id,
        )

    # ---------- Connections ----------
    async def list_connections(
        self,
        db: AsyncSession,
        *,
        customer_id: str,
        per_page: Optional[int] = None,
        from_id: Optional[str] = None,
    ) -> ConnectionsResponse:
        return await self._handle_service_call(
            self.service.list_connections,
            db,
            customer_id=customer_id,
            per_page=per_page,
            from_id=from_id,
        )

    async def get_connection(
        self, db: AsyncSession, *, connection_id: str
    ) -> Connection:
        return await self._handle_service_call(
            self.service.get_connection, db, connection_id=connection_id
        )

    def connect(self, *, payload: Dict[str, Any]) -> Dict[str, Any]:
        try:
            return self.service.connect(payload=payload)
        except (ApiError, NetworkError) as e:
            raise

    def reconnect(
        self, *, connection_id: str, payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        try:
            return self.service.reconnect(connection_id=connection_id, payload=payload)
        except (ApiError, NetworkError) as e:
            raise

    def refresh(self, *, connection_id: str) -> Dict[str, Any]:
        try:
            return self.service.refresh(connection_id=connection_id)
        except (ApiError, NetworkError) as e:
            raise

    def background_refresh(self, *, connection_id: str) -> Dict[str, Any]:
        try:
            return self.service.background_refresh(connection_id=connection_id)
        except (ApiError, NetworkError) as e:
            raise

    # ---------- Consents ----------
    # def create_consent(self, *, payload: dict) -> ConsentResponse:
    #     return self.service.create_consent(payload=payload)

    async def list_consents(
        self,
        db: AsyncSession,
        *,
        customer_id: str | None = None,
        connection_id: str | None = None,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> ConsentsResponse:
        return await self._handle_service_call(
            self.service.list_consents,
            db,
            customer_id=customer_id,
            connection_id=connection_id,
            per_page=per_page,
            from_id=from_id,
        )

    async def get_consent(
        self,
        db: AsyncSession,
        consent_id: str,
        connection_id: str | None,
        customer_id: str | None,
    ):
        return await self._handle_service_call(
            self.service.get_consent,
            db,
            consent_id,
            connection_id=connection_id,
            customer_id=customer_id,
        )

    def revoke_consent(self, *, consent_id: str) -> ConsentResponse:
        return self.service.revoke_consent(consent_id=consent_id)

    # ---------- Rates ----------
    def get_rates(self, *, date: str | None = None) -> RatesResponse:
        return self.service.get_rates(date=date)

    # ---------- Customers ----------
    async def create_customer(
        self, db: AsyncSession, *, payload: dict
    ) -> CreatedClientCustomerResponse | CreatedPartnerCustomerResponse | dict:
        return await self._handle_service_call(
            self.service.create_customer, db, payload=payload
        )

    async def list_customers(
        self,
        db: AsyncSession,
        *,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> CustomersResponse:
        return await self._handle_service_call(
            self.service.list_customers, db, per_page=per_page, from_id=from_id
        )

    async def get_customer(
        self, db: AsyncSession, *, customer_id: str
    ) -> CustomerResponse:
        return await self._handle_service_call(
            self.service.get_customer, db, customer_id=customer_id
        )

    def delete_customer(self, *, customer_id: str) -> RemovedCustomerResponse:
        return self.service.delete_customer(customer_id=customer_id)

    # ---------- Transactions ----------
    async def list_transactions(
        self,
        db: AsyncSession,
        *,
        connection_id: str,
        account_id: str | None = None,
        pending: bool | None = None,
        duplicated: bool | None = None,
        from_id: str | None = None,
        per_page: int | None = None,
    ) -> TransactionsResponse:
        return await self._handle_service_call(
            self.service.list_transactions,
            db,
            connection_id=connection_id,
            account_id=account_id,
            pending=pending,
            duplicated=duplicated,
            from_id=from_id,
            per_page=per_page,
        )

    def update_transactions(
        self, *, payload: UpdateTransactionsRequestBody
    ) -> UpdateTransactionsResponse:
        return self.service.update_transactions(payload=payload)

    # ---------- Providers ----------
    async def list_providers(
        self,
        db: AsyncSession,
        *,
        include_sandboxes: Optional[bool] = None,
        country_code: Optional[str] = None,
        include_ais_fields: Optional[bool] = None,
        include_pis_fields: Optional[bool] = None,
        include_credentials_fields: Optional[bool] = None,
        exclude_inactive: Optional[bool] = None,
        key_owner: Optional[str] = None,
        mode: Optional[str] = None,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> ProvidersResponse:
        return await self._handle_service_call(
            self.service.list_providers,
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

    async def show_provider(
        self,
        db: AsyncSession,
        *,
        provider_code: str,
        include_ais_fields: Optional[bool] = None,
        include_pis_fields: Optional[bool] = None,
        include_credentials_fields: Optional[bool] = None,
    ) -> ProviderResponse:
        return await self._handle_service_call(
            self.service.show_provider,
            db,
            provider_code=provider_code,
            include_ais_fields=include_ais_fields,
            include_pis_fields=include_pis_fields,
            include_credentials_fields=include_credentials_fields,
        )

    # ---------- Payments ----------
    def create_payment(
        self, *, payload: CreatePaymentRequestBody
    ) -> PaymentCreateResponse:
        return self.service.create_payment(payload=payload)

    def list_payments(
        self,
        *,
        customer_id: str,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> PaymentsListResponse:
        return self.service.list_payments(
            customer_id=customer_id, from_id=from_id, per_page=per_page
        )

    def show_payment(self, *, payment_id: str) -> PaymentResponse:
        return self.service.show_payment(payment_id=payment_id)

    def refresh_payment(self, *, payment_id: str) -> UpdatePaymentResponse:
        return self.service.refresh_payment(payment_id=payment_id)
