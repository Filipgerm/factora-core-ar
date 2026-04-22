"""StripeConnectController — orchestration for Stripe Connect OAuth flow.

Maps :class:`StripeConnectService` results to API responses and converts
the Standard OAuth callback into an HTTP redirect back to the frontend.
"""

from __future__ import annotations

import logging
from urllib.parse import urlencode

from fastapi.responses import RedirectResponse

from app.config import settings
from app.services.stripe_connect_service import StripeConnectService

logger = logging.getLogger(__name__)


def _safe_frontend_base() -> str:
    base = (settings.FRONTEND_BASE_URL or "").rstrip("/")
    return base or ""


class StripeConnectController:
    def __init__(self, service: StripeConnectService) -> None:
        self._service = service

    async def start(self, *, user_id: str, organization_id: str) -> dict[str, str]:
        url = self._service.build_authorization_url(
            user_id=user_id, organization_id=organization_id
        )
        return {"authorization_url": url}

    async def callback(self, *, code: str, state: str) -> RedirectResponse:
        """Complete OAuth then redirect the browser to the frontend."""
        base = _safe_frontend_base()
        try:
            conn = await self._service.complete_oauth(code=code, state=state)
        except Exception as exc:
            logger.exception("Stripe Connect OAuth callback failed")
            target = (
                f"{base}/settings/integrations/stripe?"
                + urlencode({"status": "error", "reason": str(exc)[:256]})
                if base
                else "/"
            )
            return RedirectResponse(url=target, status_code=302)

        target = (
            f"{base}/settings/integrations/stripe?"
            + urlencode(
                {
                    "status": "connected",
                    "account_id": conn.stripe_account_id,
                    "livemode": "true" if conn.livemode else "false",
                }
            )
            if base
            else "/"
        )
        return RedirectResponse(url=target, status_code=302)

    async def list_connections(
        self, *, organization_id: str
    ) -> list[dict[str, str | bool | None]]:
        rows = await self._service.list_for_org(organization_id=organization_id)
        return [
            {
                "id": r.id,
                "stripe_account_id": r.stripe_account_id,
                "scope": r.scope,
                "livemode": r.livemode,
                "connected_at": r.connected_at.isoformat() if r.connected_at else None,
                "disconnected_at": (
                    r.disconnected_at.isoformat() if r.disconnected_at else None
                ),
            }
            for r in rows
        ]

    async def disconnect(
        self, *, organization_id: str, stripe_account_id: str
    ) -> dict[str, str]:
        row = await self._service.disconnect(
            organization_id=organization_id,
            stripe_account_id=stripe_account_id,
        )
        return {
            "stripe_account_id": row.stripe_account_id,
            "disconnected_at": row.disconnected_at.isoformat()
            if row.disconnected_at
            else "",
        }
