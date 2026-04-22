"""Celery tasks for Stripe reconciliation work that would otherwise block the webhook.

**Scope:**
    * Resolve ``organization_id`` for balance-transaction / charge events that
      arrive without ``metadata.organization_id`` (requires a live Stripe
      ``Charge.retrieve`` round-trip).
    * Fetch + persist a ``BalanceTransaction`` referenced by id on a
      ``charge.*`` event when the webhook payload only has the id.

**Contract:** JSON-serializable payloads only; opens a fresh ``AsyncSession``
per task. Returns a dict summarising what was persisted.

**Architectural notes:** Webhook ack latency is sacred — we ack within 50 ms
and enqueue these fallbacks to Celery so Stripe never retries us because of
our own egress blocking. Tasks are idempotent (upsert by ``stripe_id``).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import stripe

from app.config import settings
from app.db.postgres import AsyncSessionLocal
from app.services.stripe_sync_service import StripeSyncService
from app.workers.celery_app import celery_app
from packages.stripe.api.serialize import stripe_object_to_dict

logger = logging.getLogger(__name__)


async def _resync_charge_balance_async(charge_id: str) -> dict[str, Any]:
    """Retrieve a Charge, persist its BalanceTransaction via the sync service."""
    if not settings.STRIPE_SECRET_KEY:
        return {"ok": False, "reason": "stripe_unconfigured"}
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        ch = await asyncio.to_thread(
            lambda: stripe.Charge.retrieve(
                charge_id, expand=["payment_intent", "balance_transaction"]
            )
        )
    except Exception as exc:
        logger.warning("stripe charge retrieve failed charge=%s err=%s", charge_id, exc)
        return {"ok": False, "reason": "retrieve_failed"}

    charge_d = stripe_object_to_dict(ch)
    bt = charge_d.get("balance_transaction")

    async with AsyncSessionLocal() as session:
        svc = StripeSyncService(
            session, organization_id=None, allow_blocking_stripe_calls=True
        )
        persisted = False
        if isinstance(bt, dict) and bt.get("object") == "balance_transaction":
            persisted = await svc.apply_balance_transaction(bt)
        elif isinstance(bt, str):
            try:
                full = await asyncio.to_thread(
                    lambda: stripe.BalanceTransaction.retrieve(bt)
                )
            except Exception as exc:
                logger.warning("balance_transaction retrieve failed id=%s err=%s", bt, exc)
                return {"ok": False, "reason": "bt_retrieve_failed"}
            persisted = await svc.apply_balance_transaction(full)
        await session.commit()
    return {"ok": persisted, "charge_id": charge_id}


@celery_app.task(
    name="stripe.resync_charge_balance",
    bind=True,
    max_retries=5,
    default_retry_delay=30,
)
def resync_charge_balance(self, charge_id: str) -> dict[str, Any]:
    """Off-webhook fallback: fetch Charge → persist its BalanceTransaction."""
    try:
        return asyncio.run(_resync_charge_balance_async(charge_id))
    except Exception as exc:  # noqa: BLE001 — Celery retry needs broad catch
        logger.exception("resync_charge_balance failed charge_id=%s", charge_id)
        raise self.retry(exc=exc) from exc


async def _resync_balance_transaction_async(balance_tx_id: str) -> dict[str, Any]:
    if not settings.STRIPE_SECRET_KEY:
        return {"ok": False, "reason": "stripe_unconfigured"}
    stripe.api_key = settings.STRIPE_SECRET_KEY
    try:
        bt = await asyncio.to_thread(lambda: stripe.BalanceTransaction.retrieve(balance_tx_id))
    except Exception as exc:
        logger.warning("balance_transaction retrieve failed id=%s err=%s", balance_tx_id, exc)
        return {"ok": False, "reason": "retrieve_failed"}

    async with AsyncSessionLocal() as session:
        svc = StripeSyncService(
            session, organization_id=None, allow_blocking_stripe_calls=True
        )
        persisted = await svc.apply_balance_transaction(bt)
        await session.commit()
    return {"ok": persisted, "balance_tx_id": balance_tx_id}


@celery_app.task(
    name="stripe.resync_balance_transaction",
    bind=True,
    max_retries=5,
    default_retry_delay=30,
)
def resync_balance_transaction(self, balance_tx_id: str) -> dict[str, Any]:
    """Off-webhook fallback for orphan balance_transaction rows."""
    try:
        return asyncio.run(_resync_balance_transaction_async(balance_tx_id))
    except Exception as exc:  # noqa: BLE001
        logger.exception("resync_balance_transaction failed id=%s", balance_tx_id)
        raise self.retry(exc=exc) from exc
