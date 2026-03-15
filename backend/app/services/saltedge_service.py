from __future__ import annotations
from typing import Iterator, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date

from app.config import Settings
from app.core.demo import demo_fixture
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
from app.db.database_models import (
    CustomerModel,
    ConnectionModel,
    BankAccountModel,
    ConsentModel,
    Transaction,
    ProviderModel,
)


class SaltEdgeService:
    """Orchestrates calls to the Salt Edge SDK using app-level settings."""

    def __init__(self, app_settings: Settings) -> None:
        self._client: SaltEdgeClient = SaltEdgeClient(app_settings)
        self._api: API = API(self._client)
        self.app_settings = app_settings

    # ---------- Accounts ----------
    @demo_fixture("saltedge_accounts")
    async def list_accounts(
        self,
        db: AsyncSession,
        *,
        customer_id: str | None = None,
        connection_id: str | None = None,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> AccountsResponse:
        # Fetch from SaltEdge API
        response = self._api.accounts.list(
            customer_id=customer_id,
            connection_id=connection_id,
            per_page=per_page,
            from_id=from_id,
        )

        # Store/update accounts in database
        if response.data:
            for account_data in response.data:
                await self._store_or_update_account(db, account_data, connection_id)

        return response

    # ---------- Connections ----------
    async def list_connections(
        self,
        db: AsyncSession,
        *,
        customer_id: str,
        per_page: Optional[int] = None,
        from_id: Optional[str] = None,
    ) -> ConnectionsResponse:
        # Fetch from SaltEdge API
        response = self._api.connections.list(
            customer_id=customer_id, per_page=per_page, from_id=from_id
        )

        # Store/update connections in database
        if response.data:
            for connection_data in response.data:
                await self._store_or_update_connection(db, connection_data)

        return response

    def iterate_connections(
        self, *, customer_id: str, per_page: Optional[int] = None
    ) -> Iterator[ConnectionsResponse]:
        return self._api.connections.iterate(customer_id=customer_id, per_page=per_page)

    async def get_connection(
        self, db: AsyncSession, *, connection_id: str
    ) -> Connection:
        # Fetch from SaltEdge API
        response = self._api.connections.get(connection_id)

        # Store/update connection in database
        await self._store_or_update_connection(db, response)

        return response

    def connect(self, *, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self._api.connections.connect(payload=payload)

    def reconnect(
        self, *, connection_id: str, payload: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        return self._api.connections.reconnect(connection_id, payload=payload)

    def refresh(self, *, connection_id: str) -> Dict[str, Any]:
        return self._api.connections.refresh(connection_id)

    def background_refresh(self, *, connection_id: str) -> Dict[str, Any]:
        return self._api.connections.background_refresh(connection_id)

    def close(self) -> None:
        self._client.close()

    # ---------- Consents ----------
    # def create_consent(self, *, payload: dict) -> ConsentResponse:
    #     return self._api.consents.create(payload=payload)

    async def list_consents(
        self,
        db: AsyncSession,
        *,
        customer_id: str | None = None,
        connection_id: str | None = None,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> ConsentsResponse:
        # Fetch from SaltEdge API
        response = self._api.consents.list(
            customer_id=customer_id,
            connection_id=connection_id,
            per_page=per_page,
            from_id=from_id,
        )

        # Store/update consents in database
        if response.data:
            for consent_data in response.data:
                await self._store_or_update_consent(db, consent_data)

        return response

    async def get_consent(
        self,
        db: AsyncSession,
        consent_id: str,
        *,
        connection_id: str | None = None,
        customer_id: str | None = None,
    ):
        # Fetch from SaltEdge API
        response = self._api.consents.get(
            consent_id, connection_id=connection_id, customer_id=customer_id
        )

        # Store/update consent in database
        await self._store_or_update_consent(db, response)

        return response

    def revoke_consent(self, *, consent_id: str) -> ConsentResponse:
        return self._api.consents.revoke(consent_id=consent_id)

    # ---------- Rates ----------
    def get_rates(self, *, date: str | None = None) -> RatesResponse:
        return self._api.rates.get_rates(date=date)

    # ---------- Customers ----------
    async def create_customer(
        self, db: AsyncSession, *, payload: dict
    ) -> CreatedClientCustomerResponse | CreatedPartnerCustomerResponse | dict:
        # Create in SaltEdge API
        response = self._api.customers.create(payload=payload)

        # Store customer in database if creation was successful
        if hasattr(response, "data") and response.data:
            await self._store_or_update_customer(db, response.data)

        return response

    async def list_customers(
        self,
        db: AsyncSession,
        *,
        per_page: int | None = None,
        from_id: str | None = None,
    ) -> CustomersResponse:
        # Fetch from SaltEdge API
        response = self._api.customers.list(from_id=from_id, per_page=per_page)

        # Store/update customers in database
        if response.data:
            for customer_data in response.data:
                await self._store_or_update_customer(db, customer_data)

        return response

    async def get_customer(
        self, db: AsyncSession, *, customer_id: str
    ) -> CustomerResponse:
        # Fetch from SaltEdge API
        response = self._api.customers.get(customer_id=customer_id)

        # Store/update customer in database
        await self._store_or_update_customer(db, response.data)

        return response

    def delete_customer(self, *, customer_id: str) -> RemovedCustomerResponse:
        return self._api.customers.delete(customer_id=customer_id)

    # ---------- Transactions ----------
    @demo_fixture("saltedge_transactions")
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
        # Fetch from SaltEdge API
        response = self._api.transactions.list(
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
                await self._store_or_update_transaction(db, transaction_data)

        return response

    def update_transactions(
        self, *, payload: UpdateTransactionsRequestBody
    ) -> UpdateTransactionsResponse:
        return self._api.transactions.update(payload=payload)

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
        # Fetch from SaltEdge API
        response = self._api.providers.list(
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
                await self._store_or_update_provider(db, provider_data)

        return response

    async def show_provider(
        self,
        db: AsyncSession,
        *,
        provider_code: str,
        include_ais_fields: Optional[bool] = None,
        include_pis_fields: Optional[bool] = None,
        include_credentials_fields: Optional[bool] = None,
    ) -> ProviderResponse:
        # Fetch from SaltEdge API
        response = self._api.providers.show(
            provider_code=provider_code,
            include_ais_fields=include_ais_fields,
            include_pis_fields=include_pis_fields,
            include_credentials_fields=include_credentials_fields,
        )

        # Store/update provider in database
        await self._store_or_update_provider(db, response.data)

        return response

    # ---------- Payments ----------
    def create_payment(
        self, *, payload: CreatePaymentRequestBody
    ) -> PaymentCreateResponse:
        return self._api.payments.create(payload=payload)

    def list_payments(
        self,
        *,
        customer_id: str,
        from_id: Optional[str] = None,
        per_page: Optional[int] = None,
    ) -> PaymentsListResponse:
        return self._api.payments.list(
            customer_id=customer_id, from_id=from_id, per_page=per_page
        )

    def show_payment(self, *, payment_id: str) -> PaymentResponse:
        return self._api.payments.show(payment_id=payment_id)

    async def refresh_payment(
        self, db: AsyncSession, *, payment_id: str
    ) -> UpdatePaymentResponse:
        # Refresh payment status from SaltEdge API
        response = self._api.payments.refresh(payment_id=payment_id)

        # Note: Payment data storage would depend on your payment model structure
        # For now, just return the response

        return response

    # ---------- Helper methods for database storage ----------

    async def _store_or_update_customer(self, db: AsyncSession, customer_data) -> None:
        """Upsert a SaltEdge customer into the local database.

        Args:
            db: Async database session.
            customer_data: SaltEdge SDK customer model instance to persist.
        """
        customer_id = customer_data.customer_id  # Use string directly

        # Check if customer exists
        existing = await db.get(CustomerModel, customer_id)

        if existing:
            # Update existing customer
            existing.external_id = customer_data.customer_id
            if hasattr(customer_data, "identifier"):
                existing.identifier = customer_data.identifier
            # Update other fields as needed
        else:
            # Create new customer
            customer = CustomerModel(
                id=customer_id,
                external_id=customer_data.customer_id,
                identifier=getattr(customer_data, "identifier", None),
                email=getattr(customer_data, "email", None),
                categorization_type=getattr(
                    customer_data, "categorization_type", "personal"
                ),
            )
            db.add(customer)

        await db.commit()

    async def _store_or_update_connection(self, db: AsyncSession, connection_data) -> None:
        """Upsert a SaltEdge connection into the local database.

        Args:
            db: Async database session.
            connection_data: SaltEdge SDK ``Connection`` model instance to persist.
        """
        connection_id = connection_data.id
        customer_id = connection_data.customer_id

        last_attempt_raw = getattr(connection_data, "last_attempt", None)
        holder_info_raw = getattr(connection_data, "holder_info", None)

        fields: Dict[str, Any] = {
            "external_id": connection_data.id,
            "external_customer_id": connection_data.customer_id,
            "customer_identifier": getattr(connection_data, "customer_identifier", None),
            "customer_id": customer_id,
            "provider_code": connection_data.provider_code,
            "provider_name": connection_data.provider_name,
            "country_code": connection_data.country_code,
            "status": connection_data.status.value,
            "categorization": connection_data.categorization.value,
            "last_consent_id": getattr(connection_data, "last_consent_id", None),
            "automatic_refresh": getattr(connection_data, "automatic_refresh", False),
            "last_attempt": last_attempt_raw.model_dump(mode="json") if last_attempt_raw else None,
            "holder_info": holder_info_raw.model_dump(mode="json") if holder_info_raw else None,
        }

        existing = await db.get(ConnectionModel, connection_id)
        if existing:
            for attr, value in fields.items():
                setattr(existing, attr, value)
        else:
            db.add(ConnectionModel(id=connection_id, **fields))

        await db.commit()

    async def _store_or_update_account(
        self, db: AsyncSession, account_data, connection_id: str = None
    ) -> None:
        """Upsert a SaltEdge bank account into the local database.

        Args:
            db: Async database session.
            account_data: SaltEdge SDK account model instance to persist.
            connection_id: External SaltEdge connection ID.  If ``None``,
                the method attempts to read it from ``account_data.connection_id``.
        """
        account_id = account_data.id  # Use string directly

        # If connection_id not provided, try to get it from account_data
        if not connection_id and hasattr(account_data, "connection_id"):
            connection_id = account_data.connection_id

            # Look up the internal connection ID by external_id
        if connection_id:
            connection_query = select(ConnectionModel.id).where(
                ConnectionModel.external_id == connection_id
            )
            connection_result = await db.execute(connection_query)
            internal_connection_id = connection_result.scalar_one_or_none()

            if not internal_connection_id:
                # Connection doesn't exist, skip storing this account
                return
        else:
            internal_connection_id = None

        # Check if account exists
        existing = await db.get(BankAccountModel, account_id)

        if existing:
            # Update existing account
            existing.external_id = account_data.id
            existing.external_connection_id = connection_id
            existing.connection_id = internal_connection_id
            existing.name = account_data.name
            existing.nature = (
                account_data.nature.value
            )  # The value of this Enum variable needs to be retrieved using the .value attribute
            existing.balance = account_data.balance
            existing.currency_code = account_data.currency_code
            existing.extra = account_data.extra.model_dump(mode="json")
            # Update timestamps
        else:
            # Create new account
            account = BankAccountModel(
                id=account_id,
                external_id=account_data.id,
                external_connection_id=connection_id,
                connection_id=internal_connection_id,
                name=account_data.name,
                nature=account_data.nature.value,
                balance=account_data.balance,
                currency_code=account_data.currency_code,
                extra=account_data.extra.model_dump(mode="json"),
            )
            db.add(account)

        await db.commit()

    async def _store_or_update_transaction(self, db: AsyncSession, transaction_data) -> None:
        """Upsert a SaltEdge transaction into the local database.

        Bank-specific extras (``posting_date``, ``merchant_id``, ``mcc``,
        ``original_amount``, ``original_currency_code``) are not direct ORM
        columns; they are persisted inside the JSONB ``extra`` field via
        ``transaction_data.extra.model_dump()``.

        Args:
            db: Async database session.
            transaction_data: SaltEdge SDK transaction model instance to persist.
        """
        # Check if transaction exists by external ID
        existing = await db.execute(
            select(Transaction).where(Transaction.id == transaction_data.id)
        )
        existing = existing.scalar_one_or_none()

        if existing:
            # Update existing transaction — only write columns that exist on the
            # ORM model.  Bank-specific extras (posting_date, merchant_id, mcc,
            # original_amount, original_currency_code, …) are stored in the
            # JSONB `extra` column and must not be set as direct attributes.
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
            db.add(transaction)

        await db.commit()

    async def _store_or_update_consent(self, db: AsyncSession, consent_data) -> None:
        """Upsert a SaltEdge consent record into the local database.

        Args:
            db: Async database session.
            consent_data: SaltEdge SDK consent model instance to persist.
        """
        consent_id = consent_data.id  # Use string directly

        # Get connection_id - need to look up internal ID by external_id
        external_connection_id = consent_data.connection_id

        # Look up the internal connection ID by external_id
        if external_connection_id:
            connection_query = select(ConnectionModel.id).where(
                ConnectionModel.external_id == external_connection_id
            )
            connection_result = await db.execute(connection_query)
            internal_connection_id = connection_result.scalar_one_or_none()

            if not internal_connection_id:
                # Connection doesn't exist, skip storing this consent
                return
        else:
            internal_connection_id = None

        # Check if consent exists
        existing = await db.get(ConsentModel, consent_id)

        if existing:
            # Update existing consent
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
            # Create new consent
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
            db.add(consent)

        await db.commit()

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
        g = lambda attr, default=None: getattr(provider_data, attr, default)  # noqa: E731
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
            "supported_transaction_extra_fields": g("supported_transaction_extra_fields"),
            "payment_templates": g("payment_templates"),
            "instruction_for_payments": g("instruction_for_payments"),
            "interactive_for_payments": g("interactive_for_payments"),
            "no_funds_rejection_supported": g("no_funds_rejection_supported"),
            "required_payment_fields": g("required_payment_fields"),
            "supported_payment_fields": g("supported_payment_fields"),
            "credentials_fields": g("credentials_fields"),
            "interactive_fields": g("interactive_fields"),
        }

    async def _store_or_update_provider(self, db: AsyncSession, provider_data) -> None:
        """Upsert a SaltEdge provider into the local database.

        Args:
            db: Async database session.
            provider_data: SaltEdge SDK ``Provider`` model instance to persist.
        """
        fields = self._build_provider_fields(provider_data)
        existing = await db.get(ProviderModel, provider_data.code)

        if existing:
            for attr, value in fields.items():
                setattr(existing, attr, value)
        else:
            db.add(ProviderModel(id=provider_data.code, code=provider_data.code, **fields))

        await db.commit()
