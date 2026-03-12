# tests/test_user_service.py
import pytest
import hmac, hashlib
import datetime as dt
import importlib
from types import SimpleNamespace

# If you have the real model, prefer:
from models.user import (
    PhoneVerificationRequest,
    PhoneVerificationCodeRequest,
    EmailVerificationResponse,
    EmailVerificationRequest,
    EmailVerificationCodeRequest,
    EmailVerificationCodeResponse,
    BusinessCountryRequest,
    BusinessInfoRequest,
    ShareholderInfo,
    ShareholderInfoRequest,
)
from app.services.user_service import UserService

# For demo, we use a tiny stub with the same attributes:
# class PhoneVerificationRequest:
#     def __init__(self, full_phone_number: str, onboarding_session_id: str | None):
#         self.full_phone_number = full_phone_number
#         self.onboarding_session_id = onboarding_session_id


# test ensure_onboarding_session
@pytest.mark.asyncio
async def test_ensure_onboarding_session_creates_new(svc, fake_db):
    sess_id = await svc.ensure_onboarding_session(
        phone_number=None, existing_session_id=None
    )
    assert sess_id == "sess_fixed"  # we monkeypatched token_urlsafe
    assert len(fake_db["onboarding_sessions"].docs) == 1
    doc = fake_db["onboarding_sessions"].docs[0]
    assert doc["_id"] == "sess_fixed"
    assert doc["status"] == "draft"


@pytest.mark.asyncio
async def test_ensure_onboarding_session_reuses_existing(svc, fake_db):
    sess_id = await svc.ensure_onboarding_session(
        existing_session_id="reused", phone_number=None
    )
    assert sess_id == "reused"
    # one update call to "touch" the session
    updates = fake_db["onboarding_sessions"].updates
    assert updates and updates[0][0] == {"_id": "reused"}


# Test veriphy_phone_number
@pytest.mark.asyncio
async def test_verify_phone_happy_path(svc, fake_db):
    req = PhoneVerificationRequest(
        country_code="+30", phone_number="6948347822", onboarding_session_id="sess123"
    )
    resp = await svc.verify_phone_number(req)

    assert resp.success is True
    assert resp.message.lower().startswith("verification code sent")
    assert resp.onboarding_session_id == "sess123"
    assert resp.verification_id  # set by _create_verification_session

    # DB side-effects happened?
    verif_coll = fake_db["verification_sessions"]
    assert len(verif_coll.docs) == 1
    doc = verif_coll.docs[0]
    assert doc["onboarding_session_id"] == "sess123"
    assert doc["channel"] == "phone"
    assert doc["target"] == "+306948347822"
    assert "code_hash" in doc

    # session step updated?
    sess_coll = fake_db["onboarding_sessions"]
    assert sess_coll.updates  # one update_one call recorded
    _flt, update = sess_coll.updates[0]
    assert update["$set"]["step"] == "phone_code_sent"


@pytest.mark.asyncio
async def test_verify_phone_missing_session_id(svc):
    req = PhoneVerificationRequest(
        country_code="+30", phone_number="6948347822", onboarding_session_id=None
    )
    resp = await svc.verify_phone_number(req)
    assert resp.success is False
    assert "Onboarding session id is required" in resp.message


@pytest.mark.asyncio
async def test_verify_phone_invalid_number(svc):
    req = PhoneVerificationRequest(
        country_code="+30", phone_number="122285684345", onboarding_session_id="sess123"
    )
    resp = await svc.verify_phone_number(req)
    assert resp.success is False
    assert "Invalid phone number format" in resp.message


@pytest.mark.asyncio
async def test_verify_phone_invalid_number_including_letters(svc):
    req = PhoneVerificationRequest(
        country_code="+30", phone_number="1234adsdf5", onboarding_session_id="sess123"
    )
    resp = await svc.verify_phone_number(req)
    assert resp.success is False
    assert "Invalid phone number format" in resp.message


@pytest.mark.asyncio
async def test_verify_phone_sms_failure(fake_db, fake_sms_fail, monkeypatch):

    svc = UserService(db=fake_db, code_pepper="pepper123")
    svc.notification_service = fake_sms_fail

    # determinism
    async def _fixed_code(_len=4):
        return "1234"

    monkeypatch.setattr(svc, "_generate_code", _fixed_code)

    req = PhoneVerificationRequest(
        country_code="+30", phone_number="6948347822", onboarding_session_id="sess123"
    )
    resp = await svc.verify_phone_number(req)
    assert resp.success is False
    assert "Failed to send verification code" in resp.message


# test verify_phone_code
@pytest.mark.asyncio
async def test_verify_phone_code_happy_path(svc, fake_db):
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=10)

    code = "8989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "verif123",
            "channel": "phone",
            "onboarding_session_id": "sess123",
            "target": "+306948347822",
            "step": "phone_code_sent",
            "attempts": 0,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": now,
            "last_sent_at": now,
            "expires_at": expires,
            "used_at": None,
        }
    )

    req = PhoneVerificationCodeRequest(
        verification_id="verif123",
        code=code,
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_phone_code(req)

    assert resp.success is True
    assert resp.message.lower().startswith("phone number verified")
    assert resp.onboarding_session_id == "sess123"

    # DB side-effects happened?
    verif_coll = fake_db["verification_sessions"]
    assert len(verif_coll.docs) == 1
    doc = verif_coll.docs[0]
    assert doc["onboarding_session_id"] == "sess123"
    assert doc["channel"] == "phone"
    assert doc["target"] == "+306948347822"
    assert doc["attempts"] == 1
    assert doc["used_at"] == now
    assert doc["expires_at"] == expires
    assert "code_hash" in doc

    # onboarding session step updated?
    sess_coll = fake_db["onboarding_sessions"]
    assert sess_coll.updates  # one update_one call recorded
    assert len(sess_coll.updates) == 1
    _flt, update = sess_coll.updates[0]
    assert _flt == {"_id": "sess123"}  # correct target session
    assert "$set" in update
    assert update["$set"]["step"] == "phone_verified"
    assert update["$set"]["phone.verified"] is True
    assert "phone.verified_at" in update["$set"]
    assert "updated_at" in update["$set"]


@pytest.mark.asyncio
async def test_verify_phone_code_expired(svc, fake_db, monkeypatch):

    mod = importlib.import_module(svc.__class__.__module__)
    fixed_now = dt.datetime(2025, 1, 1, 12, 0, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(mod, "now_utc", lambda: fixed_now)

    code = "8989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "verif123",
            "channel": "phone",
            "onboarding_session_id": "sess123",
            "target": "+306948347822",
            "step": "phone_code_sent",
            "attempts": 0,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": fixed_now - dt.timedelta(minutes=2),
            "last_sent_at": fixed_now - dt.timedelta(minutes=2),
            "expires_at": fixed_now - dt.timedelta(minutes=2),
            "used_at": None,
        }
    )

    req = PhoneVerificationCodeRequest(
        verification_id="verif123",
        code=code,
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_phone_code(req)

    assert resp.success is False
    assert resp.message.lower().startswith("invalid or expired")


@pytest.mark.asyncio
async def test_verify_phone_code_expired_edge_case(svc, fake_db, monkeypatch):

    mod = importlib.import_module(svc.__class__.__module__)
    fixed_now = dt.datetime(2025, 1, 1, 12, 0, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(mod, "now_utc", lambda: fixed_now)

    code = "8989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "verif123",
            "channel": "phone",
            "onboarding_session_id": "sess123",
            "target": "+306948347822",
            "step": "phone_code_sent",
            "attempts": 0,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": fixed_now,
            "last_sent_at": fixed_now,
            "expires_at": fixed_now,
            "used_at": None,
        }
    )

    req = PhoneVerificationCodeRequest(
        verification_id="verif123",
        code=code,
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_phone_code(req)

    assert resp.success is False
    assert resp.message.lower().startswith("invalid or expired")


@pytest.mark.asyncio
async def test_verify_phone_code_already_used(svc, fake_db, monkeypatch):
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=10)

    used_at = dt.datetime(2025, 1, 1, 12, 0, tzinfo=dt.timezone.utc)
    code = "8989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "verif123",
            "channel": "phone",
            "onboarding_session_id": "sess123",
            "target": "+306948347822",
            "step": "phone_code_sent",
            "attempts": 0,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": now,
            "last_sent_at": now,
            "expires_at": expires,
            "used_at": used_at,
        }
    )

    req = PhoneVerificationCodeRequest(
        verification_id="verif123",
        code=code,
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_phone_code(req)

    assert resp.success is False
    assert resp.message.lower().startswith("invalid or expired")


@pytest.mark.asyncio
async def test_verify_phone_code_too_many_attempts(svc, fake_db, monkeypatch):
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=10)

    attempts = 6
    code = "8989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "verif123",
            "channel": "phone",
            "onboarding_session_id": "sess123",
            "target": "+306948347822",
            "step": "phone_code_sent",
            "attempts": attempts,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": now,
            "last_sent_at": now,
            "expires_at": expires,
            "used_at": None,
        }
    )

    req = PhoneVerificationCodeRequest(
        verification_id="verif123",
        code=code,
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_phone_code(req)

    assert resp.success is False
    assert resp.message.lower().startswith("too many attempts")


@pytest.mark.asyncio
async def test_verify_phone_code_incorrect_code(svc, fake_db, monkeypatch):
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=3)

    code = "8989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "verif123",
            "channel": "phone",
            "onboarding_session_id": "sess123",
            "target": "+306948347822",
            "step": "phone_code_sent",
            "attempts": 0,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": now,
            "last_sent_at": now,
            "expires_at": expires,
            "used_at": None,
        }
    )

    req = PhoneVerificationCodeRequest(
        verification_id="verif123",
        code="wron",
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_phone_code(req)

    assert resp.success is False
    assert resp.message.lower().startswith("incorrect verification code")


# async def test_verify_phone_code_code_already_used(svc, fake_db, monkeypatch):


# test verify_email
@pytest.mark.asyncio
async def test_verify_email_happy_path(svc, fake_db, monkeypatch):
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=15)

    phone_number = "+306911110000"
    code = "8989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["onboarding_sessions"].insert_one(
        {
            "_id": "sess123",
            "status": "draft",
            "step": "email_code_sent",
            "phone": {
                "number_e164": phone_number,
                "verified": True,
                "verified_at": None,
            },
            "email": {"address": None, "verified": False, "verified_at": None},
            "data": {},
            "created_at": expires,
            "updated_at": None,
        }
    )

    req = EmailVerificationRequest(
        email="test_email@example.com",
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_email(req)

    assert resp.success is True
    assert resp.message.lower().startswith("verification code sent")
    assert resp.onboarding_session_id == "sess123"
    assert resp.verification_id == "sess_fixed"

    # DB side-effects happened?
    verif_coll = fake_db["verification_sessions"]
    assert len(verif_coll.docs) == 1
    doc = verif_coll.docs[0]
    assert doc["onboarding_session_id"] == "sess123"
    assert doc["channel"] == "email"
    assert doc["target"] == "test_email@example.com"
    assert doc["attempts"] == 0
    assert doc["used_at"] == None
    assert doc["expires_at"] is not None
    assert "code_hash" in doc

    # onboarding session step updated?
    sess_coll = fake_db["onboarding_sessions"]
    assert sess_coll.updates  # one update_one call recorded
    assert len(sess_coll.updates) == 2

    _flt, update = sess_coll.updates[0]
    assert _flt == {"_id": "sess123"}  # correct target session
    assert "$set" in update
    assert update["$set"]["step"] == "email_started"
    assert update["$set"]["email.address"] == "test_email@example.com"
    assert "updated_at" in update["$set"]

    _flt2, update2 = sess_coll.updates[1]
    assert update2["$set"]["step"] == "email_code_sent"


# test verify_email
@pytest.mark.asyncio
async def test_verify_email_code_happy_path(svc, fake_db, monkeypatch):
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=15)

    email = "test_email@example.com"
    code = "898989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "sess_fixed",
            "channel": "email",
            "onboarding_session_id": "sess123",
            "target": email,
            "step": "email_code_sent",
            "attempts": 0,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": now,
            "last_sent_at": now,
            "expires_at": expires,
            "used_at": None,
        }
    )

    req = EmailVerificationCodeRequest(
        verification_id="sess_fixed",
        code=code,
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_email_code(req)

    assert resp.success is True
    assert resp.message.lower().startswith("email verified successfully")
    assert resp.onboarding_session_id == "sess123"

    # DB side-effects happened?
    verif_coll = fake_db["verification_sessions"]
    assert len(verif_coll.docs) == 1
    doc = verif_coll.docs[0]
    assert doc["onboarding_session_id"] == "sess123"
    assert doc["channel"] == "email"
    assert doc["target"] == "test_email@example.com"
    assert doc["attempts"] == 1
    assert doc["used_at"] is not None
    assert doc["expires_at"] is not None
    assert "code_hash" in doc

    assert len(verif_coll.updates) == 2
    _flt2, update2 = verif_coll.updates[1]
    assert update2["$set"]["used_at"] is not None


@pytest.mark.asyncio
async def test_verify_email_code_expired_code(svc, fake_db, monkeypatch):
    mod = importlib.import_module(svc.__class__.__module__)
    fixed_now = dt.datetime(2025, 9, 6, 16, 21, 11, 820948, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(mod, "now_utc", lambda: fixed_now)

    expires = fixed_now + dt.timedelta(minutes=15)

    email = "test_email@example.com"
    code = "898989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "sess_fixed",
            "channel": "email",
            "onboarding_session_id": "sess123",
            "target": email,
            "step": "email_code_sent",
            "attempts": 0,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": fixed_now,
            "last_sent_at": fixed_now,
            "expires_at": fixed_now - dt.timedelta(minutes=2),
            "used_at": None,
        }
    )

    req = EmailVerificationCodeRequest(
        verification_id="sess_fixed",
        code=code,
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_email_code(req)

    assert resp.success is False
    assert resp.message.lower().startswith("invalid or expired")


@pytest.mark.asyncio
async def test_verify_email_too_many_attempts(svc, fake_db, monkeypatch):
    now = dt.datetime.now(dt.timezone.utc)
    expires = now + dt.timedelta(minutes=15)

    attempts = 6
    email = "test_email@example.com"
    code = "898989"
    code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

    await fake_db["verification_sessions"].insert_one(
        {
            "verification_id": "sess_fixed",
            "channel": "email",
            "onboarding_session_id": "sess123",
            "target": email,
            "step": "email_code_sent",
            "attempts": attempts,
            "max_attempts": 5,
            "code_hash": code_hash,
            "sent_at": now,
            "last_sent_at": now,
            "expires_at": expires,
            "used_at": None,
        }
    )

    req = EmailVerificationCodeRequest(
        verification_id="sess_fixed",
        code=code,
        onboarding_session_id="sess123",
    )
    resp = await svc.verify_email_code(req)

    assert resp.success is False
    assert resp.message.lower().startswith("too many attempts. please")


# @pytest.mark.asyncio
# async def test_verify_email_second_attempt(svc, fake_db, monkeypatch):
#     now = dt.datetime.now(dt.timezone.utc)
#     expires = now + dt.timedelta(minutes=15)

#     email = "test_email@example.com"
#     code = "898989"
#     code_hash = svc._test_hash(code)  # -> "TESTHASH:8989"

#     await fake_db["verification_sessions"].insert_one({
#         "verification_id": "sess_fixed",
#         "channel": "email",
#         "onboarding_session_id": "sess123",
#         "target": email,
#         "step": "email_code_sent",
#         "attempts": 0,
#         "max_attempts": 5,
#         "code_hash": code_hash,
#         "sent_at": now,
#         "last_sent_at": now,
#         "expires_at": expires,
#         "used_at": None,
#     })

#     req = EmailVerificationCodeRequest(
#         verification_id="sess_fixed",
#         code = code,
#         onboarding_session_id="sess123",
#     )
#     resp = await svc.verify_email_code(req)
#     fake_db["verification_sessions"]["used_at"] = None
#     resp2 = await svc.verify_email_code(req)

#     verif_coll = fake_db["verification_sessions"]
#     # count the $inc attempts updates for this verification_id
#     inc_calls = [
#         upd for flt, upd in verif_coll.updates
#         if flt.get("verification_id") == req.verification_id
#         and "$inc" in upd
#         and upd["$inc"].get("attempts") == 1
#     ]
#     assert len(inc_calls) == 2  # attempts incremented twice

#     # onboarding_sessions should be updated once (on first successful verify)
#     sess_coll = fake_db["onboarding_sessions"]
#     assert len(sess_coll.updates) == 1
#     flt, upd = sess_coll.updates[0]
#     assert flt == {"_id": "sess123"}
#     assert upd["$set"]["step"] == "email_verified"
#     assert upd["$set"]["email.verified"] is True


# ---------- set_business_country ----------


@pytest.mark.asyncio
async def test_set_business_country_happy_path(svc, fake_db, monkeypatch):
    # Freeze now_utc for deterministic assertions
    mod = importlib.import_module(svc.__class__.__module__)
    fixed_now = dt.datetime(2025, 1, 1, 12, 0, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(mod, "now_utc", lambda: fixed_now)

    await fake_db["onboarding_sessions"].insert_one(
        {
            "_id": "sess123",
            "data": {},
            "step": "start",
            "updated_at": None,
        }
    )

    req = BusinessCountryRequest(onboarding_session_id="sess123", country="GR")

    resp = await svc.set_business_country(req)
    assert resp["success"] is True
    assert resp["message"] == "Business country set to GR"

    # Assert the update_one call on onboarding_sessions
    sess_coll = fake_db["onboarding_sessions"]
    assert len(sess_coll.updates) == 1
    flt, update = sess_coll.updates[0]
    assert flt == {"_id": "sess123"}
    assert update["$set"]["data.business_country"] == "GR"
    assert update["$set"]["step"] == "business_country_set"
    assert update["$set"]["updated_at"] == fixed_now


@pytest.mark.asyncio
async def test_set_business_country_session_not_found(svc, fake_db, monkeypatch):
    # Force update_one to report no match
    async def no_match(_flt, _upd):
        return SimpleNamespace(matched_count=0, modified_count=0)

    monkeypatch.setattr(svc.sessions_collection, "update_one", no_match)

    await fake_db["onboarding_sessions"].insert_one(
        {
            "_id": "sess123",
            "data": {},
            "step": "start",
            "updated_at": None,
        }
    )

    req = BusinessCountryRequest(onboarding_session_id="missing", country="GR")
    resp = await svc.set_business_country(req)
    assert resp["success"] is False
    assert resp["message"] == "Onboarding session not found"


# ---------- set_business_info ----------


@pytest.mark.asyncio
async def test_set_business_info_happy_path(svc, fake_db, monkeypatch):
    # Freeze time for deterministic assertions
    mod = importlib.import_module(svc.__class__.__module__)
    fixed_now = dt.datetime(2025, 1, 1, 12, 30, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(mod, "now_utc", lambda: fixed_now)

    # Seed the session so the update can match
    await fake_db["onboarding_sessions"].insert_one(
        {
            "_id": "sess123",
            "data": {},
            "step": "start",
            "updated_at": None,
        }
    )

    req = BusinessInfoRequest(
        onboarding_session_id="sess123",
        company_name="Acme SA",
        company_vat="EL123456789",
        company_gemi_number="123456789000",
        company_type="SA",
        company_zip="10558",
        company_municipality="Athens",
        company_city="Athens",
        company_street="Example",
        company_street_number="1",
        company_phone="+302108765432",
        company_email="info@example.com",
        company_objective="Retail",
        company_status="active",
        company_gemi_office="Athens",
    )

    resp = await svc.set_business_info(req)
    assert resp["success"] is True
    # (message contains a dict; don't assert exact string formatting)

    sess_coll = fake_db["onboarding_sessions"]
    assert len(sess_coll.updates) == 1
    flt, update = sess_coll.updates[0]
    assert flt == {"_id": "sess123"}
    assert "$set" in update
    assert update["$set"]["step"] == "business_info_set"
    assert update["$set"]["updated_at"] == fixed_now

    expected_info = {
        "company_name": "Acme SA",
        "company_vat": "EL123456789",
        "company_gemi_number": "123456789000",
        "company_type": "SA",
        "company_zip": "10558",
        "company_municipality": "Athens",
        "company_city": "Athens",
        "company_street": "Example",
        "company_street_number": "1",
        "company_phone": "+302108765432",
        "company_email": "info@example.com",
        "company_objective": "Retail",
        "company_status": "active",
        "company_gemi_office": "Athens",
    }
    assert update["$set"]["data.business_info"] == expected_info


# ---------- set_business_info (missing session id raises) ----------


@pytest.mark.asyncio
async def test_set_business_info_missing_session_id_raises(svc, fake_db):
    with pytest.raises(ValueError):
        await svc.set_business_info(
            BusinessInfoRequest(
                # onboarding_session_id omitted on purpose
                company_name="Acme SA",
                company_vat="EL123456789",
                company_gemi_number="123456789000",
                company_type="SA",
                company_zip="10558",
                company_municipality="Athens",
                company_city="Athens",
                company_street="Example",
                company_street_number="1",
                company_phone="+302108765432",
                company_email="info@example.com",
                company_objective="Retail",
                company_status="active",
                company_gemi_office="Athens",
            )
        )


# ---------- set_business_info (session not found) ----------


@pytest.mark.asyncio
async def test_set_business_info_session_not_found(svc, fake_db, monkeypatch):
    # Force update to report no match regardless of data
    async def no_match(_flt, _upd):
        return SimpleNamespace(matched_count=0, modified_count=0)

    monkeypatch.setattr(svc.sessions_collection, "update_one", no_match)

    req = BusinessInfoRequest(
        onboarding_session_id="missing",
        company_name="Acme SA",
        company_vat="EL123456789",
        company_gemi_number="123456789000",
        company_type="SA",
        company_zip="10558",
        company_municipality="Athens",
        company_city="Athens",
        company_street="Example",
        company_street_number="1",
        company_phone="+302108765432",
        company_email="info@example.com",
        company_objective="Retail",
        company_status="active",
        company_gemi_office="Athens",
    )

    resp = await svc.set_business_info(req)
    assert resp["success"] is False
    assert resp["message"] == "Onboarding session not found"


# ---------- update_shareholders ----------


@pytest.mark.asyncio
async def test_update_shareholders_happy_path(svc, fake_db, monkeypatch):
    # Freeze time
    mod = importlib.import_module(svc.__class__.__module__)
    fixed_now = dt.datetime(2025, 1, 1, 13, 0, tzinfo=dt.timezone.utc)
    monkeypatch.setattr(mod, "now_utc", lambda: fixed_now)

    # Deterministic id for shareholders missing id
    import secrets

    monkeypatch.setattr(secrets, "token_urlsafe", lambda n: "sh_fixed")

    # Seed the session so update matches
    await fake_db["onboarding_sessions"].insert_one(
        {
            "_id": "sess123",
            "data": {},
            "step": "start",
            "updated_at": None,
        }
    )

    req = ShareholderInfoRequest(
        onboarding_session_id="sess123",
        shareholders=[
            ShareholderInfo(  # has explicit id + mixed-case email to test lowercasing
                id="sh_1",
                first_name="Alice",
                last_name="Papadopoulos",
                email="Alice@Example.com",
            ),
            ShareholderInfo(  # no id + no email → becomes None
                id=None,
                first_name="Bob",
                last_name="Georgiou",
                email=None,
            ),
        ],
    )

    resp = await svc.update_shareholders(req)
    assert resp["success"] is True

    sess_coll = fake_db["onboarding_sessions"]
    # exactly one update_one issued by the method
    assert len(sess_coll.updates) == 1
    flt, update = sess_coll.updates[0]

    assert flt == {"_id": "sess123"}
    assert "$set" in update
    assert update["$set"]["step"] == "shareholders_updated"
    assert update["$set"]["updated_at"] == fixed_now

    payload = update["$set"]["data.shareholders"]
    assert isinstance(payload, list) and len(payload) == 2

    sh1, sh2 = payload

    # 1) preserves id; email lowercased; timestamps set
    assert sh1["_id"] == "sh_1"
    assert sh1["first_name"] == "Alice"
    assert sh1["last_name"] == "Papadopoulos"
    assert sh1["email"] == "alice@example.com"
    assert sh1["created_at"] == fixed_now
    assert sh1["updated_at"] == fixed_now

    # 2) generates id; None email propagated; timestamps set
    assert sh2["_id"] == "sh_fixed"
    assert sh2["first_name"] == "Bob"
    assert sh2["last_name"] == "Georgiou"
    assert sh2["email"] is None
    assert sh2["created_at"] == fixed_now
    assert sh2["updated_at"] == fixed_now


@pytest.mark.asyncio
async def test_update_shareholders_session_not_found(svc, fake_db, monkeypatch):
    # Force the collection to report no match
    async def no_match(_flt, _upd):
        return SimpleNamespace(matched_count=0, modified_count=0)

    monkeypatch.setattr(svc.sessions_collection, "update_one", no_match)

    req = ShareholderInfoRequest(
        onboarding_session_id="missing",
        shareholders=[
            ShareholderInfo(id=None, first_name="A", last_name="B", email=None)
        ],
    )

    resp = await svc.update_shareholders(req)
    assert resp["success"] is False
    assert resp["message"] == "Onboarding session not found"
