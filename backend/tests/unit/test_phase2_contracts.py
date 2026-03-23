"""Phase 2 contract and helper tests (pytest-asyncio)."""
from __future__ import annotations

import json
import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import Request

from app.core.exceptions import NotFoundError, ValidationError
from app.db.models.identity import UserRole
from app.main import app_error_handler
from app.models.auth import AuthResponse
from app.models.gemi import GemiDocumentsFetchResponse, GemiSearchResponse
from app.services.agents.ingestion_agent import IngestionAgent
from app.services.agents.reconciliation_agent import ReconciliationAgent
from app.services.auth_service import _build_auth_response
from app.services.embeddings.vector_store import _vector_literal
from app.core.security.jwt import encode_access_token


def test_auth_response_includes_refresh_token() -> None:
    uid = str(uuid.uuid4())
    tok, _ = encode_access_token(uid, role="owner", organization_id=None)
    user = SimpleNamespace(
        id=uid,
        username="alice",
        email="alice@example.com",
        role=UserRole.OWNER,
        organization_id=None,
        email_verified=True,
        phone_verified=False,
    )
    resp = _build_auth_response(user, tok, "opaque-refresh-token")
    assert isinstance(resp, AuthResponse)
    assert resp.refresh_token == "opaque-refresh-token"
    assert resp.access_token == tok


@pytest.mark.asyncio
async def test_app_error_handler_includes_fields_key() -> None:
    exc = NotFoundError("missing", code="resource.not_found")
    req = MagicMock(spec=Request)
    res = await app_error_handler(req, exc)
    body = json.loads(res.body.decode())
    assert body["detail"] == "missing"
    assert body["code"] == "resource.not_found"
    assert body["fields"] == {}

    exc2 = ValidationError("bad", fields={"x": "y"})
    res2 = await app_error_handler(req, exc2)
    body2 = json.loads(res2.body.decode())
    assert body2["fields"] == {"x": "y"}


def test_gemi_search_response_warning_branch() -> None:
    r = GemiSearchResponse(
        items=[],
        query="abc",
        mode="afm",
        exact=False,
        warning="Name search not yet implemented",
    )
    assert r.warning is not None


def test_gemi_documents_fetch_response() -> None:
    r = GemiDocumentsFetchResponse(company="ACME", documents_uploaded=2, message="ok")
    assert r.documents_uploaded == 2


def test_vector_literal_format() -> None:
    assert _vector_literal([0.0, 1.5]) == "[0.0,1.5]"


@pytest.mark.asyncio
async def test_ingestion_agent_demo_mode_short_circuit() -> None:
    agent = IngestionAgent()
    db = AsyncMock()
    out = await agent.run(db, str(uuid.uuid4()), "  ")
    assert out.get("error") == "empty_text"


@pytest.mark.asyncio
async def test_reconciliation_agent_run_empty_ledger() -> None:
    agent = ReconciliationAgent()
    db = AsyncMock()
    db.execute = AsyncMock(
        return_value=MagicMock(
            scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))
        )
    )
    out = await agent.run(db, str(uuid.uuid4()))
    assert out["matches"] == []
    assert out["review_queue"] == []
    assert out["bank_lines_loaded"] == 0


@pytest.mark.asyncio
async def test_vector_store_requires_openai_key() -> None:
    from app.services.embeddings.vector_store import VectorStoreService

    vs = VectorStoreService(AsyncMock(), str(uuid.uuid4()))
    with pytest.raises(ValidationError, match="OpenAI"):
        await vs.embed_texts(["hello"])


@pytest.mark.asyncio
async def test_stripe_client_stub_without_key() -> None:
    from app.clients.stripe_client import StripeClient

    c = StripeClient()
    cust = c.create_customer(email="a@b.com", name="A")
    assert cust["id"].startswith("stub_")
