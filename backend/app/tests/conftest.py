# tests/conftest.py
import asyncio
import types
from datetime import datetime
from unittest.mock import AsyncMock
import pytest
import os, sys, hashlib, importlib

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.user_service import UserService  # adjust path if different


def _get_in(doc, path):
    cur = doc
    for part in path.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def _set_in(doc, path, value):
    cur = doc
    parts = path.split(".")
    for part in parts[:-1]:
        cur = cur.setdefault(part, {})
    cur[parts[-1]] = value


def _inc_in(doc, path, delta):
    cur = _get_in(doc, path)
    if cur is None:
        _set_in(doc, path, delta)
    else:
        _set_in(doc, path, cur + delta)


def _match(doc, flt):
    for k, v in flt.items():
        if isinstance(v, dict) and any(
            op in v for op in ("$gt", "$lt", "$gte", "$lte", "$ne")
        ):
            val = _get_in(doc, k)
            if "$gt" in v and not (val is not None and val > v["$gt"]):
                return False
            if "$lt" in v and not (val is not None and val < v["$lt"]):
                return False
            if "$gte" in v and not (val is not None and val >= v["$gte"]):
                return False
            if "$lte" in v and not (val is not None and val <= v["$lte"]):
                return False
            if "$ne" in v and not (val != v["$ne"]):
                return False
        else:
            if _get_in(doc, k) != v:
                return False
    return True


# ---------- Tiny in-memory async fake collections ----------
class FakeCollection:
    def __init__(self):
        self.docs = []
        self.updates = []

    async def insert_one(self, doc):
        self.docs.append(doc)
        # Return value not used in your code; mimic Motor-ish object if needed
        return types.SimpleNamespace(inserted_id=doc.get("_id"))

    async def update_one(self, flt, update):
        self.updates.append((flt, update))  # still keep a record
        for doc in self.docs:
            if _match(doc, flt):
                modified = 0
                if "$set" in update:
                    for path, value in update["$set"].items():
                        before = _get_in(doc, path)
                        if before != value:
                            _set_in(doc, path, value)
                            modified = 1
                if "$inc" in update:
                    for path, delta in update["$inc"].items():
                        _inc_in(doc, path, delta)
                        modified = 1
                return types.SimpleNamespace(matched_count=1, modified_count=modified)
        return types.SimpleNamespace(matched_count=0, modified_count=0)

    async def find_one(self, flt):
        # naive implementation: return the first matching doc
        for doc in self.docs:
            if all(doc.get(k) == v for k, v in flt.items()):
                return doc
        return None


class FakeDB:
    def __init__(self):
        self._collections = {
            "verification_sessions": FakeCollection(),
            "onboarding_users": FakeCollection(),
            "onboarding_sessions": FakeCollection(),
        }

    # needed for fake_db["verification_sessions"]
    def __getitem__(self, name):
        return self._collections[name]

    # needed for fake_db.verification_sessions
    def __getattr__(self, name):
        try:
            return self._collections[name]
        except KeyError:
            raise AttributeError(name)

    # needed for fake_db.get_collection("verification_sessions")
    def get_collection(self, name):
        return self._collections[name]


# ---------- Fake NotificationService ----------
class FakeNotificationService:
    def __init__(self, should_succeed=True):
        self.should_succeed = should_succeed
        self.calls = []

    async def send_verification_sms(self, *, phone=None, code=None, **_):
        self.calls.append({"phone": phone, "code": code})
        return self.should_succeed

    async def send_verification_email(self, *, email=None, code=None, **_):
        self.calls.append({"email": email, "code": code})
        return self.should_succeed


# ---------- Pytest config ----------
@pytest.fixture
def fake_db():
    return FakeDB()


@pytest.fixture
def fake_sms_success():
    return FakeNotificationService(should_succeed=True)


@pytest.fixture
def fake_sms_fail():
    return FakeNotificationService(should_succeed=False)


@pytest.fixture
def svc(fake_db, fake_sms_success, monkeypatch):
    service = UserService(db=fake_db, code_pepper="pepper123")

    # Swap the real NotificationService with our fake
    service.notification_service = fake_sms_success

    async def _fixed_code(_len=4):
        return "1234"

    monkeypatch.setattr(service, "_generate_code", _fixed_code)

    # Make secrets.token_urlsafe deterministic for ensure_onboarding_session
    import secrets

    monkeypatch.setattr(secrets, "token_urlsafe", lambda n: "sess_fixed")

    # Patch the hasher **in the module where UserService is defined**
    svc_mod = importlib.import_module(service.__class__.__module__)

    def fake_sha(code: str, *, pepper: str) -> str:
        # deterministic and ignores pepper for tests
        return f"TESTHASH:{code}"

    # Patch the symbol used by verify_phone_code
    monkeypatch.setattr(svc_mod, "sha256_code", fake_sha, raising=True)

    # Expose a helper so tests can seed matching hashes easily
    service._test_hash = lambda code: fake_sha(code, pepper="ignored")

    return service
