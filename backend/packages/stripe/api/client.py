"""Stripe SDK wrapper — API key configuration, customers, payment intents, webhooks.

No application imports; callers supply keys and secrets explicitly.

**Hardening notes**
    The Stripe SDK already ships with bounded retries, ``stripe-request-id``
    capture, and rate-limit backoff. What it does NOT give you is a
    per-operation **idempotency key** — that's our responsibility because
    Stripe keys are scoped to the *logical operation* we're doing, not the
    HTTP retry. Wrapping writes in :meth:`_stripe_write` guarantees:

        1. Every write gets an idempotency key (caller-supplied or a UUID4
           fallback — ``idempotency_key=None`` is never passed to Stripe).
        2. ``stripe-request-id`` is captured from ``obj.last_response`` and
           logged through the shared outbound observability middleware so
           support tickets can be cross-referenced with Stripe dashboards.
"""
from __future__ import annotations

import logging
import time
import uuid
from typing import Any, Callable

import stripe

from packages._http import (
    log_outbound_request,
    log_outbound_response,
    new_correlation_id,
)
from packages.stripe.api.serialize import stripe_object_to_dict
from packages.stripe.api.webhooks import construct_verified_event

logger = logging.getLogger(__name__)


def _new_idempotency_key(prefix: str = "fact") -> str:
    """Return a random, high-entropy key Stripe will accept for dedup.

    Stripe requires keys ≤ 255 chars and recommends UUIDs. The short
    prefix makes server-side log-diving trivial (``grep fact_`` finds
    every one of our idempotent writes).
    """
    return f"{prefix}_{uuid.uuid4().hex}"


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

    # ------------------------------------------------------------------
    # Observability wrapper (every write flows through this)
    # ------------------------------------------------------------------

    def _stripe_write(
        self,
        op: str,
        call: Callable[..., Any],
        /,
        *,
        idempotency_key: str | None = None,
        **kwargs: Any,
    ) -> Any:
        """Invoke a Stripe write with idempotency + observability.

        Guarantees
        ----------
        * ``idempotency_key`` is always set on outgoing requests. When
          callers pass one (a bridge key derived from our domain id) it
          is used as-is; otherwise we generate a fresh UUID so the
          write is at worst "once per process call" rather than "every
          SDK retry re-charges".
        * ``stripe-request-id`` is captured from the returned object's
          ``last_response`` metadata and logged.

        Caller contract
        ---------------
        * ``op`` is a short, dot-delimited operation name (``customer.create``,
          ``tax.transaction.create_from_calculation``).
        * ``call`` is the raw SDK entrypoint (e.g.
          ``stripe.Customer.create``) — kwargs forward unchanged. The
          helper injects ``idempotency_key`` only when it is not already
          present in ``kwargs``.
        """
        kwargs.setdefault(
            "idempotency_key", idempotency_key or _new_idempotency_key()
        )
        correlation_id = new_correlation_id()
        start = time.perf_counter()
        log_outbound_request(
            integration="stripe",
            method="POST",
            url=f"https://api.stripe.com/<{op}>",
            correlation_id=correlation_id,
            extra={
                "op": op,
                "idempotency_key": kwargs["idempotency_key"],
            },
        )
        try:
            obj = call(**kwargs)
        except stripe.error.StripeError as exc:  # type: ignore[attr-defined]
            duration_ms = (time.perf_counter() - start) * 1000
            log_outbound_response(
                integration="stripe",
                method="POST",
                url=f"https://api.stripe.com/<{op}>",
                correlation_id=correlation_id,
                status=getattr(exc, "http_status", 0) or 0,
                duration_ms=duration_ms,
                remote_request_id=getattr(exc, "request_id", None),
                extra={"op": op, "error": exc.__class__.__name__},
            )
            raise
        duration_ms = (time.perf_counter() - start) * 1000
        last_resp = getattr(obj, "last_response", None)
        remote_rid = getattr(last_resp, "request_id", None) if last_resp else None
        http_status = getattr(last_resp, "code", None) if last_resp else None
        log_outbound_response(
            integration="stripe",
            method="POST",
            url=f"https://api.stripe.com/<{op}>",
            correlation_id=correlation_id,
            status=int(http_status or 200),
            duration_ms=duration_ms,
            remote_request_id=remote_rid,
            extra={"op": op},
        )
        return obj

    def create_customer(
        self,
        *,
        email: str,
        name: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        """Create a Stripe customer; returns a dict with at least ``id``.

        Pass ``idempotency_key`` when you can derive a deterministic one
        from your domain (e.g. ``f"cp_{counterparty_id}"``) so retries
        at the caller level don't create duplicate customers.
        """
        if not self.is_configured():
            return {"id": "stub_cus", "email": email, "name": name}
        cust = self._stripe_write(
            "customer.create",
            stripe.Customer.create,
            idempotency_key=idempotency_key,
            email=email,
            name=name,
        )
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
        # Meter events already carry Stripe's native ``identifier`` for
        # server-side dedup; we mirror it as the HTTP idempotency key so
        # retries at the HTTP layer collapse onto the same event.
        ev = self._stripe_write(
            "billing.meter_event.create",
            meter_event_cls.create,
            idempotency_key=f"meter_{identifier}" if identifier else None,
            **params,
        )
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
        idempotency_key: str | None = None,
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
        calc = self._stripe_write(
            "tax.calculation.create",
            calc_cls.create,
            idempotency_key=idempotency_key,
            **params,
        )
        return stripe_object_to_dict(calc)

    def create_tax_transaction_from_calculation(
        self,
        *,
        calculation: str,
        reference: str,
    ) -> dict[str, Any]:
        """Persist a Tax Calculation into a Tax Transaction (post-commit).

        ``reference`` is the caller's domain id (typically invoice id) —
        we reuse it as the idempotency key so a retry of the same
        invoice's tax posting lands on the same Stripe transaction.
        """
        if not self.is_configured():
            return {"id": "stub_tx", "reference": reference}
        tx_cls = getattr(getattr(stripe, "tax", None), "Transaction", None)
        if tx_cls is None or not hasattr(tx_cls, "create_from_calculation"):
            raise RuntimeError(
                "stripe.tax.Transaction is unavailable in this SDK version"
            )
        tx = self._stripe_write(
            "tax.transaction.create_from_calculation",
            tx_cls.create_from_calculation,
            idempotency_key=f"taxtx_{reference}",
            calculation=calculation,
            reference=reference,
        )
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
        pi = self._stripe_write(
            "payment_intent.create",
            stripe.PaymentIntent.create,
            **params,
        )
        return {
            "id": pi.id,
            "client_secret": getattr(pi, "client_secret", None),
            "amount": amount_cents,
            "currency": currency,
        }
