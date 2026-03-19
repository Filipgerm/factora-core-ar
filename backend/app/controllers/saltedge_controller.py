from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import HTTPException

from app.core.exceptions import ExternalServiceError, NotFoundError
from packages.saltedge.errors import ApiError, NetworkError

logger = logging.getLogger(__name__)

from packages.saltedge.models.connections import (
    ConnectionsResponse,
    Connection,
    ConnectionActionResponse,
)
from app.services.saltedge_service import SaltEdgeService
from packages.saltedge.models.accounts import AccountsResponse
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

    async def _handle_service_call(self, coro, *args, **kwargs):
        """Invoke a service coroutine and map known error types to HTTPException."""
        try:
            return await coro(*args, **kwargs)
        except ApiError as e:
            # Safely pass down 4xx status codes (e.g. 404 Not Found, 400 Bad Request)
            # instead of masking everything as 502 Bad Gateway.
            status = getattr(e, "status_code", 502)
            if not (400 <= status < 600):
                status = 502

            raise HTTPException(
                status_code=status,
                detail=f"SaltEdge API error: {e.message if hasattr(e, 'message') else str(e)}",
            )
        except NetworkError as e:
            raise HTTPException(
                status_code=503,
                detail=f"SaltEdge network error: {e}",
            )

    # ---------- Accounts ----------
    async def list_accounts(
        self,
        *,
        customer_id: str | None = None,
        connection_id: str | None = None,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> AccountsResponse:
        return await self._handle_service_call(
            self.service.list_accounts,
            customer_id=customer_id,
            connection_id=connection_id,
            per_page=per_page,
            from_id=from_id,
        )

    # ---------- Connections ----------
    async def list_connections(
        self,
        *,
        customer_id: str,
        per_page: Optional[int] = None,
        from_id: Optional[str] = None,
    ) -> ConnectionsResponse:
        return await self._handle_service_call(
            self.service.list_connections,
            customer_id=customer_id,
            per_page=per_page,
            from_id=from_id,
        )

    async def get_connection(self, *, connection_id: str) -> Connection:
        return await self._handle_service_call(
            self.service.get_connection, connection_id=connection_id
        )

    async def connect(self, *, payload: Dict[str, Any]) -> ConnectionActionResponse:
        # We ensure typing respects the DTO
        result = await self._handle_service_call(self.service.connect, payload=payload)
        return ConnectionActionResponse(**result)

    async def reconnect(
        self, *, connection_id: str, payload: Optional[Dict[str, Any]] = None
    ) -> ConnectionActionResponse:
        result = await self._handle_service_call(
            self.service.reconnect, connection_id=connection_id, payload=payload
        )
        return ConnectionActionResponse(**result)

    async def refresh(self, *, connection_id: str) -> ConnectionActionResponse:
        result = await self._handle_service_call(
            self.service.refresh, connection_id=connection_id
        )
        return ConnectionActionResponse(**result)

    async def background_refresh(
        self, *, connection_id: str
    ) -> ConnectionActionResponse:
        result = await self._handle_service_call(
            self.service.background_refresh, connection_id=connection_id
        )
        return ConnectionActionResponse(**result)

    # ---------- Consents ----------
    async def list_consents(
        self,
        *,
        customer_id: str | None = None,
        connection_id: str | None = None,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> ConsentsResponse:
        return await self._handle_service_call(
            self.service.list_consents,
            customer_id=customer_id,
            connection_id=connection_id,
            per_page=per_page,
            from_id=from_id,
        )

    async def get_consent(
        self,
        consent_id: str,
        connection_id: str | None,
        customer_id: str | None,
    ):
        return await self._handle_service_call(
            self.service.get_consent,
            consent_id,
            connection_id=connection_id,
            customer_id=customer_id,
        )

    async def revoke_consent(self, *, consent_id: str) -> ConsentResponse:
        return await self._handle_service_call(
            self.service.revoke_consent, consent_id=consent_id
        )

    # ---------- Rates ----------
    async def get_rates(self, *, date: str | None = None) -> RatesResponse:
        return await self._handle_service_call(self.service.get_rates, date=date)

    # ---------- Customers ----------
    async def create_customer(
        self, *, payload: dict
    ) -> CreatedClientCustomerResponse | CreatedPartnerCustomerResponse | dict:
        return await self._handle_service_call(
            self.service.create_customer, payload=payload
        )

    async def list_customers(
        self,
        *,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> CustomersResponse:
        return await self._handle_service_call(
            self.service.list_customers, per_page=per_page, from_id=from_id
        )

    async def get_customer(self, *, customer_id: str) -> CustomerResponse:
        return await self._handle_service_call(
            self.service.get_customer, customer_id=customer_id
        )

    async def delete_customer(self, *, customer_id: str) -> RemovedCustomerResponse:
        return await self._handle_service_call(
            self.service.delete_customer, customer_id=customer_id
        )

    # ---------- Transactions ----------
    async def list_transactions(
        self,
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
            connection_id=connection_id,
            account_id=account_id,
            pending=pending,
            duplicated=duplicated,
            from_id=from_id,
            per_page=per_page,
        )

    async def update_transactions(
        self, *, payload: UpdateTransactionsRequestBody
    ) -> UpdateTransactionsResponse:
        return await self._handle_service_call(
            self.service.update_transactions, payload=payload
        )

    # ---------- Providers ----------
    async def list_providers(
        self,
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
        *,
        provider_code: str,
        include_ais_fields: Optional[bool] = None,
        include_pis_fields: Optional[bool] = None,
        include_credentials_fields: Optional[bool] = None,
    ) -> ProviderResponse:
        return await self._handle_service_call(
            self.service.show_provider,
            provider_code=provider_code,
            include_ais_fields=include_ais_fields,
            include_pis_fields=include_pis_fields,
            include_credentials_fields=include_credentials_fields,
        )

    # ---------- Payments ----------
    async def create_payment(
        self, *, payload: CreatePaymentRequestBody
    ) -> PaymentCreateResponse:
        return await self._handle_service_call(
            self.service.create_payment, payload=payload
        )

    async def list_payments(
        self,
        *,
        customer_id: str,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> PaymentsListResponse:
        return await self._handle_service_call(
            self.service.list_payments,
            customer_id=customer_id,
            from_id=from_id,
            per_page=per_page,
        )

    async def show_payment(self, *, payment_id: str) -> PaymentResponse:
        return await self._handle_service_call(
            self.service.show_payment, payment_id=payment_id
        )

    async def refresh_payment(self, *, payment_id: str) -> UpdatePaymentResponse:
        return await self._handle_service_call(
            self.service.refresh_payment, payment_id=payment_id
        )
