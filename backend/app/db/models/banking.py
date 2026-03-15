"""Open Banking ORM models: accounts, connections, consents, customers, providers, transactions."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    ARRAY,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


# ---------------------------
# Customer
# ---------------------------
CUSTOMER_CATEGORIZATION = ("personal", "business")


class CustomerModel(Base):
    """A customer that has connected their bank accounts via SaltEdge."""

    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    external_id: Mapped[Optional[str]] = mapped_column(String, unique=True, nullable=True)
    identifier: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    categorization_type: Mapped[str] = mapped_column(String, nullable=False, default="personal")
    blocked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    kyc: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=func.now()
    )

    connections = relationship("ConnectionModel", back_populates="customer", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint(f"categorization_type IN {CUSTOMER_CATEGORIZATION}", name="customer_categorization_chk"),
        UniqueConstraint("identifier", name="uq_customers_identifier"),
        UniqueConstraint("email", name="uq_customers_email"),
        Index("ix_customers_identifier", "identifier"),
        Index("ix_customers_email", "email"),
    )

    def __repr__(self) -> str:
        return f"<Customer(id={self.id}, ext_id={self.external_id}, ident={self.identifier})>"


# ---------------------------
# Provider
# ---------------------------
PROVIDER_STATUS = ("active", "inactive", "disabled")
PROVIDER_MODE = ("oauth", "web", "api")
PROVIDER_ACCOUNT_TYPES = ("personal", "business")


class ProviderModel(Base):
    """A financial institution / bank provider available via SaltEdge."""

    __tablename__ = "providers"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    code: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    bic_codes: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    identification_codes: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    dynamic_registration_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    group_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    group_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    hub: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[str] = mapped_column(String, nullable=False)
    mode: Mapped[str] = mapped_column(String, nullable=False)
    regulated: Mapped[bool] = mapped_column(Boolean, nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    supported_iframe_embedding: Mapped[bool] = mapped_column(Boolean, nullable=False)
    optional_interactivity: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    customer_notified_on_sign_in: Mapped[bool] = mapped_column(Boolean, nullable=False)
    automatic_fetch: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, default=True)
    custom_pendings_period: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    holder_info: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    instruction_for_connections: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    interactive_for_connections: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    max_consent_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    max_fetch_interval: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, default=60)
    fetch_policies: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    max_interactive_delay: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    refresh_timeout: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    supported_account_extra_fields: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    supported_account_natures: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    supported_account_types: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    supported_fetch_scopes: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    supported_transaction_extra_fields: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    payment_templates: Mapped[Optional[list[str]]] = mapped_column(ARRAY(String), nullable=True)
    instruction_for_payments: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    interactive_for_payments: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    no_funds_rejection_supported: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    required_payment_fields: Mapped[Optional[list[dict]]] = mapped_column(ARRAY(JSONB), nullable=True)
    supported_payment_fields: Mapped[Optional[list[dict]]] = mapped_column(ARRAY(JSONB), nullable=True)
    credentials_fields: Mapped[Optional[list[dict]]] = mapped_column(ARRAY(JSONB), nullable=True)
    interactive_fields: Mapped[Optional[list[dict]]] = mapped_column(ARRAY(JSONB), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("char_length(country_code) = 2", name="provider_country_code_len_2"),
        CheckConstraint("country_code = upper(country_code)", name="provider_country_code_upper"),
        CheckConstraint(f"status IN {PROVIDER_STATUS}", name="provider_status_chk"),
        CheckConstraint(f"mode IN {PROVIDER_MODE}", name="provider_mode_chk"),
        Index("ix_providers_country_code", "country_code"),
        Index("ix_providers_status", "status"),
        Index("ix_providers_mode", "mode"),
        Index("ix_providers_regulated", "regulated"),
    )

    def __repr__(self) -> str:
        return f"<Provider(id={self.id}, code={self.code}, name={self.name}, status={self.status})>"


# ---------------------------
# Connection
# ---------------------------
CONNECTION_STATUS = ("active", "inactive", "disabled")
CONNECTION_CATEGORIZATION = ("none", "personal", "business")


class ConnectionModel(Base):
    """A seller's bank connection via SaltEdge."""

    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    external_customer_id: Mapped[str] = mapped_column(String, nullable=False)
    customer_identifier: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    customer_id: Mapped[str] = mapped_column(String, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    customer = relationship("CustomerModel", back_populates="connections")
    provider_code: Mapped[str] = mapped_column(String, nullable=False)
    provider_name: Mapped[str] = mapped_column(String, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False)
    categorization: Mapped[str] = mapped_column(String, nullable=False, default="none")
    categorization_vendor: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    automatic_refresh: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    next_refresh_possible_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_consent_id: Mapped[str] = mapped_column(String, nullable=False)
    last_attempt: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    holder_info: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=func.now())

    bank_accounts = relationship("BankAccountModel", back_populates="connection", cascade="all, delete-orphan")
    consents = relationship("ConsentModel", back_populates="connection", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("char_length(country_code) = 2", name="country_code_len_2"),
        CheckConstraint("country_code = upper(country_code)", name="country_code_upper"),
        CheckConstraint(f"status IN {CONNECTION_STATUS}", name="connection_status_chk"),
        CheckConstraint(f"categorization IN {CONNECTION_CATEGORIZATION}", name="connection_cat_chk"),
        Index("ix_connections_external_customer_id", "external_customer_id"),
        Index("ix_connections_provider_code", "provider_code"),
        Index("ix_connections_status", "status"),
        Index("ix_connections_auto_refresh", "automatic_refresh"),
    )

    def __repr__(self) -> str:
        return f"<Connection(id={self.id}, ext_id={self.external_id}, provider={self.provider_code}, status={self.status})>"


# ---------------------------
# Consent
# ---------------------------
CONSENT_STATUS = ("active", "expired", "revoked")
CONSENT_COLLECTED_BY = ("client", "saltedge")
CONSENT_REVOKE_REASON = ("expired", "client", "provider", "saltedge")


class ConsentModel(Base):
    """SaltEdge consent record — authorises access to a connection's accounts."""

    __tablename__ = "consents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    external_customer_id: Mapped[str] = mapped_column(String, nullable=False)
    external_connection_id: Mapped[str] = mapped_column(String, nullable=False)
    connection_id: Mapped[str] = mapped_column(String, ForeignKey("connections.id", ondelete="CASCADE"), nullable=False)
    connection = relationship("ConnectionModel", back_populates="consents")
    status: Mapped[str] = mapped_column(String, nullable=False)
    scopes: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    period_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    from_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    to_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    collected_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoke_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(f"status IN {CONSENT_STATUS}", name="consent_status_chk"),
        CheckConstraint(f"(collected_by IS NULL) OR (collected_by IN {CONSENT_COLLECTED_BY})", name="consent_collected_by_chk"),
        CheckConstraint(f"(revoke_reason IS NULL) OR (revoke_reason IN {CONSENT_REVOKE_REASON})", name="consent_revoke_reason_chk"),
        Index("ix_consents_connection_id", "connection_id"),
        Index("ix_consents_status", "status"),
        Index("ix_consents_expires_at", "expires_at"),
        Index("ix_consents_scopes_gin", "scopes"),
    )

    def __repr__(self) -> str:
        return f"<Consent(id={self.id}, ext_id={self.external_id}, status={self.status})>"


# ---------------------------
# BankAccount
# ---------------------------
class BankAccountModel(Base):
    """Bank account belonging to a buyer connected via open banking."""

    __tablename__ = "bank_accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: uuid.uuid4().hex)
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    external_connection_id: Mapped[str] = mapped_column(String, nullable=False)
    connection_id: Mapped[str] = mapped_column(String, ForeignKey("connections.id", ondelete="CASCADE"), nullable=False)
    connection = relationship("ConnectionModel", back_populates="bank_accounts")
    name: Mapped[str] = mapped_column(String, nullable=False)
    nature: Mapped[str] = mapped_column(String, nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    extra: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    transactions: Mapped[list["Transaction"]] = relationship("Transaction", back_populates="bank_account", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("external_id", "external_connection_id", name="uq_accounts_ext_per_conn"),
        CheckConstraint("char_length(currency_code) = 3", name="currency_code_len_3"),
        CheckConstraint("currency_code = upper(currency_code)", name="currency_code_uppercase"),
    )

    def __repr__(self) -> str:
        return f"<Account(id={self.id}, name={self.name}, nature={self.nature}, balance={self.balance})>"


# ---------------------------
# Transaction
# ---------------------------
class TransactionStatus(str, enum.Enum):
    posted = "posted"
    pending = "pending"


class TransactionMode(str, enum.Enum):
    normal = "normal"
    fee = "fee"
    transfer = "transfer"


class Transaction(Base):
    """Individual bank transaction synced from SaltEdge."""

    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    account_id: Mapped[str] = mapped_column(String, ForeignKey("bank_accounts.id", ondelete="CASCADE"), index=True, nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(Enum(TransactionStatus, name="transaction_status", native_enum=True), index=True, nullable=False)
    mode: Mapped[TransactionMode] = mapped_column(Enum(TransactionMode, name="transaction_mode", native_enum=True), index=True, nullable=False)
    duplicated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    made_on: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), default="EUR", nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    extra: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    bank_account: Mapped[BankAccountModel] = relationship("BankAccountModel", back_populates="transactions")

    __table_args__ = (
        Index("ix_transactions_extra_gin", extra, postgresql_using="gin", postgresql_ops={"extra": "jsonb_path_ops"}),
        Index("ix_transactions_account_made_on", "account_id", "made_on"),
        Index("ix_transactions_made_on_posted_only", "made_on", postgresql_where=(Text("status") == Text("'posted'"))),
    )
