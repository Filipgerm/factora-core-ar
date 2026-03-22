"""Identity domain ORM models.

Tables:
  - organizations  — tenant root; replaces the old ``sellers`` table
  - users          — operator / human account; carries RBAC role
  - user_sessions  — refresh-token store; replaces ``seller_sessions``
"""
from __future__ import annotations

import enum
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.models._utils import utcnow


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class UserRole(str, enum.Enum):
    """RBAC roles for users within an organization."""

    OWNER = "owner"
    ADMIN = "admin"
    EXTERNAL_ACCOUNTANT = "external_accountant"
    VIEWER = "viewer"


# ---------------------------------------------------------------------------
# Organization  (tenant root)
# ---------------------------------------------------------------------------


class Organization(Base):
    """A business tenant.  Every resource belongs to exactly one organization.

    ``registry_data`` stores raw JSON fetched from GEMI (Greek business
    registry) or equivalent national registries.
    """

    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    vat_number: Mapped[str] = mapped_column(String(30), nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False, comment="ISO 3166-1 alpha-2")
    registry_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    # Relationships
    users: Mapped[list[User]] = relationship(
        "User",
        back_populates="organization",
        cascade="all, delete-orphan",
    )
    user_memberships: Mapped[list["UserOrganizationMembership"]] = relationship(
        "UserOrganizationMembership",
        back_populates="organization",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_organizations_vat_country", "vat_number", "country"),
    )


# ---------------------------------------------------------------------------
# User  (operator / human account)
# ---------------------------------------------------------------------------


class User(Base):
    """A human operator who belongs to an organization and carries an RBAC role.

    ``google_id`` is populated when the user authenticates via Google OAuth.
    ``password_hash`` is nullable to support pure Google-SSO accounts.
    """

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    username: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    phone_number: Mapped[str | None] = mapped_column(String(30), nullable=True)

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole", create_type=True),
        nullable=False,
        default=UserRole.OWNER,
    )

    # FK to organizations — nullable so a freshly-registered user can exist
    # before they complete organization setup.
    organization_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    phone_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Password reset — stored as SHA-256 hash, never plaintext
    password_reset_token: Mapped[str | None] = mapped_column(String(64), nullable=True)
    password_reset_expires_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    updated_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow
    )

    # Relationships
    organization: Mapped[Organization | None] = relationship(
        "Organization",
        back_populates="users",
    )
    organization_memberships: Mapped[list["UserOrganizationMembership"]] = relationship(
        "UserOrganizationMembership",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[list[UserSession]] = relationship(
        "UserSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_google_id", "google_id"),
    )


# ---------------------------------------------------------------------------
# User–organization membership (multi-tenant; active org remains on User)
# ---------------------------------------------------------------------------


class UserOrganizationMembership(Base):
    """Links a user to an organization with a role (supports multiple orgs per user)."""

    __tablename__ = "user_organization_memberships"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole", create_type=False),
        nullable=False,
    )
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )

    user: Mapped[User] = relationship("User", back_populates="organization_memberships")
    organization: Mapped[Organization] = relationship(
        "Organization",
        back_populates="user_memberships",
    )

    __table_args__ = (
        UniqueConstraint("user_id", "organization_id", name="uq_user_organization_membership"),
    )


# ---------------------------------------------------------------------------
# UserSession  (refresh-token store)
# ---------------------------------------------------------------------------


class UserSession(Base):
    """Persisted refresh-token entry.  Replaces the old ``seller_sessions`` table.

    ``token_hash``  — SHA-256 of the opaque refresh token (never stored raw).
    ``jti_hash``    — SHA-256 of the JWT JTI claim for forced revocation.
    """

    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    jti_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    expires_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True), nullable=False, default=utcnow
    )
    last_used_at: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped[User] = relationship("User", back_populates="sessions")

    __table_args__ = (
        Index("ix_user_sessions_token_hash", "token_hash"),
        Index("ix_user_sessions_expires_at", "expires_at"),
    )
