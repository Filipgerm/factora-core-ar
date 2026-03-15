from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase, relationship
from sqlalchemy.dialects.postgresql import JSONB, UUID as SAUUID, ARRAY
from sqlalchemy import (
    text,
    String,
    Boolean,
    DateTime,
    Date,
    Integer,
    ForeignKey,
    Index,
    UniqueConstraint,
    Numeric,
    CheckConstraint,
    func,
    Enum,
    Text,
    BigInteger,
)
from typing import Optional, List
import uuid, enum
from datetime import datetime, timezone, time, date
from decimal import Decimal
from app.db.base import Base


def utcnow() -> datetime:
    """Always return a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    bucket: Mapped[str] = mapped_column(String)
    path: Mapped[str] = mapped_column(String)
    original_name: Mapped[str] = mapped_column(String)
    content_type: Mapped[str | None] = mapped_column(String)
    size: Mapped[int] = mapped_column(Integer)
    public_url: Mapped[str | None] = mapped_column(String, nullable=True)
    _metadata: Mapped[dict] = mapped_column(JSONB, default=dict)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )


class OnboardingSession(Base):
    __tablename__ = "onboarding_sessions"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)

    # Attach session to the buyers being onboarded
    business_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id", ondelete="CASCADE"), index=True
    )

    # Lifecycle
    status: Mapped[str] = mapped_column(
        String(50), default="draft"
    )  # draft, completed, expired
    step: Mapped[str] = mapped_column(String(50), default="phone_started")

    # Phone verification data
    phone_number_e164: Mapped[str | None] = mapped_column(String(20))
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    phone_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Email verification data
    email_address: Mapped[str | None] = mapped_column(String(255))
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Onboarding data
    onboarding_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=utcnow,
        nullable=True,
    )

    buyers: Mapped[Buyers] = relationship(back_populates="onboarding_sessions")

    __table_args__ = (
        Index("ix_onboarding_status", "status"),
        Index("ix_onboarding_step", "step"),
    )


class VerificationSession(Base):
    __tablename__ = "verification_sessions"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)
    verification_id: Mapped[str] = mapped_column(String(100), unique=True)

    # Link to the onboarding session
    onboarding_session_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("onboarding_sessions.id", ondelete="CASCADE"), index=True
    )
    # Channel + target
    channel: Mapped[str] = mapped_column(String(20))  # phone, email
    target: Mapped[str] = mapped_column(String(255))  # phone number or email

    # Verification Code and usage
    code_hash: Mapped[str] = mapped_column(String(64))
    attempts: Mapped[int] = mapped_column(default=0)
    max_attempts: Mapped[int] = mapped_column(default=5)

    # Timing
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    last_sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # onboarding_session: Mapped[OnboardingSession] = relationship()
    __table_args__ = (
        Index(
            "ix_verification_sessions_onboarding_session_id", "onboarding_session_id"
        ),
        Index("ix_verification_channel", "channel"),
    )


# ---------------------------
# SELLERS: creds + contact in one place (no cross-table hopping)
# ---------------------------
class Sellers(Base):
    __tablename__ = "sellers"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)

    # Credentials (seller-only)
    username: Mapped[Optional[str]] = mapped_column(String(30))
    password_hash: Mapped[Optional[str]] = mapped_column(String(128))

    # Contact
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(10))
    email: Mapped[Optional[str]] = mapped_column(String(255), unique=True)

    # Status + auth/session metadata (seller-only)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # last_access_token / access_token_expires_at removed — sessions now live
    # in the seller_sessions table (one row per active session).

    # Password reset (seller-only)
    password_reset_token: Mapped[Optional[str]] = mapped_column(String(255))
    password_reset_expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True)
    )

    # Timestamps
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=utcnow,
        nullable=True,
    )

    # relationships

    buyers: Mapped[List["Buyers"]] = relationship(
        secondary="seller_buyers", back_populates="sellers"
    )


# ---------------------------
# SellerSessions: JWT refresh-token store for sellers
#
# One row per active session.  The JWT access token itself is stateless
# (30-min TTL) and is NOT stored here.  The refresh token is opaque and is
# persisted as its SHA-256 hash so a DB breach cannot replay it.
#
# jti_hash: SHA-256 of the JWT's `jti` claim — used only for immediate forced
#           logout (e.g. admin revocation, password change).  Normally NULL
#           because JWTs expire on their own after 30 minutes.
# ---------------------------
class SellerSessions(Base):
    """Stores one refresh-token per seller session for JWT-based auth."""

    __tablename__ = "seller_sessions"

    id: Mapped[str] = mapped_column(
        primary_key=True, default=lambda: uuid.uuid4().hex
    )
    seller_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sellers.id", ondelete="CASCADE"), index=True
    )

    # SHA-256 of the opaque refresh token returned to the client.
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    # SHA-256 of the current JWT's `jti` claim — enables forced revocation
    # without waiting for the 30-min access token TTL to expire.
    jti_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # When the refresh token expires (7-day TTL by default).
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )

    # Audit metadata
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    __table_args__ = (
        Index("ix_seller_sessions_expires_at", "expires_at"),
    )


# ---------------------------
# SellerBuyers: junction table for many-to-many Sellers-Buyers
# ---------------------------
class SellerBuyers(Base):
    __tablename__ = "seller_buyers"

    seller_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("sellers.id"), primary_key=True
    )
    buyer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id"), primary_key=True
    )


# ---------------------------
# BUYERS: buyer + business merged, plus contact (no password)
# ---------------------------
class Buyers(Base):
    __tablename__ = "buyers"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)

    # Onboarding status
    is_onboarding_complete: Mapped[bool] = mapped_column(Boolean, default=False)

    # Business data
    business_country: Mapped[Optional[str]] = mapped_column(String(100))
    business_info: Mapped[Optional[dict]] = mapped_column(JSONB)
    shareholders: Mapped[Optional[dict]] = mapped_column(JSONB)

    # Contact (kept here for easy viewing in Supabase)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20))
    country_code: Mapped[Optional[str]] = mapped_column(String(10))
    email: Mapped[Optional[str]] = mapped_column(String(255))

    # Timestamps
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=True
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        server_default=text("now()"),
        onupdate=utcnow,
        nullable=True,
    )

    # Relationships
    sellers: Mapped[List["Sellers"]] = relationship(
        secondary="seller_buyers", back_populates="buyers"
    )

    onboarding_sessions: Mapped[List["OnboardingSession"]] = relationship(
        back_populates="buyers", cascade="all, delete-orphan"
    )
    alerts: Mapped[List["Alerts"]] = relationship(
        back_populates="buyers", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("email", name="uq_buyers_email"),
        Index("ix_buyer_email", "email"),
        Index("ix_buyer_phone", "phone_number"),
    )


# ---------------------------
# BankAccount: bank account of the business buyer integrated via open banking
# ---------------------------
class BankAccountModel(Base):
    __tablename__ = "bank_accounts"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: uuid.uuid4().hex
    )

    # upstream ids
    external_id: Mapped[str] = mapped_column(
        String, unique=True, nullable=False
    )  # The id that we get from the server's response
    external_connection_id: Mapped[str] = mapped_column(String, nullable=False)

    # internal FK to your connections table
    connection_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    connection = relationship("ConnectionModel", back_populates="bank_accounts")

    name: Mapped[str] = mapped_column(String, nullable=False)
    nature: Mapped[str] = mapped_column(String, nullable=False)
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    extra: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    transactions: Mapped[list[Transaction]] = relationship(
        "Transaction", back_populates="bank_account", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint(
            "external_id", "external_connection_id", name="uq_accounts_ext_per_conn"
        ),
        CheckConstraint("char_length(currency_code) = 3", name="currency_code_len_3"),
        CheckConstraint(
            "currency_code = upper(currency_code)", name="currency_code_uppercase"
        ),
    )

    def __repr__(self) -> str:
        return f"<Account(id={self.id}, name={self.name}, nature={self.nature}, balance={self.balance})>"


# ---------------------------
# Connection: A user's connection to saltedge to authorize access from accounts from a specific provider.
# ---------------------------
CONNECTION_STATUS = ("active", "inactive", "disabled")
CONNECTION_CATEGORIZATION = ("none", "personal", "business")


class ConnectionModel(Base):
    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: uuid.uuid4().hex
    )

    # upstream identifiers
    external_id: Mapped[str] = mapped_column(
        String, unique=True, nullable=False
    )  # provider's Connection.id
    external_customer_id: Mapped[str] = mapped_column(
        String, nullable=False
    )  # provider's customer_id
    customer_identifier: Mapped[str] = mapped_column(
        String, nullable=True
    )  # your external/customer ref

    customer_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
    )
    customer = relationship("CustomerModel", back_populates="connections")

    # provider info
    provider_code: Mapped[str] = mapped_column(String, nullable=False)
    provider_name: Mapped[str] = mapped_column(String, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)

    # status / categorization
    status: Mapped[str] = mapped_column(
        String, nullable=False
    )  # active | inactive | disabled
    categorization: Mapped[str] = mapped_column(
        String, nullable=False, default="none"
    )  # none | personal | business
    categorization_vendor: Mapped[str | None] = mapped_column(String, nullable=True)

    # refresh & consent
    automatic_refresh: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    next_refresh_possible_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_consent_id: Mapped[str] = mapped_column(String, nullable=False)

    # nested objects kept as JSONB
    last_attempt: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    holder_info: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )
    bank_accounts = relationship(
        "BankAccountModel", back_populates="connection", cascade="all, delete-orphan"
    )

    consents = relationship(
        "ConsentModel", back_populates="connection", cascade="all, delete-orphan"
    )

    __table_args__ = (
        # country_code as strict ISO-3166 alpha-2 uppercase
        CheckConstraint("char_length(country_code) = 2", name="country_code_len_2"),
        CheckConstraint(
            "country_code = upper(country_code)", name="country_code_upper"
        ),
        # status & categorization whitelists
        CheckConstraint(f"status IN {CONNECTION_STATUS}", name="connection_status_chk"),
        CheckConstraint(
            f"categorization IN {CONNECTION_CATEGORIZATION}", name="connection_cat_chk"
        ),
        # helpful indexes
        Index("ix_connections_external_customer_id", "external_customer_id"),
        Index("ix_connections_provider_code", "provider_code"),
        Index("ix_connections_status", "status"),
        Index("ix_connections_auto_refresh", "automatic_refresh"),
    )

    def __repr__(self) -> str:
        return (
            f"<Connection(id={self.id}, ext_id={self.external_id}, "
            f"provider={self.provider_code}, status={self.status})>"
        )


# ---------------------------
# Consent: A user's consent to authorize access from accounts from a specific provider.
# ---------------------------
CONSENT_STATUS = ("active", "expired", "revoked")
CONSENT_COLLECTED_BY = ("client", "saltedge")
CONSENT_REVOKE_REASON = ("expired", "client", "provider", "saltedge")


class ConsentModel(Base):
    __tablename__ = "consents"

    # internal PK
    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: uuid.uuid4().hex
    )

    # upstream identifiers
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    external_customer_id: Mapped[str] = mapped_column(String, nullable=False)
    external_connection_id: Mapped[str] = mapped_column(String, nullable=False)
    # FK to your internal connections table
    connection_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("connections.id", ondelete="CASCADE"),
        nullable=False,
    )
    connection = relationship("ConnectionModel", back_populates="consents")

    # core fields
    status: Mapped[str] = mapped_column(
        String, nullable=False
    )  # active | expired | revoked
    scopes: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False
    )  # e.g. ["accounts","transactions"]

    period_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # timing
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    from_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    to_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # collection / revocation
    collected_by: Mapped[str | None] = mapped_column(
        String, nullable=True
    )  # client | saltedge
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoke_reason: Mapped[str | None] = mapped_column(
        String, nullable=True
    )  # expired | client | provider | saltedge

    # audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    __table_args__ = (
        CheckConstraint(f"status IN {CONSENT_STATUS}", name="consent_status_chk"),
        CheckConstraint(
            f"(collected_by IS NULL) OR (collected_by IN {CONSENT_COLLECTED_BY})",
            name="consent_collected_by_chk",
        ),
        CheckConstraint(
            f"(revoke_reason IS NULL) OR (revoke_reason IN {CONSENT_REVOKE_REASON})",
            name="consent_revoke_reason_chk",
        ),
        Index("ix_consents_connection_id", "connection_id"),
        Index("ix_consents_status", "status"),
        Index("ix_consents_expires_at", "expires_at"),
        Index(
            "ix_consents_scopes_gin", "scopes"
        ),  # useful for WHERE scopes @> ARRAY['transactions']
    )

    def __repr__(self) -> str:
        return (
            f"<Consent(id={self.id}, ext_id={self.external_id}, status={self.status})>"
        )


# ---------------------------
# Customer: A customer that has connected their accounts from a specific provider.
# ---------------------------
CUSTOMER_CATEGORIZATION = ("personal", "business")


class CustomerModel(Base):
    __tablename__ = "customers"

    # internal PK
    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: uuid.uuid4().hex
    )

    # Salt Edge "customer_id"
    external_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)

    # Your app’s stable handle for the user (ClientCustomer)
    identifier: Mapped[str | None] = mapped_column(String, nullable=True)

    # PartnerCustomer variant
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    categorization_type: Mapped[str] = mapped_column(
        String, nullable=False, default="personal"
    )
    blocked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    kyc: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    # relationships
    connections = relationship(
        "ConnectionModel", back_populates="customer", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            f"categorization_type IN {CUSTOMER_CATEGORIZATION}",
            name="customer_categorization_chk",
        ),
        # If you want one of (identifier|email) to be present, enforce at app level; DB can’t easily express XOR.
        UniqueConstraint("identifier", name="uq_customers_identifier"),
        UniqueConstraint("email", name="uq_customers_email"),
        Index("ix_customers_identifier", "identifier"),
        Index("ix_customers_email", "email"),
    )

    def __repr__(self) -> str:
        return f"<Customer(id={self.id}, ext_id={self.external_id}, ident={self.identifier}, email={self.email})>"


# ---------------------------
# Provider: A financial provider from Salt Edge API
# ---------------------------
PROVIDER_STATUS = ("active", "inactive", "disabled")
PROVIDER_MODE = ("oauth", "web", "api")
PROVIDER_ACCOUNT_TYPES = ("personal", "business")


class ProviderModel(Base):
    __tablename__ = "providers"

    # Salt Edge provider ID (string format)
    id: Mapped[str] = mapped_column(String, primary_key=True)

    # Basic provider info
    code: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    country_code: Mapped[str] = mapped_column(String(2), nullable=False)

    # Provider metadata
    bic_codes: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    identification_codes: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )

    # Optional grouping info
    dynamic_registration_code: Mapped[str | None] = mapped_column(String, nullable=True)
    group_code: Mapped[str | None] = mapped_column(String, nullable=True)
    group_name: Mapped[str | None] = mapped_column(String, nullable=True)
    hub: Mapped[str | None] = mapped_column(String, nullable=True)

    # Status and mode
    status: Mapped[str] = mapped_column(String, nullable=False)
    mode: Mapped[str] = mapped_column(String, nullable=False)
    regulated: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # Branding
    logo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    timezone: Mapped[str | None] = mapped_column(String, nullable=True)

    # Capabilities
    supported_iframe_embedding: Mapped[bool] = mapped_column(Boolean, nullable=False)
    optional_interactivity: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    customer_notified_on_sign_in: Mapped[bool] = mapped_column(Boolean, nullable=False)

    # Automatic fetch settings
    automatic_fetch: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=True
    )
    custom_pendings_period: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Holder info capabilities
    holder_info: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)

    # Connection instructions
    instruction_for_connections: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    interactive_for_connections: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True
    )

    # Consent settings
    max_consent_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_fetch_interval: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=60
    )

    # Fetch policies (stored as JSONB)
    fetch_policies: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Interactive settings
    max_interactive_delay: Mapped[int | None] = mapped_column(Integer, nullable=True)
    refresh_timeout: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Supported fields and types
    supported_account_extra_fields: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    supported_account_natures: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    supported_account_types: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    supported_fetch_scopes: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    supported_transaction_extra_fields: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )

    # Payment capabilities
    payment_templates: Mapped[list[str] | None] = mapped_column(
        ARRAY(String), nullable=True
    )
    instruction_for_payments: Mapped[str | None] = mapped_column(String, nullable=True)
    interactive_for_payments: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True
    )
    no_funds_rejection_supported: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True
    )

    # Required and supported payment fields (stored as JSONB)
    required_payment_fields: Mapped[list[dict] | None] = mapped_column(
        ARRAY(JSONB), nullable=True
    )
    supported_payment_fields: Mapped[list[dict] | None] = mapped_column(
        ARRAY(JSONB), nullable=True
    )

    # Credentials and interactive fields (stored as JSONB)
    credentials_fields: Mapped[list[dict] | None] = mapped_column(
        ARRAY(JSONB), nullable=True
    )
    interactive_fields: Mapped[list[dict] | None] = mapped_column(
        ARRAY(JSONB), nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    __table_args__ = (
        # Country code validation (ISO 3166-1 alpha-2 uppercase)
        CheckConstraint(
            "char_length(country_code) = 2", name="provider_country_code_len_2"
        ),
        CheckConstraint(
            "country_code = upper(country_code)", name="provider_country_code_upper"
        ),
        # Status and mode validation
        CheckConstraint(f"status IN {PROVIDER_STATUS}", name="provider_status_chk"),
        CheckConstraint(f"mode IN {PROVIDER_MODE}", name="provider_mode_chk"),
        # Indexes for common queries
        Index("ix_providers_country_code", "country_code"),
        Index("ix_providers_status", "status"),
        Index("ix_providers_mode", "mode"),
        Index("ix_providers_regulated", "regulated"),
    )

    def __repr__(self) -> str:
        return f"<Provider(id={self.id}, code={self.code}, name={self.name}, status={self.status})>"


# ---------------------------
# Transactions: the total transactions of a connection.
# ---------------------------
class TransactionStatus(str, enum.Enum):
    posted = "posted"
    pending = "pending"


class TransactionMode(str, enum.Enum):
    normal = "normal"
    fee = "fee"
    transfer = "transfer"


class Transaction(Base):
    __tablename__ = "transactions"

    # core identifiers
    id: Mapped[str] = mapped_column(String, primary_key=True)  # SaltEdge id or your own
    account_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("bank_accounts.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # status/mode
    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus, name="transaction_status", native_enum=True),
        index=True,
        nullable=False,
    )
    mode: Mapped[TransactionMode] = mapped_column(
        Enum(TransactionMode, name="transaction_mode", native_enum=True),
        index=True,
        nullable=False,
    )

    duplicated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # time axes
    made_on: Mapped[date] = mapped_column(
        Date, index=True, nullable=False
    )  # booking/operation date

    # money
    amount: Mapped[float] = mapped_column(
        Numeric(18, 2), nullable=False
    )  # signed; +inflow / -outflow
    currency_code: Mapped[str] = mapped_column(String(3), default="EUR", nullable=False)

    # categorization / merchant
    category: Mapped[str | None] = mapped_column(String, index=True)

    # description
    description: Mapped[str | None] = mapped_column(Text)

    # raw SaltEdge extras (long-tail, bank-specific)
    extra: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    # audit
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    bank_account: Mapped[BankAccountModel] = relationship(
        "BankAccountModel", back_populates="transactions"
    )

    __table_args__ = (
        Index(
            "ix_transactions_extra_gin",
            extra,
            postgresql_using="gin",
            postgresql_ops={"extra": "jsonb_path_ops"},
        ),
        # Compound index for the main windowed scans
        Index("ix_transactions_account_made_on", "account_id", "made_on"),
        # Partial index to speed up typical analytics that only consider posted rows
        Index(
            "ix_transactions_made_on_posted_only",
            "made_on",
            postgresql_where=(Text("status") == Text("'posted'")),
        ),
    )


# ---------------------------
# Alerts: Dynamic Alerts being shown for sudden changes in the financial health of a business.
# ---------------------------


class AlertSeverity(str, enum.Enum):
    high = "high"
    normal = "normal"
    low = "low"


class Alerts(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)

    business_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id", ondelete="CASCADE"), index=True
    )

    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )

    type: Mapped[str] = mapped_column(String)
    severity_level: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alert_severity", native_enum=True)
    )
    trigger_source: Mapped[str] = mapped_column(String)

    buyers: Mapped[Buyers] = relationship(back_populates="alerts")

    __table_args__ = (
        Index("ix_alerts_business_id", "business_id"),
        Index("ix_alerts_type", "type"),
        Index("ix_alerts_severity_level", "severity_level"),
    )


# ---------------------------`
# OnboardingToken: Secure tokens for onboarding links
# ---------------------------
class OnboardingToken(Base):
    __tablename__ = "onboarding_tokens"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)

    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    buyer_id: Mapped[str] = mapped_column(
        String(32), ForeignKey("buyers.id", ondelete="CASCADE"), index=True
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )

    buyer: Mapped[Buyers] = relationship("Buyers")

    __table_args__ = (
        Index("ix_onboarding_tokens_token", "token"),
        Index("ix_onboarding_tokens_buyer_id", "buyer_id"),
        Index("ix_onboarding_tokens_expires_at", "expires_at"),
    )


# ---------------------------
# AADE Documents: Raw and normalized storage for myDATA documents
# ---------------------------
class AadeDocumentModel(Base):
    """
    Stores raw AADE myDATA document responses (XML + JSON) with metadata.
    Links to buyers for multi-tenant support.
    """

    __tablename__ = "aade_documents"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)

    # Link to buyer (business entity)
    buyer_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("buyers.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Raw data storage
    raw_xml: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # Original XML response
    raw_json: Mapped[dict] = mapped_column(
        JSONB, default=dict
    )  # Parsed JSON representation

    # Query metadata
    query_params: Mapped[dict] = mapped_column(
        JSONB, default=dict
    )  # Original query parameters

    # Continuation token for pagination
    continuation_token: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Timestamps
    fetched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    # Relationships
    buyer: Mapped[Buyers] = relationship("Buyers")
    invoices: Mapped[List["AadeInvoiceModel"]] = relationship(
        "AadeInvoiceModel", back_populates="document", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_aade_documents_buyer_id", "buyer_id"),
        Index("ix_aade_documents_fetched_at", "fetched_at"),
    )

    def __repr__(self) -> str:
        return f"<AadeDocument(id={self.id}, buyer_id={self.buyer_id}, fetched_at={self.fetched_at})>"


class InvoiceDirection(str, enum.Enum):
    """Direction of invoice: received (issued to me) or transmitted (issued by me)."""

    RECEIVED = "received"
    TRANSMITTED = "transmitted"


class AadeInvoiceModel(Base):
    """
    Normalized invoice data extracted from AADE documents for efficient querying.
    Stores key invoice fields plus full normalized data in JSONB.
    """

    __tablename__ = "aade_invoices"

    id: Mapped[str] = mapped_column(primary_key=True, default=lambda: uuid.uuid4().hex)

    # Foreign key to parent document
    document_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("aade_documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    # Invoice direction: received (from RequestDocs) or transmitted (from RequestTransmittedDocs)
    direction: Mapped[InvoiceDirection] = mapped_column(
        Enum(InvoiceDirection, name="invoice_direction", native_enum=True),
        nullable=False,
        default=InvoiceDirection.RECEIVED,
    )

    # Key invoice identifiers
    uid: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    mark: Mapped[int | None] = mapped_column(BigInteger, unique=True, nullable=True)
    authentication_code: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Party information
    issuer_vat: Mapped[str | None] = mapped_column(
        String(20), nullable=True, index=True
    )
    issuer_country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    issuer_branch: Mapped[int | None] = mapped_column(Integer, nullable=True)

    counterpart_vat: Mapped[str | None] = mapped_column(
        String(20), nullable=True, index=True
    )
    counterpart_country: Mapped[str | None] = mapped_column(String(2), nullable=True)
    counterpart_branch: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Invoice header
    series: Mapped[str | None] = mapped_column(String(50), nullable=True)
    aa: Mapped[str | None] = mapped_column(String(50), nullable=True)
    issue_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    invoice_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, index=True
    )
    currency: Mapped[str | None] = mapped_column(String(3), nullable=True)

    # Financial totals
    total_net_value: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    total_vat_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 2), nullable=True
    )
    total_gross_value: Mapped[Decimal | None] = mapped_column(
        Numeric(18, 2), nullable=True
    )

    # Full normalized invoice data (for detailed queries)
    normalized_data: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, server_default=text("now()")
    )

    # Relationships
    document: Mapped[AadeDocumentModel] = relationship(
        "AadeDocumentModel", back_populates="invoices"
    )

    __table_args__ = (
        Index("ix_aade_invoices_document_id", "document_id"),
        Index("ix_aade_invoices_uid", "uid"),
        Index("ix_aade_invoices_mark", "mark"),
        Index("ix_aade_invoices_issue_date", "issue_date"),
        Index("ix_aade_invoices_invoice_type", "invoice_type"),
        Index("ix_aade_invoices_issuer_vat", "issuer_vat"),
        Index("ix_aade_invoices_counterpart_vat", "counterpart_vat"),
        # Composite index for common queries
        Index("ix_aade_invoices_date_type", "issue_date", "invoice_type"),
    )

    def __repr__(self) -> str:
        return f"<AadeInvoice(id={self.id}, mark={self.mark}, issue_date={self.issue_date})>"
