"""StripeConnectService — per-tenant Stripe Connect OAuth onboarding.

**Scope:** Build the Stripe Connect authorize URL, exchange the callback code
for a connected ``acct_xxx``, and persist a ``StripeAccountConnection`` row
scoped to the calling organization.

**Contract:** Accepts primitive inputs, returns ``StripeAccountConnection``
ORM rows or plain ``str`` URLs, raises ``AppError`` subclasses for failure
modes (never ``HTTPException`` — the controller maps exceptions).

**Architectural notes:**
    * **Standard** flow is the default: we only persist ``stripe_user_id``,
      ``scope`` and ``livemode`` — the tenant retains full ownership and
      Stripe routes events to our connected webhook endpoint. We never hold
      the tenant's secret API key.
    * **Express / Custom** flows (future) would return a ``refresh_token``
      which is encrypted at rest with :func:`encrypt_secret` (re-using
      ``GMAIL_TOKEN_ENCRYPTION_KEY`` as the at-rest key for OAuth tokens).
    * CSRF is enforced via a short-lived HS256 ``state`` JWT carrying
      ``(user_id, organization_id)``.
"""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.stripe.api.client import StripeClient

from app.config import settings
from app.core.exceptions import ExternalServiceError, ValidationError
from app.core.security.field_encryption import encrypt_secret
from app.core.security.jwt import (
    decode_stripe_connect_state,
    encode_stripe_connect_state,
)
from app.db.models.stripe_connect import StripeAccountConnection

logger = logging.getLogger(__name__)


class StripeConnectService:
    """Build authorize URL + complete Stripe Connect OAuth."""

    def __init__(self, db: AsyncSession, stripe_client: StripeClient) -> None:
        self._db = db
        self._client = stripe_client

    # ------------------------------------------------------------------
    # Authorize URL
    # ------------------------------------------------------------------

    def build_authorization_url(
        self, *, user_id: str, organization_id: str
    ) -> str:
        """Return the browser URL to start Stripe Connect consent."""
        client_id = (settings.STRIPE_CONNECT_CLIENT_ID or "").strip()
        redirect = (settings.STRIPE_CONNECT_REDIRECT_URI or "").strip()
        if not client_id:
            raise ValidationError(
                "Stripe Connect is not configured.",
                code="config.stripe_connect_missing",
                fields={"STRIPE_CONNECT_CLIENT_ID": "Required"},
            )
        if not redirect:
            raise ValidationError(
                "STRIPE_CONNECT_REDIRECT_URI is not configured.",
                code="config.stripe_connect_redirect_missing",
                fields={"STRIPE_CONNECT_REDIRECT_URI": "Set to backend callback URL"},
            )
        state = encode_stripe_connect_state(
            user_id=user_id, organization_id=organization_id
        )
        return self._client.build_connect_authorize_url(
            client_id=client_id,
            redirect_uri=redirect,
            state=state,
            scope=settings.STRIPE_CONNECT_SCOPE or "read_write",
        )

    # ------------------------------------------------------------------
    # OAuth callback
    # ------------------------------------------------------------------

    async def complete_oauth(
        self, *, code: str, state: str
    ) -> StripeAccountConnection:
        """Exchange Connect code → persist ``StripeAccountConnection`` row."""
        payload = decode_stripe_connect_state(state)
        user_id = str(payload["sub"])
        organization_id = str(payload["organization_id"])

        try:
            tokens = self._client.exchange_connect_authorization_code(code=code)
        except Exception as exc:
            logger.error("Stripe Connect token exchange failed: %s", exc)
            raise ExternalServiceError(
                "Failed to exchange Stripe Connect authorization code.",
                code="external.stripe_connect_oauth",
            ) from exc

        stripe_account_id = str(tokens.get("stripe_user_id") or "").strip()
        if not stripe_account_id:
            raise ExternalServiceError(
                "Stripe did not return a connected account id.",
                code="external.stripe_connect_oauth",
            )

        refresh = tokens.get("refresh_token") or None
        encrypted_refresh: str | None = None
        if refresh:
            try:
                encrypted_refresh = encrypt_secret(str(refresh))
            except ValueError as exc:
                raise ValidationError(
                    str(exc),
                    code="config.stripe_connect_encryption",
                    fields={"GMAIL_TOKEN_ENCRYPTION_KEY": "required"},
                ) from exc

        livemode = bool(tokens.get("livemode", True))
        scope = str(tokens.get("scope") or "read_write")
        token_type = tokens.get("token_type")

        existing = await self._db.scalar(
            select(StripeAccountConnection).where(
                StripeAccountConnection.organization_id == organization_id,
                StripeAccountConnection.stripe_account_id == stripe_account_id,
            )
        )
        if existing is not None:
            existing.scope = scope
            existing.livemode = livemode
            existing.token_type = token_type
            existing.disconnected_at = None
            existing.created_by_user_id = user_id
            if encrypted_refresh is not None:
                existing.refresh_token_encrypted = encrypted_refresh
            conn = existing
        else:
            conn = StripeAccountConnection(
                organization_id=organization_id,
                created_by_user_id=user_id,
                stripe_account_id=stripe_account_id,
                scope=scope,
                token_type=token_type,
                livemode=livemode,
                refresh_token_encrypted=encrypted_refresh,
            )
            self._db.add(conn)

        try:
            await self._db.commit()
            await self._db.refresh(conn)
        except Exception as exc:
            await self._db.rollback()
            logger.error("Failed to save Stripe Connect connection: %s", exc)
            raise ExternalServiceError(
                "Failed to save Stripe Connect connection.",
                code="db.error",
            ) from exc

        return conn

    # ------------------------------------------------------------------
    # Listing + disconnect
    # ------------------------------------------------------------------

    async def list_for_org(
        self, *, organization_id: str
    ) -> list[StripeAccountConnection]:
        rows = await self._db.scalars(
            select(StripeAccountConnection)
            .where(StripeAccountConnection.organization_id == organization_id)
            .order_by(StripeAccountConnection.connected_at.desc())
        )
        return list(rows)

    async def disconnect(
        self, *, organization_id: str, stripe_account_id: str
    ) -> StripeAccountConnection:
        row = await self._db.scalar(
            select(StripeAccountConnection).where(
                StripeAccountConnection.organization_id == organization_id,
                StripeAccountConnection.stripe_account_id == stripe_account_id,
            )
        )
        if row is None:
            raise ValidationError(
                "Stripe Connect account not found for this organization.",
                code="stripe_connect.not_found",
                fields={"stripe_account_id": stripe_account_id},
            )
        client_id = (settings.STRIPE_CONNECT_CLIENT_ID or "").strip()
        if client_id and self._client.is_configured():
            try:
                self._client.deauthorize_connected_account(
                    client_id=client_id, stripe_user_id=stripe_account_id
                )
            except Exception as exc:
                logger.warning(
                    "Stripe deauthorize failed (continuing with soft disconnect): %s",
                    exc,
                )
        from app.db.models._utils import utcnow

        row.disconnected_at = utcnow()
        await self._db.commit()
        await self._db.refresh(row)
        return row
