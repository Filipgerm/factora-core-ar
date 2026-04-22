"""Stripe SDK wrapper — API key configuration, customers, payment intents, webhooks.

No application imports; callers supply keys and secrets explicitly.
"""
from __future__ import annotations

from typing import Any

import stripe

from packages.stripe.api.serialize import stripe_object_to_dict
from packages.stripe.api.webhooks import construct_verified_event


class StripeClient:
    """Thin Stripe SDK wrapper: module-level config + webhook verification."""

    def __init__(
        self,
        *,
        secret_key: str = "",
        api_version: str = "",
        webhook_secret: str = "",
    ) -> None:
        self._secret_key = secret_key
        self._api_version = api_version
        self._webhook_secret = webhook_secret
        self._apply_settings()

    def _apply_settings(self) -> None:
        if self._secret_key:
            stripe.api_key = self._secret_key
        if self._api_version:
            stripe.api_version = self._api_version

    def is_configured(self) -> bool:
        return bool(self._secret_key)

    def is_webhook_configured(self) -> bool:
        return bool(self._webhook_secret)

    def verify_webhook_event(self, payload: bytes, stripe_signature: str) -> dict[str, Any]:
        """Verify ``Stripe-Signature`` and return the event as a dict.

        Raises:
            stripe.error.SignatureVerificationError: Invalid signature or payload.
            ValueError: Webhook secret not configured.
        """
        if not self.is_webhook_configured():
            raise ValueError("STRIPE_WEBHOOK_SECRET is not configured")
        return construct_verified_event(
            payload, stripe_signature, self._webhook_secret
        )

    def create_customer(self, *, email: str, name: str | None = None) -> dict[str, Any]:
        """Create a Stripe customer; returns a dict with at least ``id``."""
        if not self.is_configured():
            return {"id": "stub_cus", "email": email, "name": name}
        cust = stripe.Customer.create(email=email, name=name)
        return {
            "id": cust.id,
            "email": getattr(cust, "email", email),
            "name": getattr(cust, "name", name),
        }

    def record_meter_event(
        self,
        *,
        event_name: str,
        payload: dict[str, Any],
        identifier: str | None = None,
        timestamp: int | None = None,
    ) -> dict[str, Any]:
        """Record a Stripe Billing meter event (usage ingestion).

        Args:
            event_name: The configured meter's ``event_name``.
            payload: Customer + value payload (e.g. ``{"stripe_customer_id": ..., "value": 1}``).
            identifier: Idempotency identifier; Stripe dedupes on this.
            timestamp: Unix seconds; defaults to Stripe server time.
        """
        if not self.is_configured():
            return {"identifier": identifier, "event_name": event_name, "stub": True}
        meter_event_cls = getattr(getattr(stripe, "billing", None), "MeterEvent", None)
        if meter_event_cls is None or not hasattr(meter_event_cls, "create"):
            raise RuntimeError("stripe.billing.MeterEvent is unavailable in this SDK version")
        params: dict[str, Any] = {"event_name": event_name, "payload": payload}
        if identifier:
            params["identifier"] = identifier
        if timestamp is not None:
            params["timestamp"] = timestamp
        ev = meter_event_cls.create(**params)
        return stripe_object_to_dict(ev)

    def list_meter_event_summaries(
        self,
        *,
        meter_id: str,
        customer: str,
        start_time: int,
        end_time: int,
        value_grouping_window: str | None = None,
    ) -> list[dict[str, Any]]:
        """List aggregated meter event summaries for a single customer."""
        if not self.is_configured():
            return []
        meter_cls = getattr(getattr(stripe, "billing", None), "Meter", None)
        if meter_cls is None or not hasattr(meter_cls, "list_event_summaries"):
            raise RuntimeError("stripe.billing.Meter is unavailable in this SDK version")
        params: dict[str, Any] = {
            "customer": customer,
            "start_time": start_time,
            "end_time": end_time,
        }
        if value_grouping_window:
            params["value_grouping_window"] = value_grouping_window
        res = meter_cls.list_event_summaries(meter_id, **params)
        data = getattr(res, "data", []) or []
        return [stripe_object_to_dict(r) for r in data]

    def create_tax_calculation(
        self,
        *,
        currency: str,
        line_items: list[dict[str, Any]],
        customer_details: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Call Stripe Tax API's Calculation endpoint."""
        if not self.is_configured():
            return {"id": "stub_txcalc", "currency": currency}
        calc_cls = getattr(getattr(stripe, "tax", None), "Calculation", None)
        if calc_cls is None or not hasattr(calc_cls, "create"):
            raise RuntimeError("stripe.tax.Calculation is unavailable in this SDK version")
        params: dict[str, Any] = {"currency": currency, "line_items": line_items}
        if customer_details:
            params["customer_details"] = customer_details
        calc = calc_cls.create(**params)
        return stripe_object_to_dict(calc)

    def create_tax_transaction_from_calculation(
        self,
        *,
        calculation: str,
        reference: str,
    ) -> dict[str, Any]:
        """Persist a Tax Calculation into a Tax Transaction (post-commit)."""
        if not self.is_configured():
            return {"id": "stub_tx", "reference": reference}
        tx_cls = getattr(getattr(stripe, "tax", None), "Transaction", None)
        if tx_cls is None or not hasattr(tx_cls, "create_from_calculation"):
            raise RuntimeError(
                "stripe.tax.Transaction is unavailable in this SDK version"
            )
        tx = tx_cls.create_from_calculation(calculation=calculation, reference=reference)
        return stripe_object_to_dict(tx)

    # ------------------------------------------------------------------
    # Stripe Connect OAuth
    # ------------------------------------------------------------------

    def build_connect_authorize_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        state: str,
        scope: str = "read_write",
    ) -> str:
        """Build Stripe Connect Standard OAuth authorize URL.

        Stripe's docs: https://docs.stripe.com/connect/oauth-reference
        """
        from urllib.parse import urlencode

        params = {
            "response_type": "code",
            "client_id": client_id,
            "scope": scope,
            "redirect_uri": redirect_uri,
            "state": state,
        }
        return "https://connect.stripe.com/oauth/authorize?" + urlencode(params)

    def exchange_connect_authorization_code(
        self, *, code: str
    ) -> dict[str, Any]:
        """Exchange Connect OAuth code → connected ``stripe_user_id``.

        Returns the raw ``OAuthToken`` object (``stripe_user_id``,
        ``access_token``, ``refresh_token``, ``scope``, ``livemode`` …).
        """
        if not self.is_configured():
            return {
                "stripe_user_id": "acct_stub",
                "access_token": "sk_stub",
                "refresh_token": "rt_stub",
                "livemode": False,
                "scope": "read_write",
                "token_type": "bearer",
                "stub": True,
            }
        oauth_cls = getattr(stripe, "OAuth", None)
        if oauth_cls is None or not hasattr(oauth_cls, "token"):
            raise RuntimeError("stripe.OAuth.token unavailable in this SDK version")
        tok = oauth_cls.token(grant_type="authorization_code", code=code)
        return stripe_object_to_dict(tok)

    def deauthorize_connected_account(
        self, *, client_id: str, stripe_user_id: str
    ) -> dict[str, Any]:
        """Revoke the platform's access to a connected account."""
        if not self.is_configured():
            return {"stripe_user_id": stripe_user_id, "stub": True}
        oauth_cls = getattr(stripe, "OAuth", None)
        if oauth_cls is None or not hasattr(oauth_cls, "deauthorize"):
            raise RuntimeError(
                "stripe.OAuth.deauthorize unavailable in this SDK version"
            )
        res = oauth_cls.deauthorize(
            client_id=client_id,
            stripe_user_id=stripe_user_id,
        )
        return stripe_object_to_dict(res)

    def create_payment_intent_stub(
        self,
        *,
        amount_cents: int,
        currency: str = "eur",
        customer_id: str | None = None,
    ) -> dict[str, Any]:
        """Create a PaymentIntent (test mode) — used by future checkout flows."""
        if not self.is_configured():
            return {
                "id": "stub_pi",
                "client_secret": "stub_secret",
                "amount": amount_cents,
                "currency": currency,
            }
        params: dict[str, Any] = {
            "amount": amount_cents,
            "currency": currency,
            "automatic_payment_methods": {"enabled": True},
        }
        if customer_id and not customer_id.startswith("stub_"):
            params["customer"] = customer_id
        pi = stripe.PaymentIntent.create(**params)
        return {
            "id": pi.id,
            "client_secret": getattr(pi, "client_secret", None),
            "amount": amount_cents,
            "currency": currency,
        }
