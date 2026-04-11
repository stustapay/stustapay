"""Tests for stustapay.core.jwt decode hardening."""

import base64

import pytest

from stustapay.core.jwt import InvalidTokenError, decode, encode


def test_decode_round_trip() -> None:
    payload = {"sub": "user-1", "exp": 9_999_999_999}
    token = encode(payload, key="secret", algorithm="HS256")
    assert decode(token, key="secret", algorithms=["HS256"]) == payload


def test_decode_rejects_non_object_header() -> None:
    # Header JSON is `[]` — valid JSON, not a JWT header object.
    header_b64 = "W10"  # "[]" without padding, url-safe
    payload = encode({"sub": "x", "exp": 9_999_999_999}, key="secret", algorithm="HS256")
    parts = payload.split(".")
    bad_token = f"{header_b64}.{parts[1]}.{parts[2]}"
    with pytest.raises(InvalidTokenError, match="Malformed JWT header"):
        decode(bad_token, key="secret", algorithms=["HS256"])


def test_decode_rejects_non_object_header_string() -> None:
    header_b64 = base64.urlsafe_b64encode(b'"HS256"').decode("ascii").rstrip("=")
    payload = encode({"sub": "x", "exp": 9_999_999_999}, key="secret", algorithm="HS256")
    parts = payload.split(".")
    bad_token = f"{header_b64}.{parts[1]}.{parts[2]}"
    with pytest.raises(InvalidTokenError, match="Malformed JWT header"):
        decode(bad_token, key="secret", algorithms=["HS256"])
