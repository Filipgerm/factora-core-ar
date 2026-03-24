"""Tests for Stripe mirror sync, webhooks, and Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from stripe import SignatureVerificationError

from app.controllers.stripe_controller import StripeController
from app.dependencies import get_stripe_client, get_stripe_webhook_service
from app.main import app
from app.core.exceptions import StripeError
from packages.stripe.api.client import StripeClient
from packages.stripe.api.serialize import stripe_object_to_dict
from packages.stripe.models import (
    StripeBalanceSnapshotResponse,
    StripeBalanceTransactionResponse,
    StripeCustomerResponse,
    StripeInvoiceResponse,
    StripeSyncStatsResponse,
    StripeWebhookAckResponse,
)
from app.services.stripe_sync_service import StripeSyncService, metadata_org
from app.services.stripe_webhook_service import StripeWebhookService


def _stripe_db_mock() -> AsyncMock:
    """AsyncSession mock with a synchronous ``add`` (ORM insert side effects)."""
    db = AsyncMock()
    db.add = MagicMock()
    return db


def test_stripe_object_to_dict_plain() -> None:
    assert stripe_object_to_dict({"a": 1}) == {"a": 1}
    assert stripe_object_to_dict(None) == {}


def test_metadata_org() -> None:
    oid = str(uuid.uuid4())
    assert metadata_org({"metadata": {"organization_id": oid}}) == oid
    assert metadata_org({}) is None


@pytest.mark.asyncio
async def test_apply_customer_insert() -> None:
    db = _stripe_db_mock()
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=res)
    org = str(uuid.uuid4())
    svc = StripeSyncService(db, organization_id=None)
    ok = await svc.apply_customer(
        {
            "id": "cus_123",
            "email": "a@b.com",
            "metadata": {"organization_id": org},
            "created": 1_700_000_000,
        }
    )
    assert ok is True
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_apply_customer_wrong_org_pull_context() -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    other = str(uuid.uuid4())
    svc = StripeSyncService(db, organization_id=org)
    ok = await svc.apply_customer(
        {"id": "cus_x", "metadata": {"organization_id": other}}
    )
    assert ok is False
    db.add.assert_not_called()


@pytest.mark.asyncio
async def test_apply_balance_transaction_insert() -> None:
    db = _stripe_db_mock()
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=res)
    org = str(uuid.uuid4())
    svc = StripeSyncService(db, organization_id=None)
    ok = await svc.apply_balance_transaction(
        {
            "id": "txn_1",
            "amount": 500,
            "currency": "eur",
            "fee": 10,
            "net": 490,
            "created": 1_700_000_000,
            "metadata": {"organization_id": org},
        }
    )
    assert ok is True
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_apply_invoice_with_line() -> None:
    db = _stripe_db_mock()
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=res)
    org = str(uuid.uuid4())
    svc = StripeSyncService(db, organization_id=None)
    ok = await svc.apply_invoice(
        {
            "id": "in_1",
            "customer": "cus_1",
            "metadata": {"organization_id": org},
            "lines": {
                "data": [
                    {
                        "id": "il_1",
                        "amount": 1000,
                        "currency": "eur",
                        "type": "invoiceitem",
                        "price": {"id": "price_1", "product": "prod_1"},
                    }
                ]
            },
        }
    )
    assert ok is True
    assert db.add.call_count >= 2


@pytest.mark.asyncio
async def test_apply_tax_rate_percentage() -> None:
    db = _stripe_db_mock()
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=res)
    org = str(uuid.uuid4())
    svc = StripeSyncService(db, organization_id=None)
    ok = await svc.apply_tax_rate(
        {
            "id": "txr_1",
            "percentage": 24.0,
            "metadata": {"organization_id": org},
        }
    )
    assert ok is True
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_apply_charge_balance_transaction_expanded() -> None:
    db = _stripe_db_mock()
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=res)
    org = str(uuid.uuid4())
    svc = StripeSyncService(db, organization_id=None)
    ok = await svc.apply_charge(
        {
            "id": "ch_1",
            "balance_transaction": {
                "object": "balance_transaction",
                "id": "txn_bt",
                "amount": 100,
                "currency": "eur",
                "fee": 0,
                "net": 100,
                "metadata": {"organization_id": org},
            },
        }
    )
    assert ok is True


@pytest.mark.asyncio
async def test_webhook_dispatch_customer() -> None:
    db = AsyncMock()
    org = str(uuid.uuid4())
    wh = StripeWebhookService(db)
    event = {
        "type": "customer.created",
        "data": {
            "object": {
                "id": "cus_w",
                "metadata": {"organization_id": org},
            }
        },
    }
    with patch.object(StripeSyncService, "apply_customer", new_callable=AsyncMock) as ac:
        ac.return_value = True
        out = await wh.dispatch(event)
    assert isinstance(out, StripeWebhookAckResponse)
    assert out.handled is True
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_webhook_dispatch_unknown_event() -> None:
    db = AsyncMock()
    wh = StripeWebhookService(db)
    out = await wh.dispatch({"type": "unknown.event", "data": {"object": {}}})
    assert out.handled is False
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_controller_webhook_invalid_signature() -> None:
    from app.core.exceptions import ClientBadRequestError

    db = AsyncMock()
    wh = StripeWebhookService(
        db,
        app_settings=SimpleNamespace(STRIPE_WEBHOOK_SECRET="whsec_test"),
    )
    with patch(
        "app.services.stripe_webhook_service.stripe.Webhook.construct_event",
        side_effect=SignatureVerificationError("bad", "hdr"),
    ):
        with pytest.raises(ClientBadRequestError):
            await wh.process_webhook(b"{}", "v1 sig")


@pytest.mark.asyncio
async def test_controller_webhook_missing_sig() -> None:
    from app.core.exceptions import ClientBadRequestError

    wh = StripeWebhookService(
        AsyncMock(),
        app_settings=SimpleNamespace(STRIPE_WEBHOOK_SECRET="whsec_test"),
    )
    with pytest.raises(ClientBadRequestError):
        await wh.process_webhook(b"{}", None)


@pytest.mark.asyncio
async def test_controller_webhook_ok() -> None:
    wh = AsyncMock()
    wh.process_webhook = AsyncMock(
        return_value=StripeWebhookAckResponse(
            received=True,
            handled=True,
            event_type="customer.updated",
        )
    )
    ctrl = StripeController(MagicMock(), wh, MagicMock())
    out = await ctrl.ingest_webhook(b"{}", "v1 abc")
    assert out.handled is True
    wh.process_webhook.assert_awaited_once_with(b"{}", "v1 abc")


@pytest.mark.asyncio
async def test_pull_sync_customers_page(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())

    class Page:
        def __init__(self) -> None:
            self.has_more = False
            self.data = [
                {
                    "id": "cus_p1",
                    "metadata": {"organization_id": org},
                }
            ]

    async def fake_to_thread(fn, *args, **kwargs):
        return Page()

    monkeypatch.setattr(
        "app.services.stripe_sync_service.asyncio.to_thread",
        fake_to_thread,
    )
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=res)

    with patch("app.services.stripe_sync_service.settings") as s:
        s.STRIPE_SECRET_KEY = "sk_test"
        svc = StripeSyncService(db, organization_id=org)
        stats = await svc.sync_customers(page_size=10, max_pages=1)
    assert isinstance(stats, StripeSyncStatsResponse)
    assert stats.fetched == 1
    assert stats.upserted == 1
    db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_require_stripe_unconfigured() -> None:
    db = AsyncMock()
    with patch("app.services.stripe_sync_service.settings") as s:
        s.STRIPE_SECRET_KEY = ""
        svc = StripeSyncService(db, organization_id=str(uuid.uuid4()))
        from app.core.exceptions import StripeError

        with pytest.raises(StripeError):
            await svc.sync_customers()


def test_pydantic_balance_transaction_response() -> None:
    uid = uuid.uuid4()
    oid = uuid.uuid4()
    now = datetime.now(timezone.utc)
    row = SimpleNamespace(
        id=str(uid),
        organization_id=str(oid),
        stripe_id="txn_x",
        stripe_metadata={},
        raw_stripe_object={},
        deleted_at=None,
        created_at=now,
        updated_at=now,
        amount=10,
        currency="eur",
        description=None,
        fee=0,
        net=10,
        status="available",
        type="charge",
        reporting_category=None,
        source="ch_1",
        stripe_created=now,
        available_on=now,
        exchange_rate=None,
    )
    m = StripeBalanceTransactionResponse.model_validate(row)
    assert m.stripe_id == "txn_x"
    assert m.amount == 10


def test_get_stripe_client_singleton() -> None:
    a = get_stripe_client()
    b = get_stripe_client()
    assert a is b


def _stripe_webhook_service_with_secret() -> StripeWebhookService:
    return StripeWebhookService(
        AsyncMock(),
        app_settings=SimpleNamespace(STRIPE_WEBHOOK_SECRET="whsec_test"),
    )


@pytest.mark.asyncio
async def test_stripe_webhook_route_bad_signature() -> None:
    app.dependency_overrides[get_stripe_webhook_service] = _stripe_webhook_service_with_secret
    transport = ASGITransport(app=app)
    try:
        with patch(
            "app.services.stripe_webhook_service.stripe.Webhook.construct_event",
            side_effect=SignatureVerificationError("x", "sig"),
        ):
            async with AsyncClient(transport=transport, base_url="http://localhost") as client:
                r = await client.post(
                    "/v1/stripe/webhook",
                    content=b'{"x":1}',
                    headers={"stripe-signature": "t=1,v1=abc"},
                )
                assert r.status_code == 400
    finally:
        app.dependency_overrides.pop(get_stripe_webhook_service, None)


@pytest.mark.asyncio
async def test_stripe_webhook_route_success() -> None:
    ev = MagicMock()
    ev.to_dict_recursive = lambda: {
        "type": "customer.created",
        "data": {"object": {"id": "cus_a", "metadata": {}}},
    }
    async_dispatch = AsyncMock(
        return_value=StripeWebhookAckResponse(
            received=True, event_type="customer.created", handled=False
        )
    )
    app.dependency_overrides[get_stripe_webhook_service] = _stripe_webhook_service_with_secret
    transport = ASGITransport(app=app)
    try:
        with (
            patch(
                "app.services.stripe_webhook_service.stripe.Webhook.construct_event",
                return_value=ev,
            ),
            patch.object(StripeWebhookService, "dispatch", async_dispatch),
        ):
            async with AsyncClient(transport=transport, base_url="http://localhost") as client:
                r = await client.post(
                    "/v1/stripe/webhook",
                    content=b"{}",
                    headers={"stripe-signature": "v1 x"},
                )
                assert r.status_code == 200, r.text
                body = r.json()
                assert body.get("received") is True
    finally:
        app.dependency_overrides.pop(get_stripe_webhook_service, None)


@pytest.mark.asyncio
async def test_list_customers_mirror() -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    row = SimpleNamespace(
        id=str(uuid.uuid4()),
        organization_id=org,
        stripe_id="cus_l",
        email="x@y.com",
        name="N",
        phone=None,
        description=None,
        balance=None,
        currency="eur",
        delinquent=None,
        invoice_prefix=None,
        tax_exempt=None,
        default_source=None,
        address=None,
        stripe_created=now,
        stripe_metadata={},
        raw_stripe_object={},
        deleted_at=None,
        created_at=now,
        updated_at=now,
    )
    res = MagicMock()
    res.scalars.return_value.all.return_value = [row]
    db.execute = AsyncMock(return_value=res)
    svc = StripeSyncService(db, organization_id=org)
    out = await svc.list_customers_mirror(limit=10)
    assert len(out) == 1
    assert isinstance(out[0], StripeCustomerResponse)


@pytest.mark.asyncio
async def test_apply_payout_and_product_updates() -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    existing = SimpleNamespace()
    res = MagicMock()
    res.scalar_one_or_none.return_value = existing
    db.execute = AsyncMock(return_value=res)
    svc = StripeSyncService(db, organization_id=None)
    await svc.apply_payout(
        {
            "id": "po_1",
            "amount": 2000,
            "currency": "eur",
            "metadata": {"organization_id": org},
        }
    )
    res.scalar_one_or_none.return_value = None
    await svc.apply_product(
        {
            "id": "prod_1",
            "name": "P",
            "metadata": {"organization_id": org},
        }
    )
    db.add.assert_called()


@pytest.mark.asyncio
async def test_apply_subscription_deleted() -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    row = SimpleNamespace(deleted_at=None, updated_at=None)
    res = MagicMock()
    res.scalar_one_or_none.return_value = row
    db.execute = AsyncMock(return_value=res)
    svc = StripeSyncService(db, organization_id=None)
    await svc.apply_subscription(
        {"id": "sub_1", "metadata": {"organization_id": org}},
        deleted=True,
    )
    assert row.deleted_at is not None


@pytest.mark.asyncio
async def test_webhook_invoice_voided() -> None:
    db = AsyncMock()
    wh = StripeWebhookService(db)
    org = str(uuid.uuid4())
    event = {
        "type": "invoice.voided",
        "data": {"object": {"id": "in_v", "metadata": {"organization_id": org}}},
    }
    with patch.object(StripeSyncService, "apply_invoice", new_callable=AsyncMock) as ai:
        ai.return_value = True
        await wh.dispatch(event)
        ai.assert_awaited_once()
        call_kw = ai.call_args[1]
        assert call_kw.get("deleted") is True


@pytest.mark.asyncio
async def test_apply_payment_intent_and_refund() -> None:
    db = _stripe_db_mock()
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=res)
    org = str(uuid.uuid4())
    svc = StripeSyncService(db, organization_id=None)
    await svc.apply_payment_intent(
        {"id": "pi_1", "amount": 500, "currency": "eur", "metadata": {"organization_id": org}}
    )
    await svc.apply_refund(
        {"id": "re_1", "amount": 500, "currency": "eur", "metadata": {"organization_id": org}}
    )
    await svc.apply_dispute(
        {"id": "dp_1", "amount": 500, "currency": "eur", "metadata": {"organization_id": org}}
    )
    await svc.apply_credit_note(
        {"id": "cn_1", "metadata": {"organization_id": org}}
    )
    await svc.apply_price(
        {"id": "price_1", "product": "prod_1", "metadata": {"organization_id": org}}
    )
    assert db.add.call_count >= 5


@pytest.mark.asyncio
async def test_balance_snapshot(monkeypatch: pytest.MonkeyPatch) -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    async def fake_bt(fn, *args, **kwargs):
        m = MagicMock()
        m.to_dict_recursive = lambda: {"available": [], "pending": [], "livemode": False}
        return m

    monkeypatch.setattr(
        "app.services.stripe_sync_service.asyncio.to_thread",
        fake_bt,
    )
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    with patch("app.services.stripe_sync_service.settings") as s:
        s.STRIPE_SECRET_KEY = "sk_test"
        svc = StripeSyncService(db, organization_id=org)

        def capture_add(obj: object) -> None:
            setattr(obj, "id", str(uuid.uuid4()))
            setattr(obj, "retrieved_at", now)

        db.add = MagicMock(side_effect=capture_add)
        out = await svc.snapshot_balance()
        assert out.organization_id == uuid.UUID(org)


@pytest.mark.parametrize(
    "event_type,handler",
    [
        ("product.created", "apply_product"),
        ("price.updated", "apply_price"),
        ("payment_intent.succeeded", "apply_payment_intent"),
        ("charge.succeeded", "apply_charge"),
        ("payout.paid", "apply_payout"),
        ("credit_note.created", "apply_credit_note"),
        ("refund.created", "apply_refund"),
        ("dispute.created", "apply_dispute"),
        ("tax_rate.created", "apply_tax_rate"),
        ("balance_transaction.created", "apply_balance_transaction"),
        ("customer.subscription.updated", "apply_subscription"),
    ],
)
@pytest.mark.asyncio
async def test_webhook_dispatch_event_types(event_type: str, handler: str) -> None:
    db = AsyncMock()
    wh = StripeWebhookService(db)
    org = str(uuid.uuid4())
    obj = {"id": "obj_1", "metadata": {"organization_id": org}}
    with patch.object(StripeSyncService, handler, new_callable=AsyncMock) as fn:
        fn.return_value = True
        await wh.dispatch({"type": event_type, "data": {"object": obj}})
        fn.assert_awaited()


@pytest.mark.parametrize(
    "sync_name",
    [
        "sync_payouts",
        "sync_subscriptions",
        "sync_invoices",
        "sync_credit_notes",
        "sync_products",
        "sync_prices",
        "sync_payment_intents",
        "sync_refunds",
        "sync_disputes",
        "sync_tax_rates",
        "sync_balance_transactions",
    ],
)
@pytest.mark.asyncio
async def test_pull_sync_empty_page(sync_name: str, monkeypatch: pytest.MonkeyPatch) -> None:
    async def empty_thread(*_a: object, **_kw: object) -> object:
        class P:
            data: list = []
            has_more = False

        return P()

    monkeypatch.setattr(
        "app.services.stripe_sync_service.asyncio.to_thread",
        empty_thread,
    )
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    with patch("app.services.stripe_sync_service.settings") as s:
        s.STRIPE_SECRET_KEY = "sk_test"
        svc = StripeSyncService(db, organization_id=org)
        await getattr(svc, sync_name)(page_size=5, max_pages=1)
    db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_balance_tx_resolves_org_via_charge() -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    res = MagicMock()
    res.scalar_one_or_none.return_value = SimpleNamespace()
    db.execute = AsyncMock(return_value=res)
    svc = StripeSyncService(db, organization_id=org)
    with patch.object(svc, "_org_from_charge_id", new_callable=AsyncMock) as oc:
        oc.return_value = org
        ok = await svc.apply_balance_transaction(
            {
                "id": "txn_z",
                "amount": 10,
                "currency": "eur",
                "fee": 0,
                "net": 10,
                "source": "ch_z",
            }
        )
    assert ok is True


@pytest.mark.asyncio
async def test_org_from_charge_id_reads_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _stripe_db_mock()
    svc = StripeSyncService(db, organization_id=None)

    async def fake_thread(*_a: object, **_kw: object) -> dict:
        return {
            "id": "ch_99",
            "metadata": {"organization_id": "org-from-charge"},
            "payment_intent": None,
        }

    monkeypatch.setattr(
        "app.services.stripe_sync_service.asyncio.to_thread",
        fake_thread,
    )
    out = await svc._org_from_charge_id("ch_99")
    assert out == "org-from-charge"


@pytest.mark.asyncio
async def test_org_from_charge_id_retrieve_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _stripe_db_mock()
    svc = StripeSyncService(db, organization_id=None)

    async def boom(*_a: object, **_kw: object) -> None:
        raise RuntimeError("stripe down")

    monkeypatch.setattr(
        "app.services.stripe_sync_service.asyncio.to_thread",
        boom,
    )
    assert await svc._org_from_charge_id("ch_bad") is None


@pytest.mark.asyncio
async def test_org_from_charge_id_from_payment_intent_metadata(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _stripe_db_mock()
    svc = StripeSyncService(db, organization_id=None)

    async def fake_thread(*_a: object, **_kw: object) -> dict:
        return {
            "id": "ch_100",
            "metadata": {},
            "payment_intent": {"metadata": {"organization_id": "org-pi"}},
        }

    monkeypatch.setattr(
        "app.services.stripe_sync_service.asyncio.to_thread",
        fake_thread,
    )
    out = await svc._org_from_charge_id("ch_100")
    assert out == "org-pi"


@pytest.mark.asyncio
async def test_apply_charge_fetches_balance_transaction(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    bt_dict = {
        "id": "txn_ret",
        "amount": 50,
        "currency": "eur",
        "fee": 0,
        "net": 50,
        "metadata": {"organization_id": org},
    }
    res = MagicMock()
    res.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=res)

    async def fake_thread(*_a: object, **_kw: object) -> dict:
        return bt_dict

    monkeypatch.setattr(
        "app.services.stripe_sync_service.asyncio.to_thread",
        fake_thread,
    )
    svc = StripeSyncService(db, organization_id=None)
    ok = await svc.apply_charge({"id": "ch_x", "balance_transaction": "txn_raw"})
    assert ok is True


@pytest.mark.asyncio
async def test_list_invoices_and_balance_tx_mirror() -> None:
    db = _stripe_db_mock()
    org = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    inv = SimpleNamespace(
        id=str(uuid.uuid4()),
        organization_id=org,
        stripe_id="in_1",
        customer_stripe_id=None,
        subscription_stripe_id=None,
        status="open",
        currency="eur",
        amount_due=100,
        amount_paid=0,
        amount_remaining=100,
        subtotal=100,
        total=100,
        tax=None,
        billing_reason=None,
        collection_method=None,
        hosted_invoice_url=None,
        invoice_pdf=None,
        number=None,
        paid=False,
        period_start=None,
        period_end=None,
        stripe_created=now,
        due_date=None,
        stripe_metadata={},
        raw_stripe_object={},
        deleted_at=None,
        created_at=now,
        updated_at=now,
    )
    bt = SimpleNamespace(
        id=str(uuid.uuid4()),
        organization_id=org,
        stripe_id="txn_m",
        amount=10,
        currency="eur",
        description=None,
        fee=0,
        net=10,
        status=None,
        type=None,
        reporting_category=None,
        source=None,
        stripe_created=now,
        available_on=None,
        exchange_rate=None,
        stripe_metadata={},
        raw_stripe_object={},
        deleted_at=None,
        created_at=now,
        updated_at=now,
    )
    res = MagicMock()
    res.scalars.return_value.all.return_value = [inv]
    db.execute = AsyncMock(return_value=res)
    svc = StripeSyncService(db, organization_id=org)
    inv_out = await svc.list_invoices_mirror(limit=5)
    assert len(inv_out) == 1
    res.scalars.return_value.all.return_value = [bt]
    db.execute = AsyncMock(return_value=res)
    bt_out = await svc.list_balance_transactions_mirror(limit=5)
    assert len(bt_out) == 1


@pytest.mark.asyncio
async def test_stripe_controller_delegates_to_sync() -> None:
    stats = StripeSyncStatsResponse()
    snap = StripeBalanceSnapshotResponse(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        available=[],
        pending=[],
        retrieved_at=datetime.now(timezone.utc),
    )
    sync = MagicMock()
    sync.sync_balance_transactions = AsyncMock(return_value=stats)
    sync.sync_payouts = AsyncMock(return_value=stats)
    sync.sync_customers = AsyncMock(return_value=stats)
    sync.sync_subscriptions = AsyncMock(return_value=stats)
    sync.sync_invoices = AsyncMock(return_value=stats)
    sync.sync_credit_notes = AsyncMock(return_value=stats)
    sync.sync_products = AsyncMock(return_value=stats)
    sync.sync_prices = AsyncMock(return_value=stats)
    sync.sync_payment_intents = AsyncMock(return_value=stats)
    sync.sync_refunds = AsyncMock(return_value=stats)
    sync.sync_disputes = AsyncMock(return_value=stats)
    sync.sync_tax_rates = AsyncMock(return_value=stats)
    sync.snapshot_balance = AsyncMock(return_value=snap)
    sync.list_balance_transactions_mirror = AsyncMock(return_value=[])
    sync.list_invoices_mirror = AsyncMock(return_value=[])
    sync.list_customers_mirror = AsyncMock(return_value=[])
    ctrl = StripeController(sync, MagicMock(), MagicMock())
    assert await ctrl.sync_balance_transactions() is stats
    assert await ctrl.sync_payouts() is stats
    assert await ctrl.sync_customers() is stats
    assert await ctrl.sync_subscriptions() is stats
    assert await ctrl.sync_invoices() is stats
    assert await ctrl.sync_credit_notes() is stats
    assert await ctrl.sync_products() is stats
    assert await ctrl.sync_prices() is stats
    assert await ctrl.sync_payment_intents() is stats
    assert await ctrl.sync_refunds() is stats
    assert await ctrl.sync_disputes() is stats
    assert await ctrl.sync_tax_rates() is stats
    assert await ctrl.snapshot_balance() is snap
    assert await ctrl.list_balance_transactions() == []
    assert await ctrl.list_invoices() == []
    assert await ctrl.list_customers() == []


@pytest.mark.asyncio
async def test_stripe_controller_wraps_generic_exception() -> None:
    sync = MagicMock()
    sync.sync_customers = AsyncMock(side_effect=RuntimeError("boom"))
    ctrl = StripeController(sync, MagicMock(), MagicMock())
    with pytest.raises(StripeError):
        await ctrl.sync_customers()


@pytest.mark.asyncio
async def test_stripe_controller_snapshot_wraps_exception() -> None:
    sync = MagicMock()
    sync.snapshot_balance = AsyncMock(side_effect=RuntimeError("snap fail"))
    ctrl = StripeController(sync, MagicMock(), MagicMock())
    with pytest.raises(StripeError, match="balance snapshot"):
        await ctrl.snapshot_balance()


@pytest.mark.asyncio
async def test_stripe_controller_reraises_stripe_error() -> None:
    sync = MagicMock()
    sync.sync_customers = AsyncMock(side_effect=StripeError("stripe down"))
    ctrl = StripeController(sync, MagicMock(), MagicMock())
    with pytest.raises(StripeError, match="stripe down"):
        await ctrl.sync_customers()


@pytest.mark.asyncio
async def test_stripe_controller_webhook_value_error() -> None:
    from app.core.exceptions import ValidationError

    wh = StripeWebhookService(
        AsyncMock(),
        app_settings=SimpleNamespace(STRIPE_WEBHOOK_SECRET="whsec_test"),
    )
    with patch(
        "app.services.stripe_webhook_service.stripe.Webhook.construct_event",
        side_effect=ValueError("misconfigured"),
    ):
        with pytest.raises(ValidationError, match="misconfigured"):
            await wh.process_webhook(b"{}", "sig")


@pytest.mark.asyncio
async def test_stripe_route_functions_delegate() -> None:
    """Exercise route handlers directly (FastAPI DI-free) for coverage."""
    from app.api.routes import stripe_routes

    ctrl = MagicMock()
    stats = StripeSyncStatsResponse()
    snap = StripeBalanceSnapshotResponse(
        id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        available=[],
        pending=[],
        retrieved_at=datetime.now(timezone.utc),
    )
    ctrl.sync_balance_transactions = AsyncMock(return_value=stats)
    ctrl.sync_payouts = AsyncMock(return_value=stats)
    ctrl.snapshot_balance = AsyncMock(return_value=snap)
    ctrl.sync_customers = AsyncMock(return_value=stats)
    ctrl.sync_subscriptions = AsyncMock(return_value=stats)
    ctrl.sync_invoices = AsyncMock(return_value=stats)
    ctrl.sync_credit_notes = AsyncMock(return_value=stats)
    ctrl.sync_products = AsyncMock(return_value=stats)
    ctrl.sync_prices = AsyncMock(return_value=stats)
    ctrl.sync_payment_intents = AsyncMock(return_value=stats)
    ctrl.sync_refunds = AsyncMock(return_value=stats)
    ctrl.sync_disputes = AsyncMock(return_value=stats)
    ctrl.sync_tax_rates = AsyncMock(return_value=stats)
    ctrl.list_balance_transactions = AsyncMock(return_value=[])
    ctrl.list_invoices = AsyncMock(return_value=[])
    ctrl.list_customers = AsyncMock(return_value=[])

    await stripe_routes.sync_balance_transactions(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_payouts(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_balance_snapshot(ctrl)
    await stripe_routes.sync_customers(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_subscriptions(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_invoices(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_credit_notes(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_products(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_prices(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_payment_intents(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_refunds(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_disputes(ctrl, page_size=10, max_pages=1)
    await stripe_routes.sync_tax_rates(ctrl, page_size=10, max_pages=1)
    await stripe_routes.list_balance_transactions(ctrl, limit=5)
    await stripe_routes.list_invoices(ctrl, limit=5)
    await stripe_routes.list_customers(ctrl, limit=5)
    ctrl.sync_customers.assert_awaited()


def test_stripe_client_verify_webhook_success() -> None:
    with patch(
        "stripe.Webhook.construct_event",
        return_value={"id": "evt_1", "type": "ping"},
    ):
        c = StripeClient(webhook_secret="whsec_test")
        out = c.verify_webhook_event(b"{}", "sig_header")
    assert out["id"] == "evt_1"


def test_stripe_client_verify_webhook_missing_secret() -> None:
    c = StripeClient(webhook_secret="")
    with pytest.raises(ValueError, match="STRIPE_WEBHOOK_SECRET"):
        c.verify_webhook_event(b"{}", "sig")


def test_stripe_object_to_dict_to_dict_method() -> None:
    class Tmp:
        def to_dict(self) -> dict:
            return {"k": 3}

    assert stripe_object_to_dict(Tmp()) == {"k": 3}


def test_stripe_create_customer_when_not_configured() -> None:
    c = StripeClient(secret_key="")
    out = c.create_customer(email="z@z.com", name="Z")
    assert out["id"] == "stub_cus"


def test_stripe_payment_intent_stub_skips_stub_customer_id() -> None:
    with patch("packages.stripe.api.client.stripe.PaymentIntent.create") as pc:
        pc.return_value = SimpleNamespace(id="pi_s", client_secret="cs_s")
        c = StripeClient(secret_key="sk_x")
        c.create_payment_intent_stub(
            amount_cents=10, currency="eur", customer_id="stub_cus"
        )
    pc.assert_called_once()
    kw = pc.call_args.kwargs
    assert "customer" not in kw


def test_stripe_payment_intent_stub_live_path() -> None:
    with patch("packages.stripe.api.client.stripe.PaymentIntent.create") as pc:
        pc.return_value = SimpleNamespace(id="pi_9", client_secret="sec_9")
        c = StripeClient(secret_key="sk_live_test")
        out = c.create_payment_intent_stub(
            amount_cents=99, currency="eur", customer_id="cus_9"
        )
    assert out["id"] == "pi_9"
    assert out["client_secret"] == "sec_9"


def test_stripe_invoice_response_model() -> None:
    uid = uuid.uuid4()
    oid = uuid.uuid4()
    now = datetime.now(timezone.utc)
    row = SimpleNamespace(
        id=str(uid),
        organization_id=str(oid),
        stripe_id="in_x",
        stripe_metadata={},
        raw_stripe_object={},
        deleted_at=None,
        created_at=now,
        updated_at=now,
        customer_stripe_id="cus_1",
        subscription_stripe_id=None,
        status="paid",
        currency="eur",
        amount_due=0,
        amount_paid=100,
        amount_remaining=0,
        subtotal=100,
        total=100,
        tax=None,
        billing_reason=None,
        collection_method=None,
        hosted_invoice_url=None,
        invoice_pdf=None,
        number="INV-1",
        paid=True,
        period_start=now,
        period_end=now,
        stripe_created=now,
        due_date=None,
    )
    m = StripeInvoiceResponse.model_validate(row)
    assert m.number == "INV-1"

