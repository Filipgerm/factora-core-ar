"""Access-token TTL: short default, extended when ``settings.demo_mode``."""

from __future__ import annotations

import uuid
from unittest.mock import patch

from app.config import settings as app_settings
from app.core.security.jwt import (
    ACCESS_TOKEN_TTL_MINUTES,
    ACCESS_TOKEN_TTL_MINUTES_DEMO,
    decode_access_token,
    encode_access_token,
)


def test_encode_access_token_ttl_default_not_demo() -> None:
    uid = str(uuid.uuid4())
    with patch("app.core.security.jwt.settings") as st:
        st.demo_mode = False
        st.JWT_SECRET_KEY = app_settings.JWT_SECRET_KEY
        tok, _ = encode_access_token(uid, role="owner", organization_id=None)
    payload = decode_access_token(tok)
    delta_sec = int(payload["exp"]) - int(payload["iat"])
    expected = ACCESS_TOKEN_TTL_MINUTES * 60
    assert expected - 5 <= delta_sec <= expected + 5


def test_encode_access_token_ttl_extended_in_demo() -> None:
    uid = str(uuid.uuid4())
    with patch("app.core.security.jwt.settings") as st:
        st.demo_mode = True
        st.JWT_SECRET_KEY = app_settings.JWT_SECRET_KEY
        tok, _ = encode_access_token(uid, role="owner", organization_id=None)
    payload = decode_access_token(tok)
    delta_sec = int(payload["exp"]) - int(payload["iat"])
    expected = ACCESS_TOKEN_TTL_MINUTES_DEMO * 60
    assert expected - 5 <= delta_sec <= expected + 5
    assert delta_sec > ACCESS_TOKEN_TTL_MINUTES * 60
