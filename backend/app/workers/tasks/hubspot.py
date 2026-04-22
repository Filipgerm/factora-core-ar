"""Celery tasks for HubSpot polling / reconciliation (worker-owned DB session).

**Scope**
    HubSpot webhooks can drop messages — the developer-app subscription
    has a 5s delivery SLA after which HubSpot stops retrying. To make
    the mirror eventually-consistent without forcing tenants to
    reprovision, we run a periodic polling job that calls
    :meth:`HubspotSyncService.backfill_deals` for every active
    connection whose last sync is stale.

**Contract**
    * JSON-serializable args only — no OAuth tokens on the broker.
    * Each task opens its own :class:`AsyncSession`.
    * Idempotent: the sync service upserts on ``(organization_id,
      hubspot_id)`` so duplicate runs converge on the same state.

**Scheduling**
    Registered in the Celery beat schedule at ``hubspot.poll_connections``
    running every 15 minutes. The fan-out task picks each eligible
    connection and enqueues a per-connection backfill so one slow
    tenant cannot starve the others.

**Staleness policy**
    A connection is *stale* when all of the following hold:
        * ``disconnected_at IS NULL`` (still active).
        * ``last_webhook_at`` is either null or older than 1 hour
          (webhook delivery has gone quiet).
        * ``last_sync_at`` is either null or older than 1 hour.

    This threshold matches our revrec batch granularity — anything
    tighter would spam HubSpot unnecessarily, anything looser would
    risk missing closed-won signals until the next day.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import timedelta
from typing import Any

from sqlalchemy import or_, select

from app.db.models._utils import utcnow
from app.db.models.hubspot import HubspotConnection
from app.db.postgres import AsyncSessionLocal
from app.services.hubspot_connect_service import HubspotConnectService
from app.services.hubspot_sync_service import HubspotSyncService
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

_STALENESS_THRESHOLD_MIN = 60


async def _poll_connections_async() -> dict[str, Any]:
    """Iterate stale HubSpot connections and enqueue per-connection backfills."""
    threshold = utcnow() - timedelta(minutes=_STALENESS_THRESHOLD_MIN)
    async with AsyncSessionLocal() as session:
        stmt = select(HubspotConnection).where(
            HubspotConnection.disconnected_at.is_(None),
            or_(
                HubspotConnection.last_webhook_at.is_(None),
                HubspotConnection.last_webhook_at < threshold,
            ),
            or_(
                HubspotConnection.last_sync_at.is_(None),
                HubspotConnection.last_sync_at < threshold,
            ),
        )
        rows = (await session.scalars(stmt)).all()

    enqueued = 0
    for conn in rows:
        try:
            backfill_hubspot_connection.delay(str(conn.id))
            enqueued += 1
        except Exception:  # pragma: no cover — broker-level failure
            logger.exception("Failed to enqueue hubspot backfill for %s", conn.id)
    return {"stale": len(rows), "enqueued": enqueued}


@celery_app.task(
    name="hubspot.poll_connections",
    bind=True,
    max_retries=0,  # fan-out only; per-connection tasks retry on their own
)
def poll_hubspot_connections(self) -> dict[str, Any]:  # noqa: ARG001 — Celery signature
    """Periodic fan-out: find stale HubSpot connections and enqueue backfills."""
    return asyncio.run(_poll_connections_async())


async def _backfill_async(connection_id: str) -> dict[str, Any]:
    async with AsyncSessionLocal() as session:
        conn = await session.get(HubspotConnection, connection_id)
        if conn is None or conn.disconnected_at is not None:
            return {"ok": False, "reason": "connection_missing_or_disconnected"}

        connect_service = HubspotConnectService(session)
        try:
            client = connect_service.build_tenant_client(conn)
        except Exception as exc:  # pragma: no cover — decrypt/setup failure
            logger.warning("Failed to build HubSpot tenant client: %s", exc)
            return {"ok": False, "reason": "client_build_failed"}

        sync = HubspotSyncService(session, connection=conn, client=client)
        try:
            upserted = await sync.backfill_deals()
        except Exception as exc:
            logger.exception("HubSpot backfill failed for connection=%s", connection_id)
            await session.rollback()
            raise
        else:
            await session.commit()
            return {"ok": True, "connection_id": connection_id, "upserted_deals": upserted}


@celery_app.task(
    name="hubspot.backfill_connection",
    bind=True,
    max_retries=3,
    default_retry_delay=120,
)
def backfill_hubspot_connection(self, connection_id: str) -> dict[str, Any]:
    """Per-connection polling task — runs ``backfill_deals`` for one tenant."""
    try:
        return asyncio.run(_backfill_async(connection_id))
    except Exception as exc:  # noqa: BLE001 — Celery retry needs broad catch
        logger.exception(
            "HubSpot backfill task failed connection=%s task=%s",
            connection_id,
            self.request.id,
        )
        raise self.retry(exc=exc) from exc
