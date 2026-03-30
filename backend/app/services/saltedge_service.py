from __future__ import annotations
from typing import Any, Callable, Dict, Iterator, Optional
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select
from datetime import datetime, date, timezone
import asyncio
from functools import partial

from app.config import Settings
from app.core.exceptions import ConflictError, NotFoundError
from packages.saltedge import SaltEdgeClient
from packages.saltedge.models.accounts import (
    AccountsResponse,
)
from packages.saltedge.saltedge_api import API
from packages.saltedge.models.connections import ConnectionsResponse, Connection
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
from app.db.models.banking import (
    BankAccountModel,
    ConsentModel,
    ConnectionModel,
    CustomerModel,
    ProviderModel,
    Transaction,
)


class SaltEdgeService:
    """Orchestrates calls to the Salt Edge SDK using app-level settings."""

    def __init__(
        self, db: AsyncSession, app_settings: Settings, organization_id: str
    ) -> None:
        self.db = db
        self.app_settings = app_settings
        self.organization_id = organization_id  # Security anchor
        self._client: SaltEdgeClient = SaltEdgeClient(app_settings)
        self._api: API = API(self._client)

    async def _run_saltedge_sync(
        self, fn: Callable[..., Any], /, *args: Any, **kwargs: Any
    ) -> Any:
        """Run blocking Salt Edge SDK (sync httpx) calls off the asyncio event loop."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, partial(fn, *args, **kwargs))

    # ---------- Accounts ----------
    async def list_accounts(
        self,
        *,
        customer_id: str | None = None,
        connection_id: str | None = None,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> AccountsResponse:
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.accounts.list,
            customer_id=customer_id,
            connection_id=connection_id,
            per_page=per_page,
            from_id=from_id,
        )

        # Store/update accounts in database
        if response.data:
            for account_data in response.data:
                await self._store_or_update_account(account_data, connection_id)

        return response

    # ---------- Connections ----------
    async def list_connections(
        self,
        *,
        customer_id: str,
        per_page: Optional[int] = None,
        from_id: Optional[str] = None,
    ) -> ConnectionsResponse:
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.connections.list,
            customer_id=customer_id,
            per_page=per_page,
            from_id=from_id,
        )

        # Store/update connections in database
        if response.data:
            for connection_data in response.data:
                await self._store_or_update_connection(connection_data)

        return response

    async def iterate_connections(
        self, *, customer_id: str, per_page: Optional[int] = None
    ) -> Iterator[ConnectionsResponse]:
        return await self._run_saltedge_sync(
            self._api.connections.iterate,
            customer_id=customer_id,
            per_page=per_page,
        )

    async def get_connection(self, *, connection_id: str) -> Connection:
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.connections.get, connection_id
        )

        # Store/update connection in database
        await self._store_or_update_connection(response)

        return response

    async def connect(self, *, payload: Dict[str, Any]) -> Dict[str, Any]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, partial(self._api.connections.connect, payload=payload)
        )

    async def reconnect(
        self, *, connection_id: str, payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None,
            partial(self._api.connections.reconnect, connection_id, payload=payload),
        )

    async def refresh(self, *, connection_id: str) -> Dict[str, Any]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, partial(self._api.connections.refresh, connection_id)
        )

    async def background_refresh(self, *, connection_id: str) -> Dict[str, Any]:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, partial(self._api.connections.background_refresh, connection_id)
        )

    async def close(self) -> None:
        self._client.close()

    # ---------- Consents ----------
    # def create_consent(self, *, payload: dict) -> ConsentResponse:
    #     return self._api.consents.create(payload=payload)

    async def list_consents(
        self,
        *,
        customer_id: str | None = None,
        connection_id: str | None = None,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> ConsentsResponse:
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.consents.list,
            customer_id=customer_id,
            connection_id=connection_id,
            per_page=per_page,
            from_id=from_id,
        )

        # Store/update consents in database
        if response.data:
            for consent_data in response.data:
                await self._store_or_update_consent(consent_data)

        return response

    async def get_consent(
        self,
        consent_id: str,
        *,
        connection_id: str | None = None,
        customer_id: str | None = None,
    ):
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.consents.get,
            consent_id,
            connection_id=connection_id,
            customer_id=customer_id,
        )

        # Store/update consent in database
        await self._store_or_update_consent(response)

        return response

    async def revoke_consent(self, *, consent_id: str) -> ConsentResponse:
        return await self._run_saltedge_sync(
            self._api.consents.revoke, consent_id=consent_id
        )

    # ---------- Rates ----------
    async def get_rates(self, *, date: str | None = None) -> RatesResponse:
        return await self._run_saltedge_sync(self._api.rates.get_rates, date=date)

    # ---------- Customers ----------
    async def create_customer(
        self, *, payload: dict
    ) -> CreatedClientCustomerResponse | CreatedPartnerCustomerResponse | dict:
        # Create in SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.customers.create, payload=payload
        )

        # Store customer in database if creation was successful
        if hasattr(response, "data") and response.data:
            await self._store_or_update_customer(response.data)

        return response

    async def list_customers(
        self,
        *,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> CustomersResponse:
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.customers.list, from_id=from_id, per_page=per_page
        )

        # Store/update customers in database
        if response.data:
            for customer_data in response.data:
                await self._store_or_update_customer(customer_data)

        return response

    async def get_customer(self, *, customer_id: str) -> CustomerResponse:
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.customers.get, customer_id=customer_id
        )

        # Store/update customer in database
        await self._store_or_update_customer(response.data)

        return response

    async def delete_customer(self, *, customer_id: str) -> RemovedCustomerResponse:

        # 1. External call: Delete from SaltEdge securely without blocking the event loop
        loop = asyncio.get_running_loop()
        response = await loop.run_in_executor(
            None, partial(self._api.customers.delete, customer_id=customer_id)
        )

        # 2. Local DB: Soft delete the record (Ensuring multi-tenant safety)
        existing_result = await self.db.execute(
            select(CustomerModel).where(
                CustomerModel.id == customer_id,
                CustomerModel.organization_id == self.organization_id,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            await self.db.execute(
                delete(CustomerModel).where(
                    CustomerModel.id == customer_id,
                    CustomerModel.organization_id == self.organization_id,
                )
            )
            await self.db.commit()

        return response

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
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.transactions.list,
            connection_id=connection_id,
            account_id=account_id,
            pending=pending,
            duplicated=duplicated,
            from_id=from_id,
            per_page=per_page,
        )

        # Store/update transactions in database
        if response.data:
            for transaction_data in response.data:
                await self._store_or_update_transaction(transaction_data)

        return response

    async def update_transactions(
        self, *, payload: UpdateTransactionsRequestBody
    ) -> UpdateTransactionsResponse:
        return await self._run_saltedge_sync(
            self._api.transactions.update, payload=payload
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
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.providers.list,
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

        # Store/update providers in database
        if response.data:
            for provider_data in response.data:
                await self._store_or_update_provider(provider_data)

        return response

    async def show_provider(
        self,
        *,
        provider_code: str,
        include_ais_fields: Optional[bool] = None,
        include_pis_fields: Optional[bool] = None,
        include_credentials_fields: Optional[bool] = None,
    ) -> ProviderResponse:
        # Fetch from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.providers.show,
            provider_code=provider_code,
            include_ais_fields=include_ais_fields,
            include_pis_fields=include_pis_fields,
            include_credentials_fields=include_credentials_fields,
        )

        # Store/update provider in database
        await self._store_or_update_provider(response.data)

        return response

    # ---------- Payments ----------
    async def create_payment(
        self, *, payload: CreatePaymentRequestBody
    ) -> PaymentCreateResponse:
        return await self._run_saltedge_sync(
            self._api.payments.create, payload=payload
        )

    async def list_payments(
        self,
        *,
        customer_id: str,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> PaymentsListResponse:
        return await self._run_saltedge_sync(
            self._api.payments.list,
            customer_id=customer_id,
            from_id=from_id,
            per_page=per_page,
        )

    async def show_payment(self, *, payment_id: str) -> PaymentResponse:
        return await self._run_saltedge_sync(
            self._api.payments.show, payment_id=payment_id
        )

    async def refresh_payment(self, *, payment_id: str) -> UpdatePaymentResponse:
        # Refresh payment status from SaltEdge API
        response = await self._run_saltedge_sync(
            self._api.payments.refresh, payment_id=payment_id
        )

        # Note: Payment data storage would depend on your payment model structure
        # For now, just return the response

        return response

    # ---------- Helper methods for database storage ----------

    def _customer_belongs_to_org(self, row: CustomerModel) -> bool:
        """Compare org ids in a UUID-safe way (JWT string vs PG UUID-as-string)."""
        try:
            return UUID(str(row.organization_id)) == UUID(str(self.organization_id))
        except ValueError:
            return str(row.organization_id) == str(self.organization_id)

    def _apply_customer_payload(self, row: CustomerModel, customer_data: Any) -> None:
        row.external_id = customer_data.customer_id
        if hasattr(customer_data, "identifier"):
            row.identifier = customer_data.identifier
        if hasattr(customer_data, "email"):
            row.email = getattr(customer_data, "email", None)
        row.categorization_type = getattr(
            customer_data, "categorization_type", "personal"
        )

    async def _store_or_update_customer(self, customer_data) -> None:
        """Upsert a SaltEdge customer into the local database.

        Looks up by primary key ``id`` (SaltEdge customer id) first. The previous
        query required matching ``organization_id`` as well; if a row with the
        same ``id`` already existed under another tenant (or a concurrent insert
        landed first), the ORM assumed "missing" and issued INSERT → duplicate PK.

        Args:
            customer_data: SaltEdge SDK customer model instance to persist.
        """
        raw = getattr(customer_data, "customer_id", None) or getattr(
            customer_data, "id", None
        )
        if raw is None:
            return
        customer_id = str(raw)

        existing = await self.db.scalar(
            select(CustomerModel).where(CustomerModel.id == customer_id)
        )

        if existing:
            if not self._customer_belongs_to_org(existing):
                raise ConflictError(
                    detail="This Salt Edge customer is already linked to another organization.",
                    code="saltedge.customer_org_mismatch",
                )
            self._apply_customer_payload(existing, customer_data)
            await self.db.commit()
            return

        customer = CustomerModel(
            id=customer_id,
            organization_id=self.organization_id,
            external_id=customer_data.customer_id,
            identifier=getattr(customer_data, "identifier", None),
            email=getattr(customer_data, "email", None),
            categorization_type=getattr(
                customer_data, "categorization_type", "personal"
            ),
        )
        self.db.add(customer)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            existing = await self.db.scalar(
                select(CustomerModel).where(CustomerModel.id == customer_id)
            )
            if existing is None:
                raise
            if not self._customer_belongs_to_org(existing):
                raise ConflictError(
                    detail="This Salt Edge customer is already linked to another organization.",
                    code="saltedge.customer_org_mismatch",
                )
            self._apply_customer_payload(existing, customer_data)
            await self.db.commit()

    async def _store_or_update_connection(self, connection_data) -> None:
        """Upsert a SaltEdge connection into the local database."""
        connection_id = connection_data.id
        customer_id = connection_data.customer_id

        last_attempt_raw = getattr(connection_data, "last_attempt", None)
        holder_info_raw = getattr(connection_data, "holder_info", None)

        fields: Dict[str, Any] = {
            "external_id": connection_data.id,
            "external_customer_id": connection_data.customer_id,
            "customer_identifier": getattr(
                connection_data, "customer_identifier", None
            ),
            "customer_id": customer_id,
            "provider_code": connection_data.provider_code,
            "provider_name": connection_data.provider_name,
            "country_code": connection_data.country_code,
            "status": connection_data.status.value,
            "categorization": connection_data.categorization.value,
            "last_consent_id": getattr(connection_data, "last_consent_id", None),
            "automatic_refresh": getattr(connection_data, "automatic_refresh", False),
            "last_attempt": (
                last_attempt_raw.model_dump(mode="json") if last_attempt_raw else None
            ),
            "holder_info": (
                holder_info_raw.model_dump(mode="json") if holder_info_raw else None
            ),
        }

        # SECURE: Scope via customer.organization_id (connections have no org column)
        existing_result = await self.db.execute(
            select(ConnectionModel)
            .join(CustomerModel, CustomerModel.id == ConnectionModel.customer_id)
            .where(
                ConnectionModel.id == connection_id,
                CustomerModel.organization_id == self.organization_id,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            for attr, value in fields.items():
                setattr(existing, attr, value)
        else:
            self.db.add(
                ConnectionModel(
                    id=connection_id,
                    **fields,
                )
            )

        await self.db.commit()

    async def _store_or_update_account(
        self, account_data, connection_id: str = None
    ) -> None:
        """Upsert a SaltEdge bank account into the local database."""
        account_id = account_data.id  # Use string directly

        if not connection_id and hasattr(account_data, "connection_id"):
            connection_id = account_data.connection_id

        if connection_id:
            # SECURE: Also ensure the parent connection belongs to this organization
            connection_query = (
                select(ConnectionModel.id)
                .join(CustomerModel, CustomerModel.id == ConnectionModel.customer_id)
                .where(
                    ConnectionModel.external_id == connection_id,
                    CustomerModel.organization_id == self.organization_id,
                )
            )
            connection_result = await self.db.execute(connection_query)
            internal_connection_id = connection_result.scalar_one_or_none()

            if not internal_connection_id:
                return
        else:
            internal_connection_id = None

        # SECURE: Filter by organization_id
        existing_result = await self.db.execute(
            select(BankAccountModel).where(
                BankAccountModel.id == account_id,
                BankAccountModel.organization_id == self.organization_id,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.external_id = account_data.id
            existing.external_connection_id = connection_id
            existing.connection_id = internal_connection_id
            existing.name = account_data.name
            existing.nature = account_data.nature.value
            existing.balance = account_data.balance
            existing.currency_code = account_data.currency_code
            existing.extra = account_data.extra.model_dump(mode="json")
        else:
            account = BankAccountModel(
                id=account_id,
                organization_id=self.organization_id,  # SECURE
                external_id=account_data.id,
                external_connection_id=connection_id,
                connection_id=internal_connection_id,
                name=account_data.name,
                nature=account_data.nature.value,
                balance=account_data.balance,
                currency_code=account_data.currency_code,
                extra=account_data.extra.model_dump(mode="json"),
            )
            self.db.add(account)

        await self.db.commit()

    async def _store_or_update_transaction(self, transaction_data) -> None:
        """Upsert a SaltEdge transaction into the local database."""
        # SECURE: Filter by organization_id
        existing_result = await self.db.execute(
            select(Transaction).where(
                Transaction.id == transaction_data.id,
                Transaction.organization_id == self.organization_id,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.status = transaction_data.status
            existing.mode = transaction_data.mode
            existing.duplicated = transaction_data.duplicated
            existing.made_on = (
                date.fromisoformat(transaction_data.made_on)
                if transaction_data.made_on
                else None
            )
            existing.amount = transaction_data.amount
            existing.currency_code = transaction_data.currency_code
            existing.category = getattr(transaction_data, "category", None)
            existing.description = getattr(transaction_data, "description", None)
            existing.extra = transaction_data.extra.model_dump(mode="json")
        else:
            transaction = Transaction(
                id=transaction_data.id,
                organization_id=self.organization_id,  # SECURE
                account_id=transaction_data.account_id,
                status=transaction_data.status,
                mode=transaction_data.mode,
                duplicated=transaction_data.duplicated,
                made_on=(
                    date.fromisoformat(transaction_data.made_on)
                    if transaction_data.made_on
                    else None
                ),
                amount=transaction_data.amount,
                currency_code=transaction_data.currency_code,
                category=getattr(transaction_data, "category", None),
                description=getattr(transaction_data, "description", None),
                extra=transaction_data.extra.model_dump(mode="json"),
            )
            self.db.add(transaction)

        await self.db.commit()

    async def _store_or_update_consent(self, consent_data) -> None:
        """Upsert a SaltEdge consent record into the local database."""
        consent_id = consent_data.id

        external_connection_id = consent_data.connection_id

        if external_connection_id:
            # SECURE: resolve connection via customer.organization_id
            connection_query = (
                select(ConnectionModel.id)
                .join(CustomerModel, CustomerModel.id == ConnectionModel.customer_id)
                .where(
                    ConnectionModel.external_id == external_connection_id,
                    CustomerModel.organization_id == self.organization_id,
                )
            )
            connection_result = await self.db.execute(connection_query)
            internal_connection_id = connection_result.scalar_one_or_none()

            if not internal_connection_id:
                return
        else:
            internal_connection_id = None

        # SECURE: consent rows are scoped through connection → customer
        existing_result = await self.db.execute(
            select(ConsentModel)
            .join(ConnectionModel, ConnectionModel.id == ConsentModel.connection_id)
            .join(CustomerModel, CustomerModel.id == ConnectionModel.customer_id)
            .where(
                ConsentModel.id == consent_id,
                CustomerModel.organization_id == self.organization_id,
            )
        )
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.external_id = consent_data.id
            existing.external_customer_id = consent_data.customer_id
            existing.external_connection_id = external_connection_id
            existing.connection_id = internal_connection_id
            existing.status = consent_data.status
            existing.scopes = consent_data.scopes
            existing.period_days = getattr(consent_data, "period_days", None)
            existing.expires_at = getattr(consent_data, "expires_at", None)
            existing.from_date = getattr(consent_data, "from_date", None)
            existing.to_date = getattr(consent_data, "to_date", None)
            existing.collected_by = getattr(consent_data, "collected_by", None)
            existing.revoked_at = getattr(consent_data, "revoked_at", None)
            existing.revoke_reason = getattr(consent_data, "revoke_reason", None)
        else:
            consent = ConsentModel(
                id=consent_id,
                external_id=consent_data.id,
                external_customer_id=consent_data.customer_id,
                external_connection_id=external_connection_id,
                connection_id=internal_connection_id,
                status=consent_data.status,
                scopes=consent_data.scopes,
                period_days=getattr(consent_data, "period_days", None),
                expires_at=getattr(consent_data, "expires_at", None),
                from_date=getattr(consent_data, "from_date", None),
                to_date=getattr(consent_data, "to_date", None),
                collected_by=getattr(consent_data, "collected_by", None),
                revoked_at=getattr(consent_data, "revoked_at", None),
                revoke_reason=getattr(consent_data, "revoke_reason", None),
            )
            self.db.add(consent)

        await self.db.commit()

    @staticmethod
    def _build_provider_fields(provider_data) -> Dict[str, Any]:
        """Extract all writable ``ProviderModel`` fields from an SDK provider object.

        Centralises the field mapping so that :meth:`_store_or_update_provider`
        can share it between the create and update paths without duplication.

        Args:
            provider_data: A SaltEdge SDK ``Provider`` Pydantic model instance.

        Returns:
            Dict mapping ``ProviderModel`` column names to their values.
        """
        g = lambda attr, default=None: getattr(
            provider_data, attr, default
        )  # noqa: E731
        return {
            "name": provider_data.name,
            "country_code": provider_data.country_code,
            "bic_codes": g("bic_codes"),
            "identification_codes": g("identification_codes"),
            "dynamic_registration_code": g("dynamic_registration_code"),
            "group_code": g("group_code"),
            "group_name": g("group_name"),
            "hub": g("hub"),
            "status": provider_data.status,
            "mode": provider_data.mode,
            "regulated": provider_data.regulated,
            "logo_url": g("logo_url"),
            "timezone": g("timezone"),
            "supported_iframe_embedding": provider_data.supported_iframe_embedding,
            "optional_interactivity": g("optional_interactivity"),
            "customer_notified_on_sign_in": provider_data.customer_notified_on_sign_in,
            "automatic_fetch": g("automatic_fetch"),
            "custom_pendings_period": g("custom_pendings_period"),
            "holder_info": g("holder_info"),
            "instruction_for_connections": g("instruction_for_connections"),
            "interactive_for_connections": g("interactive_for_connections"),
            "max_consent_days": g("max_consent_days"),
            "max_fetch_interval": g("max_fetch_interval"),
            "fetch_policies": g("fetch_policies"),
            "max_interactive_delay": g("max_interactive_delay"),
            "refresh_timeout": g("refresh_timeout"),
            "supported_account_extra_fields": g("supported_account_extra_fields"),
            "supported_account_natures": g("supported_account_natures"),
            "supported_account_types": g("supported_account_types"),
            "supported_fetch_scopes": g("supported_fetch_scopes"),
            "supported_transaction_extra_fields": g(
                "supported_transaction_extra_fields"
            ),
            "payment_templates": g("payment_templates"),
            "instruction_for_payments": g("instruction_for_payments"),
            "interactive_for_payments": g("interactive_for_payments"),
            "no_funds_rejection_supported": g("no_funds_rejection_supported"),
            "required_payment_fields": g("required_payment_fields"),
            "supported_payment_fields": g("supported_payment_fields"),
            "credentials_fields": g("credentials_fields"),
            "interactive_fields": g("interactive_fields"),
        }

    async def _store_or_update_provider(self, provider_data) -> None:
        """Upsert a SaltEdge provider into the local database.

        Args:
            db: Async database session.
            provider_data: SaltEdge SDK ``Provider`` model instance to persist.
        """
        fields = self._build_provider_fields(provider_data)
        existing = await self.db.get(ProviderModel, provider_data.code)

        if existing:
            for attr, value in fields.items():
                setattr(existing, attr, value)
        else:
            self.db.add(
                ProviderModel(id=provider_data.code, code=provider_data.code, **fields)
            )

        await self.db.commit()
