"""Webhook dispatch routing tests.

The webhook hot-path must:

1. Route ``customer.subscription_item.*`` events to ``apply_subscription_item``,
   NOT the broader ``customer.subscription`` handler (they share a prefix).
2. Enqueue a Celery follow-up when ``apply_charge`` cannot persist a row
   (missing metadata.organization_id).
3. Never instantiate the sync service with blocking Stripe calls enabled.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.stripe_webhook_service import StripeWebhookService


class _NoopDB:
    async def commit(self) -> None:
        return None


@pytest.mark.asyncio
@patch("app.services.stripe_webhook_service.StripeSyncService")
async def test_customer_subscription_item_routes_to_subscription_item_handler(
    mock_sync_cls: MagicMock,
) -> None:
    sync = AsyncMock()
    sync.apply_subscription_item = AsyncMock(return_value=True)
    sync.apply_subscription = AsyncMock(return_value=True)
    sync.apply_customer = AsyncMock(return_value=True)
    mock_sync_cls.return_value = sync

    svc = StripeWebhookService(_NoopDB())
    event = {
        "type": "customer.subscription_item.created",
        "data": {"object": {"id": "si_123", "metadata": {"organization_id": "o"}}},
    }
    ack = await svc.dispatch(event)
    assert ack.handled is True
    sync.apply_subscription_item.assert_awaited_once()
    sync.apply_subscription.assert_not_awaited()
    sync.apply_customer.assert_not_awaited()


@pytest.mark.asyncio
@patch("app.services.stripe_webhook_service.StripeSyncService")
async def test_customer_subscription_routes_to_subscription_handler(
    mock_sync_cls: MagicMock,
) -> None:
    sync = AsyncMock()
    sync.apply_subscription = AsyncMock(return_value=True)
    sync.apply_subscription_item = AsyncMock(return_value=True)
    mock_sync_cls.return_value = sync

    svc = StripeWebhookService(_NoopDB())
    event = {
        "type": "customer.subscription.updated",
        "data": {"object": {"id": "sub_1", "metadata": {"organization_id": "o"}}},
    }
    await svc.dispatch(event)
    sync.apply_subscription.assert_awaited_once()
    sync.apply_subscription_item.assert_not_awaited()


@pytest.mark.asyncio
@patch("app.services.stripe_webhook_service.StripeSyncService")
async def test_dispatch_constructs_sync_in_non_blocking_mode(
    mock_sync_cls: MagicMock,
) -> None:
    """The webhook never permits blocking Stripe HTTP round-trips."""
    sync = AsyncMock()
    sync.apply_invoice = AsyncMock(return_value=True)
    mock_sync_cls.return_value = sync

    svc = StripeWebhookService(_NoopDB())
    await svc.dispatch(
        {
            "type": "invoice.finalized",
            "data": {"object": {"id": "in_1", "metadata": {"organization_id": "o"}}},
        }
    )
    _, kwargs = mock_sync_cls.call_args
    assert kwargs["allow_blocking_stripe_calls"] is False


@pytest.mark.asyncio
@patch("app.services.stripe_webhook_service.StripeSyncService")
async def test_unhandled_charge_enqueues_celery_followup(
    mock_sync_cls: MagicMock,
) -> None:
    sync = AsyncMock()
    sync.apply_charge = AsyncMock(return_value=False)
    mock_sync_cls.return_value = sync

    enqueue_calls: list[str] = []

    svc = StripeWebhookService(_NoopDB())

    def _fake_enqueue(self: StripeWebhookService, charge: dict[str, Any]) -> None:
        enqueue_calls.append(charge["id"])

    with patch.object(StripeWebhookService, "_enqueue_charge_followup", _fake_enqueue):
        ack = await svc.dispatch(
            {
                "type": "charge.succeeded",
                "data": {"object": {"id": "ch_abc", "metadata": {}}},
            }
        )
    assert ack.handled is False
    assert enqueue_calls == ["ch_abc"]


@pytest.mark.asyncio
@patch("app.services.stripe_webhook_service.StripeSyncService")
async def test_handled_charge_does_not_enqueue(mock_sync_cls: MagicMock) -> None:
    sync = AsyncMock()
    sync.apply_charge = AsyncMock(return_value=True)
    mock_sync_cls.return_value = sync
    svc = StripeWebhookService(_NoopDB())
    enqueue_calls: list[str] = []
    with patch.object(
        StripeWebhookService,
        "_enqueue_charge_followup",
        lambda self, c: enqueue_calls.append(c["id"]),
    ):
        await svc.dispatch(
            {
                "type": "charge.succeeded",
                "data": {
                    "object": {"id": "ch_xyz", "metadata": {"organization_id": "o"}}
                },
            }
        )
    assert enqueue_calls == []
