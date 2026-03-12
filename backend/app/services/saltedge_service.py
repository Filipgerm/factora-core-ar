from __future__ import annotations
from typing import Iterator, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, date

from app.config import Settings
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

    async def _store_or_update_customer(self, db: AsyncSession, customer_data):
        """Store or update a customer in the database."""
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

    async def _store_or_update_connection(self, db: AsyncSession, connection_data):
        """Store or update a connection in the database."""
        connection_id = connection_data.id  # Use string directly

        # Get customer_id from external_customer_id
        customer_id = connection_data.customer_id  # Use string directly

        # Check if connection exists
        existing = await db.get(ConnectionModel, connection_id)

        if existing:
            # Update existing connection
            existing.external_id = connection_data.id
            existing.external_customer_id = connection_data.customer_id
            existing.customer_id = customer_id
            existing.status = connection_data.status.value
            existing.categorization = connection_data.categorization.value
            # Update other fields
        else:
            # Create new connection
            connection = ConnectionModel(
                id=connection_id,
                external_id=connection_data.id,
                external_customer_id=connection_data.customer_id,
                customer_identifier=getattr(
                    connection_data, "customer_identifier", None
                ),
                customer_id=customer_id,
                provider_code=connection_data.provider_code,
                provider_name=connection_data.provider_name,
                country_code=connection_data.country_code,
                status=connection_data.status.value,
                categorization=connection_data.categorization.value,
                last_consent_id=getattr(connection_data, "last_consent_id", None),
                automatic_refresh=getattr(connection_data, "automatic_refresh", False),
                last_attempt=getattr(connection_data, "last_attempt", None)
                and connection_data.last_attempt.model_dump(mode="json"),
                holder_info=getattr(connection_data, "holder_info", None)
                and connection_data.holder_info.model_dump(mode="json"),
            )
            db.add(connection)

        await db.commit()

    async def _store_or_update_account(
        self, db: AsyncSession, account_data, connection_id: str = None
    ):
        """Store or update a bank account in the database."""
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

    async def _store_or_update_transaction(self, db: AsyncSession, transaction_data):
        """Store or update a transaction in the database."""
        # Check if transaction exists by external ID
        existing = await db.execute(
            select(Transaction).where(Transaction.id == transaction_data.id)
        )
        existing = existing.scalar_one_or_none()

        if existing:
            # Update existing transaction
            existing.status = transaction_data.status
            existing.mode = transaction_data.mode
            existing.duplicated = transaction_data.duplicated
            existing.made_on = (
                date.fromisoformat(transaction_data.made_on)
                if transaction_data.made_on
                else None
            )
            existing.posting_date = (
                date.fromisoformat(transaction_data.posting_date)
                if getattr(transaction_data, "posting_date", None)
                else None
            )
            existing.amount = transaction_data.amount
            existing.currency_code = transaction_data.currency_code
            existing.category = getattr(transaction_data, "category", None)
            existing.merchant_id = getattr(transaction_data, "merchant_id", None)
            existing.mcc = getattr(transaction_data, "mcc", None)
            existing.description = getattr(transaction_data, "description", None)
            existing.original_amount = getattr(
                transaction_data, "original_amount", None
            )
            existing.original_currency_code = getattr(
                transaction_data, "original_currency_code", None
            )
            existing.extra = transaction_data.extra.model_dump(mode="json")
        else:
            # Get account_id from transaction data
            account_id = transaction_data.account_id  # Use string directly

            # Create new transaction
            transaction = Transaction(
                id=transaction_data.id,
                account_id=account_id,
                status=transaction_data.status,
                mode=transaction_data.mode,
                duplicated=transaction_data.duplicated,
                made_on=(
                    date.fromisoformat(transaction_data.made_on)
                    if transaction_data.made_on
                    else None
                ),
                posting_date=(
                    date.fromisoformat(transaction_data.posting_date)
                    if getattr(transaction_data, "posting_date", None)
                    else None
                ),
                amount=transaction_data.amount,
                currency_code=transaction_data.currency_code,
                category=getattr(transaction_data, "category", None),
                merchant_id=getattr(transaction_data, "merchant_id", None),
                mcc=getattr(transaction_data, "mcc", None),
                description=getattr(transaction_data, "description", None),
                original_amount=getattr(transaction_data, "original_amount", None),
                original_currency_code=getattr(
                    transaction_data, "original_currency_code", None
                ),
                extra=transaction_data.extra.model_dump(mode="json"),
            )
            db.add(transaction)

        await db.commit()

    async def _store_or_update_consent(self, db: AsyncSession, consent_data):
        """Store or update a consent in the database."""
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

    async def _store_or_update_provider(self, db: AsyncSession, provider_data):
        """Store or update a provider in the database."""
        # Check if provider exists by code (since code is the primary key)
        existing = await db.get(ProviderModel, provider_data.code)

        if existing:
            # Update existing provider - update all fields
            existing.name = provider_data.name
            existing.country_code = provider_data.country_code
            existing.bic_codes = getattr(provider_data, "bic_codes", None)
            existing.identification_codes = getattr(
                provider_data, "identification_codes", None
            )
            existing.dynamic_registration_code = getattr(
                provider_data, "dynamic_registration_code", None
            )
            existing.group_code = getattr(provider_data, "group_code", None)
            existing.group_name = getattr(provider_data, "group_name", None)
            existing.hub = getattr(provider_data, "hub", None)
            existing.status = provider_data.status
            existing.mode = provider_data.mode
            existing.regulated = provider_data.regulated
            existing.logo_url = getattr(provider_data, "logo_url", None)
            existing.timezone = getattr(provider_data, "timezone", None)
            existing.supported_iframe_embedding = (
                provider_data.supported_iframe_embedding
            )
            existing.optional_interactivity = getattr(
                provider_data, "optional_interactivity", None
            )
            existing.customer_notified_on_sign_in = (
                provider_data.customer_notified_on_sign_in
            )
            existing.automatic_fetch = getattr(provider_data, "automatic_fetch", None)
            existing.custom_pendings_period = getattr(
                provider_data, "custom_pendings_period", None
            )
            existing.holder_info = getattr(provider_data, "holder_info", None)
            existing.instruction_for_connections = getattr(
                provider_data, "instruction_for_connections", None
            )
            existing.interactive_for_connections = getattr(
                provider_data, "interactive_for_connections", None
            )
            existing.max_consent_days = getattr(provider_data, "max_consent_days", None)
            existing.max_fetch_interval = getattr(
                provider_data, "max_fetch_interval", None
            )
            existing.fetch_policies = getattr(provider_data, "fetch_policies", None)
            existing.max_interactive_delay = getattr(
                provider_data, "max_interactive_delay", None
            )
            existing.refresh_timeout = getattr(provider_data, "refresh_timeout", None)
            existing.supported_account_extra_fields = getattr(
                provider_data, "supported_account_extra_fields", None
            )
            existing.supported_account_natures = getattr(
                provider_data, "supported_account_natures", None
            )
            existing.supported_account_types = getattr(
                provider_data, "supported_account_types", None
            )
            existing.supported_fetch_scopes = getattr(
                provider_data, "supported_fetch_scopes", None
            )
            existing.supported_transaction_extra_fields = getattr(
                provider_data, "supported_transaction_extra_fields", None
            )
            existing.payment_templates = getattr(
                provider_data, "payment_templates", None
            )
            existing.instruction_for_payments = getattr(
                provider_data, "instruction_for_payments", None
            )
            existing.interactive_for_payments = getattr(
                provider_data, "interactive_for_payments", None
            )
            existing.no_funds_rejection_supported = getattr(
                provider_data, "no_funds_rejection_supported", None
            )
            existing.required_payment_fields = getattr(
                provider_data, "required_payment_fields", None
            )
            existing.supported_payment_fields = getattr(
                provider_data, "supported_payment_fields", None
            )
            existing.credentials_fields = getattr(
                provider_data, "credentials_fields", None
            )
            existing.interactive_fields = getattr(
                provider_data, "interactive_fields", None
            )
        else:
            # Create new provider
            provider = ProviderModel(
                id=provider_data.code,  # code is the primary key
                code=provider_data.code,
                name=provider_data.name,
                country_code=provider_data.country_code,
                bic_codes=getattr(provider_data, "bic_codes", None),
                identification_codes=getattr(
                    provider_data, "identification_codes", None
                ),
                dynamic_registration_code=getattr(
                    provider_data, "dynamic_registration_code", None
                ),
                group_code=getattr(provider_data, "group_code", None),
                group_name=getattr(provider_data, "group_name", None),
                hub=getattr(provider_data, "hub", None),
                status=provider_data.status,
                mode=provider_data.mode,
                regulated=provider_data.regulated,
                logo_url=getattr(provider_data, "logo_url", None),
                timezone=getattr(provider_data, "timezone", None),
                supported_iframe_embedding=provider_data.supported_iframe_embedding,
                optional_interactivity=getattr(
                    provider_data, "optional_interactivity", None
                ),
                customer_notified_on_sign_in=provider_data.customer_notified_on_sign_in,
                automatic_fetch=getattr(provider_data, "automatic_fetch", None),
                custom_pendings_period=getattr(
                    provider_data, "custom_pendings_period", None
                ),
                holder_info=getattr(provider_data, "holder_info", None),
                instruction_for_connections=getattr(
                    provider_data, "instruction_for_connections", None
                ),
                interactive_for_connections=getattr(
                    provider_data, "interactive_for_connections", None
                ),
                max_consent_days=getattr(provider_data, "max_consent_days", None),
                max_fetch_interval=getattr(provider_data, "max_fetch_interval", None),
                fetch_policies=getattr(provider_data, "fetch_policies", None),
                max_interactive_delay=getattr(
                    provider_data, "max_interactive_delay", None
                ),
                refresh_timeout=getattr(provider_data, "refresh_timeout", None),
                supported_account_extra_fields=getattr(
                    provider_data, "supported_account_extra_fields", None
                ),
                supported_account_natures=getattr(
                    provider_data, "supported_account_natures", None
                ),
                supported_account_types=getattr(
                    provider_data, "supported_account_types", None
                ),
                supported_fetch_scopes=getattr(
                    provider_data, "supported_fetch_scopes", None
                ),
                supported_transaction_extra_fields=getattr(
                    provider_data, "supported_transaction_extra_fields", None
                ),
                payment_templates=getattr(provider_data, "payment_templates", None),
                instruction_for_payments=getattr(
                    provider_data, "instruction_for_payments", None
                ),
                interactive_for_payments=getattr(
                    provider_data, "interactive_for_payments", None
                ),
                no_funds_rejection_supported=getattr(
                    provider_data, "no_funds_rejection_supported", None
                ),
                required_payment_fields=getattr(
                    provider_data, "required_payment_fields", None
                ),
                supported_payment_fields=getattr(
                    provider_data, "supported_payment_fields", None
                ),
                credentials_fields=getattr(provider_data, "credentials_fields", None),
                interactive_fields=getattr(provider_data, "interactive_fields", None),
            )
            db.add(provider)

        await db.commit()
