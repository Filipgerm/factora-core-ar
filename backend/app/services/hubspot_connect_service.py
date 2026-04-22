"""HubspotConnectService — per-tenant HubSpot OAuth onboarding.

**Scope:** Build HubSpot authorize URLs, exchange the callback code for an
access+refresh token pair, resolve the portal id, and persist a
``HubspotConnection`` row scoped to the calling organization.

**Contract:** Accepts primitive inputs, returns ORM rows or plain ``str``
URLs. Raises :class:`app.core.exceptions.AppError` subclasses on failure
— the controller maps those to HTTP errors.

**Architectural notes:**
    * OAuth tokens are encrypted at rest with
      :func:`app.core.security.field_encryption.encrypt_secret` using
      ``GMAIL_TOKEN_ENCRYPTION_KEY``.
    * CSRF is enforced via a short-lived HS256 ``state`` JWT carrying
      ``(user_id, organization_id)``.
    * Connection uniqueness is ``(organization_id, hub_id)``: a single
      tenant can only link one portal to any given org at a time.
      Re-linking refreshes the token pair in-place.
    * Access-token refresh is the sync service's job — this service
      only owns the initial exchange.
"""

from __future__ import annotations

import logging
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.hubspot.api.client import HubspotClient, HubspotError

from app.config import settings
from app.core.exceptions import ExternalServiceError, ValidationError
from app.core.security.field_encryption import decrypt_secret, encrypt_secret
from app.core.security.jwt import (
    decode_hubspot_oauth_state,
    encode_hubspot_oauth_state,
)
from app.db.models._utils import utcnow
from app.db.models.hubspot import HubspotConnection

logger = logging.getLogger(__name__)


class HubspotConnectService:
    """Build authorize URL + complete HubSpot OAuth."""

    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._client = HubspotClient(
            client_id=settings.HUBSPOT_CLIENT_ID or None,
            client_secret=settings.HUBSPOT_CLIENT_SECRET or None,
        )

    # ------------------------------------------------------------------
    # Authorize URL
    # ------------------------------------------------------------------

    def build_authorization_url(
        self, *, user_id: str, organization_id: str
    ) -> str:
        """Return the browser URL to start HubSpot OAuth consent."""
        client_id = (settings.HUBSPOT_CLIENT_ID or "").strip()
        redirect = (settings.HUBSPOT_REDIRECT_URI or "").strip()
        scopes_str = (settings.HUBSPOT_OAUTH_SCOPES or "").strip()
        if not client_id:
            raise ValidationError(
                "HubSpot OAuth is not configured.",
                code="config.hubspot_client_id_missing",
                fields={"HUBSPOT_CLIENT_ID": "Required"},
            )
        if not redirect:
            raise ValidationError(
                "HUBSPOT_REDIRECT_URI is not configured.",
                code="config.hubspot_redirect_missing",
                fields={"HUBSPOT_REDIRECT_URI": "Set to backend callback URL"},
            )
        if not scopes_str:
            raise ValidationError(
                "HUBSPOT_OAUTH_SCOPES is not configured.",
                code="config.hubspot_scopes_missing",
                fields={"HUBSPOT_OAUTH_SCOPES": "Required"},
            )
        state = encode_hubspot_oauth_state(
            user_id=user_id, organization_id=organization_id
        )
        return self._client.build_authorize_url(
            redirect_uri=redirect,
            scopes=scopes_str.split(),
            state=state,
        )

    # ------------------------------------------------------------------
    # OAuth callback
    # ------------------------------------------------------------------

    async def complete_oauth(
        self, *, code: str, state: str
    ) -> HubspotConnection:
        """Exchange authorization code → persist ``HubspotConnection`` row."""
        payload = decode_hubspot_oauth_state(state)
        user_id = str(payload["sub"])
        organization_id = str(payload["organization_id"])

        redirect = (settings.HUBSPOT_REDIRECT_URI or "").strip()
        try:
            tokens = await self._client.exchange_code(
                code=code, redirect_uri=redirect
            )
        except HubspotError as exc:
            logger.error("HubSpot token exchange failed: %s", exc)
            raise ExternalServiceError(
                "Failed to exchange HubSpot authorization code.",
                code="external.hubspot_oauth",
            ) from exc

        try:
            info = await self._client.introspect_access_token(
                access_token=tokens.access_token
            )
        except HubspotError as exc:
            logger.error("HubSpot token introspection failed: %s", exc)
            raise ExternalServiceError(
                "Failed to introspect HubSpot access token.",
                code="external.hubspot_oauth",
            ) from exc

        try:
            enc_access = encrypt_secret(tokens.access_token)
            enc_refresh = encrypt_secret(tokens.refresh_token or "")
        except ValueError as exc:
            raise ValidationError(
                str(exc),
                code="config.hubspot_encryption",
                fields={"GMAIL_TOKEN_ENCRYPTION_KEY": "required"},
            ) from exc

        expires_at = utcnow() + timedelta(seconds=max(int(tokens.expires_in), 60))

        existing = await self._db.scalar(
            select(HubspotConnection).where(
                HubspotConnection.organization_id == organization_id,
                HubspotConnection.hub_id == info.hub_id,
            )
        )
        if existing is not None:
            existing.created_by_user_id = user_id
            existing.scopes = " ".join(info.scopes or [])
            existing.hub_domain = info.hub_domain
            existing.access_token_encrypted = enc_access
            existing.refresh_token_encrypted = enc_refresh
            existing.access_token_expires_at = expires_at
            existing.disconnected_at = None
            conn = existing
        else:
            conn = HubspotConnection(
                organization_id=organization_id,
                created_by_user_id=user_id,
                hub_id=info.hub_id,
                hub_domain=info.hub_domain,
                scopes=" ".join(info.scopes or []),
                access_token_encrypted=enc_access,
                refresh_token_encrypted=enc_refresh,
                access_token_expires_at=expires_at,
            )
            self._db.add(conn)

        try:
            await self._db.commit()
            await self._db.refresh(conn)
        except Exception as exc:
            await self._db.rollback()
            logger.error("Failed to save HubSpot connection: %s", exc)
            raise ExternalServiceError(
                "Failed to save HubSpot connection.", code="db.error"
            ) from exc

        return conn

    # ------------------------------------------------------------------
    # Listing + disconnect
    # ------------------------------------------------------------------

    async def list_for_org(
        self, *, organization_id: str
    ) -> list[HubspotConnection]:
        rows = await self._db.scalars(
            select(HubspotConnection)
            .where(HubspotConnection.organization_id == organization_id)
            .order_by(HubspotConnection.connected_at.desc())
        )
        return list(rows)

    # ------------------------------------------------------------------
    # Tenant-scoped client construction (for Sync / Bridge services)
    # ------------------------------------------------------------------

    def build_tenant_client(
        self, connection: HubspotConnection
    ) -> HubspotClient:
        """Return a ``HubspotClient`` bound to ``connection``'s tokens.

        Wires a 401-refresh hook that:
            1. Calls HubSpot's token endpoint with the stored refresh token.
            2. Re-encrypts the new access token via ``encrypt_secret``.
            3. Updates ``connection.access_token_encrypted`` and
               ``connection.access_token_expires_at`` on the current
               ``AsyncSession`` — the caller is responsible for the
               commit (same pattern as the rest of the service layer).
            4. Returns the plain-text new access token so the HTTP retry
               loop can swap it into the in-memory client.

        When the connection has no refresh token (e.g. imported from a
        legacy flow) the hook is omitted and 401s bubble unchanged.
        """
        access_token = decrypt_secret(connection.access_token_encrypted)
        refresh_token_plain: str | None = None
        if connection.refresh_token_encrypted:
            try:
                refresh_token_plain = decrypt_secret(
                    connection.refresh_token_encrypted
                )
            except Exception:  # pragma: no cover — treat as no-refresh
                refresh_token_plain = None

        async def _refresh() -> str:
            if not refresh_token_plain:
                raise ExternalServiceError(
                    "HubSpot connection has no refresh token.",
                    code="external.hubspot_oauth",
                )
            tokens = await self._client.refresh_access_token(
                refresh_token=refresh_token_plain
            )
            connection.access_token_encrypted = encrypt_secret(
                tokens.access_token
            )
            if tokens.refresh_token:
                connection.refresh_token_encrypted = encrypt_secret(
                    tokens.refresh_token
                )
            connection.access_token_expires_at = utcnow() + timedelta(
                seconds=max(int(tokens.expires_in), 60)
            )
            # Flush so the row is stamped on this session before the
            # retry uses the new token (commit is the caller's job).
            await self._db.flush()
            return tokens.access_token

        return HubspotClient(
            access_token=access_token,
            client_id=settings.HUBSPOT_CLIENT_ID or None,
            client_secret=settings.HUBSPOT_CLIENT_SECRET or None,
            refresh_access_token_hook=(
                _refresh if refresh_token_plain else None
            ),
        )

    async def disconnect(
        self, *, organization_id: str, hub_id: int
    ) -> HubspotConnection:
        row = await self._db.scalar(
            select(HubspotConnection).where(
                HubspotConnection.organization_id == organization_id,
                HubspotConnection.hub_id == hub_id,
            )
        )
        if row is None:
            raise ValidationError(
                "HubSpot connection not found for this organization.",
                code="hubspot_connect.not_found",
                fields={"hub_id": str(hub_id)},
            )
        row.disconnected_at = utcnow()
        await self._db.commit()
        await self._db.refresh(row)
        return row
