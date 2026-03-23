"""Additional tests to exercise Phase 2 modules (coverage)."""
from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy.exc import SQLAlchemyError
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.clients.gmail_client import GmailSmtpClient
from app.clients.llm_client import LLMClient
from app.controllers.ai_controller import AIController
from app.core.exceptions import ExternalServiceError, ForbiddenError, ValidationError
from app.db.models.identity import Organization, User, UserOrganizationMembership, UserRole
from app.services.ai_service import AIService
from app.services.membership_service import MembershipService
from app.services.embeddings.vector_store import VectorStoreService


@pytest.mark.asyncio
async def test_llm_client_demo_chat_completion() -> None:
    with patch("app.clients.llm_client.settings") as s:
        s.demo_mode = True
        s.OPENAI_API_KEY = ""
        client = LLMClient()
        text = await client.chat_completion([{"role": "user", "content": "hi"}])
        assert "demo" in text.lower()


@pytest.mark.asyncio
async def test_llm_client_demo_json() -> None:
    with patch("app.clients.llm_client.settings") as s:
        s.demo_mode = True
        s.OPENAI_API_KEY = ""
        client = LLMClient()
        data = await client.chat_completion_json([{"role": "user", "content": "x"}])
        assert data.get("demo") is True


@pytest.mark.asyncio
async def test_llm_client_demo_stream() -> None:
    with patch("app.clients.llm_client.settings") as s:
        s.demo_mode = True
        s.OPENAI_API_KEY = ""
        client = LLMClient()
        chunks = []
        async for c in client.stream_chat_completion([{"role": "user", "content": "x"}]):
            chunks.append(c)
        assert chunks


@pytest.mark.asyncio
async def test_gmail_client_demo() -> None:
    with patch("app.clients.gmail_client.settings") as s:
        s.demo_mode = True
        c = GmailSmtpClient()
        await c.send_plain_text(to_email="a@b.com", subject="s", body="b")


@pytest.mark.asyncio
async def test_ai_controller_streams_bytes() -> None:
    svc = AIService(str(uuid.uuid4()))
    ctl = AIController(svc)

    async def _agen():
        yield "a"
        yield "b"

    with patch.object(svc._llm, "stream_chat_completion", return_value=_agen()):
        out = []
        async for b in ctl.stream_chat_sse("hi"):
            out.append(b)
    assert out


@pytest.mark.asyncio
async def test_membership_service_list() -> None:
    db = AsyncMock()
    org = Organization(
        id=str(uuid.uuid4()),
        name="Co",
        vat_number="123456789",
        country="GR",
        registry_data=None,
    )
    mem = UserOrganizationMembership(
        id=str(uuid.uuid4()),
        user_id=str(uuid.uuid4()),
        organization_id=org.id,
        role=UserRole.OWNER,
    )
    row = (mem, org)
    result = MagicMock()
    result.all.return_value = [row]
    db.execute = AsyncMock(return_value=result)

    svc = MembershipService(db)
    items = await svc.list_user_organizations(mem.user_id, active_organization_id=org.id)
    assert len(items) == 1
    assert items[0].is_current is True


@pytest.mark.asyncio
async def test_membership_service_switch() -> None:
    db = AsyncMock()
    uid = str(uuid.uuid4())
    oid = str(uuid.uuid4())
    user = User(
        id=uid,
        username="u",
        email="u@e.com",
        password_hash="x",
        role=UserRole.VIEWER,
        organization_id=None,
    )
    membership = UserOrganizationMembership(
        id=str(uuid.uuid4()),
        user_id=uid,
        organization_id=oid,
        role=UserRole.ADMIN,
    )

    def exec_side_effect(*_a, **_k):
        r = MagicMock()
        r.scalar_one_or_none.side_effect = [membership, user]
        return r

    db.execute = AsyncMock(side_effect=exec_side_effect)

    svc = MembershipService(db)
    u2 = await svc.switch_active_organization(uid, oid)
    assert u2.organization_id == oid
    assert u2.role == UserRole.ADMIN
    db.commit.assert_awaited()


@pytest.mark.asyncio
async def test_llm_openai_chat_mocked() -> None:
    with patch("app.clients.llm_client.settings") as s:
        s.demo_mode = False
        s.OPENAI_API_KEY = "sk-test"
        s.OPENAI_CHAT_MODEL = "gpt-4o-mini"
        with patch("app.clients.llm_client.AsyncOpenAI") as ao:
            inst = ao.return_value
            inst.chat.completions.create = AsyncMock(
                return_value=MagicMock(
                    choices=[MagicMock(message=MagicMock(content="ok"))]
                )
            )
            client = LLMClient()
            text = await client.chat_completion([{"role": "user", "content": "x"}])
            assert text == "ok"


@pytest.mark.asyncio
async def test_llm_openai_json_mocked() -> None:
    with patch("app.clients.llm_client.settings") as s:
        s.demo_mode = False
        s.OPENAI_API_KEY = "sk-test"
        s.OPENAI_CHAT_MODEL = "gpt-4o-mini"
        with patch("app.clients.llm_client.AsyncOpenAI") as ao:
            inst = ao.return_value
            inst.chat.completions.create = AsyncMock(
                return_value=MagicMock(
                    choices=[MagicMock(message=MagicMock(content='{"a":1}'))]
                )
            )
            client = LLMClient()
            data = await client.chat_completion_json([{"role": "user", "content": "x"}])
            assert data == {"a": 1}


@pytest.mark.asyncio
async def test_gmail_smtp_send_mocked() -> None:
    with patch("app.clients.gmail_client.settings") as s:
        s.demo_mode = False
        s.GMAIL_SMTP_HOST = "smtp.example.com"
        s.GMAIL_SMTP_PORT = 587
        s.GMAIL_SMTP_USER = "u"
        s.GMAIL_SMTP_PASSWORD = "p"
        s.GMAIL_FROM_EMAIL = "from@example.com"
        mock_cls = MagicMock()
        mock_inst = MagicMock()
        mock_cls.return_value.__enter__.return_value = mock_inst
        mock_cls.return_value.__exit__.return_value = None
        with patch("app.clients.gmail_client.smtplib.SMTP", mock_cls):
            c = GmailSmtpClient()
            await c.send_plain_text(to_email="to@example.com", subject="s", body="b")
        mock_inst.starttls.assert_called_once()
        mock_inst.login.assert_called_once()
        mock_inst.send_message.assert_called_once()


@pytest.mark.asyncio
async def test_llm_openai_stream_mocked() -> None:
    with patch("app.clients.llm_client.settings") as s:
        s.demo_mode = False
        s.OPENAI_API_KEY = "sk-test"
        s.OPENAI_CHAT_MODEL = "gpt-4o-mini"
        with patch("app.clients.llm_client.AsyncOpenAI") as ao:
            inst = ao.return_value

            async def _events():
                yield MagicMock(choices=[MagicMock(delta=MagicMock(content="p"))])
                yield MagicMock(choices=[MagicMock(delta=MagicMock(content=None))])

            inst.chat.completions.create = AsyncMock(return_value=_events())
            client = LLMClient()
            parts: list[str] = []
            async for c in client.stream_chat_completion([{"role": "user", "content": "x"}]):
                parts.append(c)
            assert "p" in "".join(parts)


@pytest.mark.asyncio
async def test_stripe_with_key_uses_sdk_mock() -> None:
    from packages.stripe.api.client import StripeClient

    with patch("packages.stripe.api.client.stripe.Customer.create") as cc:
        cc.return_value = MagicMock(id="cus_real", email="a@b.com")
        c = StripeClient(secret_key="sk_test_x")
        out = c.create_customer(email="a@b.com", name="A")
        assert out["id"] == "cus_real"
    with patch("packages.stripe.api.client.stripe.PaymentIntent.create") as pc:
        pc.return_value = MagicMock(id="pi_real", client_secret="sec")
        c2 = StripeClient(secret_key="sk_test_x")
        pi = c2.create_payment_intent_stub(
            amount_cents=50, currency="eur", customer_id="cus_real"
        )
        assert pi["id"] == "pi_real"


@pytest.mark.asyncio
async def test_membership_list_db_error() -> None:
    db = AsyncMock()
    db.execute = AsyncMock(side_effect=SQLAlchemyError("fail"))
    svc = MembershipService(db)
    with pytest.raises(ExternalServiceError):
        await svc.list_user_organizations(str(uuid.uuid4()), active_organization_id=None)


@pytest.mark.asyncio
async def test_membership_switch_user_missing() -> None:
    db = AsyncMock()
    mem = UserOrganizationMembership(
        id=str(uuid.uuid4()),
        user_id=str(uuid.uuid4()),
        organization_id=str(uuid.uuid4()),
        role=UserRole.OWNER,
    )
    r1 = MagicMock()
    r1.scalar_one_or_none.return_value = mem
    r2 = MagicMock()
    r2.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(side_effect=[r1, r2])
    svc = MembershipService(db)
    from app.core.exceptions import NotFoundError as NF

    with pytest.raises(NF):
        await svc.switch_active_organization(mem.user_id, mem.organization_id)


@pytest.mark.asyncio
async def test_membership_switch_forbidden() -> None:
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=None))
    )
    svc = MembershipService(db)
    with pytest.raises(ForbiddenError):
        await svc.switch_active_organization(str(uuid.uuid4()), str(uuid.uuid4()))


@pytest.mark.asyncio
async def test_vector_store_embed_and_search_mocked() -> None:
    db = AsyncMock()
    oid = str(uuid.uuid4())
    vec = [0.01] * 1536

    fake_emb = MagicMock()
    fake_emb.data = [MagicMock(embedding=vec)]

    with (
        patch("app.services.embeddings.vector_store.settings") as st,
        patch("app.services.embeddings.vector_store.AsyncOpenAI") as ao,
    ):
        st.OPENAI_API_KEY = "sk-test"
        st.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
        st.OPENAI_EMBEDDING_DIMENSIONS = 1536
        inst = ao.return_value
        inst.embeddings.create = AsyncMock(return_value=fake_emb)

        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        db.rollback = AsyncMock()

        vs = VectorStoreService(db, oid)
        out = await vs.embed_texts(["hello"])
        assert len(out[0]) == 1536

        search_result = MagicMock()
        search_result.mappings.return_value.all.return_value = [
            {"id": "1", "content_text": "x", "source": "s", "embedding_metadata": {}, "distance": 0.1}
        ]
        db.execute = AsyncMock(return_value=search_result)

        hits = await vs.similarity_search("hello", k=3)
        assert len(hits) == 1


@pytest.mark.asyncio
async def test_vector_store_upsert_memory_mocked() -> None:
    db = MagicMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    oid = str(uuid.uuid4())
    vec = [0.02] * 1536
    fake_emb = MagicMock()
    fake_emb.data = [MagicMock(embedding=vec)]
    with (
        patch("app.services.embeddings.vector_store.settings") as st,
        patch("app.services.embeddings.vector_store.AsyncOpenAI") as ao,
    ):
        st.OPENAI_API_KEY = "sk-test"
        st.OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
        st.OPENAI_EMBEDDING_DIMENSIONS = 1536
        inst = ao.return_value
        inst.embeddings.create = AsyncMock(return_value=fake_emb)
        vs = VectorStoreService(db, oid)
        row = await vs.upsert_memory(content_text="line", source="invoice", embedding_metadata={"k": "v"})
        assert row.organization_id == oid
    db.add.assert_called_once()


@pytest.mark.asyncio
async def test_vector_store_similarity_invalid_k() -> None:
    db = AsyncMock()
    vs = VectorStoreService(db, str(uuid.uuid4()))
    with (
        patch("app.services.embeddings.vector_store.settings") as st,
        patch.object(vs, "embed_texts", AsyncMock(return_value=[[0.0] * 1536])),
    ):
        st.OPENAI_API_KEY = "x"
        with pytest.raises(ValidationError):
            await vs.similarity_search("q", k=0)


@pytest.mark.asyncio
async def test_vector_store_embed_openai_error() -> None:
    db = AsyncMock()
    vs = VectorStoreService(db, str(uuid.uuid4()))
    with (
        patch("app.services.embeddings.vector_store.settings") as st,
        patch("app.services.embeddings.vector_store.AsyncOpenAI") as ao,
    ):
        st.OPENAI_API_KEY = "sk"
        inst = ao.return_value
        inst.embeddings.create = AsyncMock(side_effect=RuntimeError("api down"))
        with pytest.raises(ExternalServiceError):
            await vs.embed_texts(["a"])


@pytest.mark.asyncio
async def test_vector_store_upsert_db_error() -> None:
    db = MagicMock()
    db.add = MagicMock()
    db.commit = AsyncMock(side_effect=SQLAlchemyError("fail"))
    db.rollback = AsyncMock()
    db.refresh = AsyncMock()
    oid = str(uuid.uuid4())
    vec = [0.03] * 1536
    fake_emb = MagicMock()
    fake_emb.data = [MagicMock(embedding=vec)]
    with (
        patch("app.services.embeddings.vector_store.settings") as st,
        patch("app.services.embeddings.vector_store.AsyncOpenAI") as ao,
    ):
        st.OPENAI_API_KEY = "sk"
        st.OPENAI_EMBEDDING_MODEL = "m"
        st.OPENAI_EMBEDDING_DIMENSIONS = 1536
        inst = ao.return_value
        inst.embeddings.create = AsyncMock(return_value=fake_emb)
        vs = VectorStoreService(db, oid)
        with pytest.raises(ExternalServiceError):
            await vs.upsert_memory(content_text="c", source="s")


@pytest.mark.asyncio
async def test_vector_store_search_db_error() -> None:
    db = AsyncMock()
    db.execute = AsyncMock(side_effect=SQLAlchemyError("fail"))
    vs = VectorStoreService(db, str(uuid.uuid4()))
    with (
        patch("app.services.embeddings.vector_store.settings") as st,
        patch.object(vs, "embed_texts", AsyncMock(return_value=[[0.0] * 1536])),
    ):
        st.OPENAI_API_KEY = "sk"
        with pytest.raises(ExternalServiceError):
            await vs.similarity_search("q", k=2)


@pytest.mark.asyncio
async def test_reconciliation_exact_match() -> None:
    from app.agents.reconciliation import reconciliation_graph

    tx = MagicMock()
    tx.id = "t1"
    tx.amount = Decimal("10.00")
    tx.description = "pay"
    tx.made_on = date(2025, 1, 1)

    result = MagicMock()
    result.scalars.return_value.all.return_value = [tx]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)

    with patch(
        "app.agents.reconciliation.nodes.stub_open_invoices",
        return_value=[{"id": "inv1", "amount": "10.00", "counterparty": "X"}],
    ):
        out = await reconciliation_graph.ainvoke(
            {"organization_id": str(uuid.uuid4()), "db": db},
        )
    assert len(out["matches"]) == 1


@pytest.mark.asyncio
async def test_reconciliation_ambiguous_amount() -> None:
    from app.agents.reconciliation import reconciliation_graph

    tx = MagicMock()
    tx.id = "t1"
    tx.amount = Decimal("10.00")
    tx.description = "pay"
    tx.made_on = date(2025, 1, 1)
    result = MagicMock()
    result.scalars.return_value.all.return_value = [tx]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    with patch(
        "app.agents.reconciliation.nodes.stub_open_invoices",
        return_value=[
            {"id": "a", "amount": "10.00"},
            {"id": "b", "amount": "10.00"},
        ],
    ):
        out = await reconciliation_graph.ainvoke(
            {"organization_id": str(uuid.uuid4()), "db": db},
        )
    assert not out["matches"]
    assert out["review_queue"]


@pytest.mark.asyncio
async def test_reconciliation_invalid_amount_line() -> None:
    from app.agents.reconciliation import reconciliation_graph

    tx = MagicMock()
    tx.id = "t1"
    tx.amount = "not-a-decimal"
    tx.description = ""
    tx.made_on = date(2025, 1, 1)
    result = MagicMock()
    result.scalars.return_value.all.return_value = [tx]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)
    with patch("app.agents.reconciliation.nodes.stub_open_invoices", return_value=[]):
        out = await reconciliation_graph.ainvoke(
            {"organization_id": str(uuid.uuid4()), "db": db},
        )
    assert any(r.get("reason") == "invalid_amount" for r in out["review_queue"])


@pytest.mark.asyncio
async def test_ar_collections_with_alerts_demo_draft_send() -> None:
    from app.db.models.alerts import Alert, AlertSeverity
    from app.agents.collections import collections_graph

    alert = Alert(
        id="al1",
        organization_id=str(uuid.uuid4()),
        name="Overdue INV-1",
        description="Pay now",
        type="ar",
        severity_level=AlertSeverity.normal,
        trigger_source="system",
    )
    result = MagicMock()
    result.scalars.return_value.all.return_value = [alert]
    db = AsyncMock()
    db.execute = AsyncMock(return_value=result)

    with patch("app.agents.collections.nodes.settings") as s:
        s.demo_mode = True
        out = await collections_graph.ainvoke(
            {"organization_id": alert.organization_id, "db": db},
        )
    assert len(out["drafts"]) == 1
    assert out["sent"]


@pytest.mark.asyncio
async def test_ingestion_non_demo_mock_llm() -> None:
    from app.agents.ingestion import ingestion_graph

    mock_vs = MagicMock()
    mock_vs.similarity_search = AsyncMock(return_value=[])

    mock_llm = MagicMock()
    mock_llm.chat_completion_json = AsyncMock(
        return_value={
            "vendor": "V",
            "total": "1",
            "vat_rate": "0",
            "currency": "EUR",
        }
    )

    with patch("app.agents.ingestion.nodes.settings") as s:
        s.demo_mode = False
        s.OPENAI_API_KEY = "sk"
        db = AsyncMock()
        out = await ingestion_graph.ainvoke(
            {
                "organization_id": str(uuid.uuid4()),
                "raw_text": "invoice body",
                "db": db,
                "vector_store_factory": lambda _db, _oid: mock_vs,
                "llm": mock_llm,
            },
        )
    assert out["result"]["extracted"]["vendor"] == "V"


@pytest.mark.asyncio
async def test_ar_collections_agent_demo_empty_alerts() -> None:
    from app.agents.collections import collections_graph

    with patch("app.agents.collections.nodes.settings") as s:
        s.demo_mode = True
        db = AsyncMock()
        db.execute = AsyncMock(
            return_value=MagicMock(
                scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
            )
        )
        out = await collections_graph.ainvoke(
            {"organization_id": str(uuid.uuid4()), "db": db},
        )
    assert out["alerts"] == []
    assert out["drafts"] == []


@pytest.mark.asyncio
async def test_ingestion_agent_demo_full_path() -> None:
    from app.agents.ingestion import ingestion_graph

    with patch("app.agents.ingestion.nodes.settings") as s:
        s.demo_mode = True
        db = AsyncMock()
        out = await ingestion_graph.ainvoke(
            {
                "organization_id": str(uuid.uuid4()),
                "raw_text": "Supplier invoice total 200 EUR",
                "db": db,
            },
        )
    assert out["result"]["extracted"].get("vendor")


@pytest.mark.asyncio
async def test_stripe_payment_intent_stub() -> None:
    from packages.stripe.api.client import StripeClient

    c = StripeClient(secret_key="")
    pi = c.create_payment_intent_stub(amount_cents=500, currency="eur")
    assert pi["id"].startswith("stub_")
