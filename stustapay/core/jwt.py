import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Iterable


class InvalidTokenError(Exception):
    pass


_DIGESTS = {
    "HS256": hashlib.sha256,
    "HS384": hashlib.sha384,
    "HS512": hashlib.sha512,
}


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _get_digest(algorithm: str):
    try:
        return _DIGESTS[algorithm]
    except KeyError as exc:
        raise InvalidTokenError(f"Unsupported JWT algorithm: {algorithm}") from exc


def _validate_claim_times(payload: dict):
    now = datetime.now(timezone.utc).timestamp()

    for claim in ("exp", "nbf", "iat"):
        if claim in payload and not isinstance(payload[claim], (int, float)):
            raise InvalidTokenError(f"Invalid JWT claim type for {claim}")

    if "exp" in payload and payload["exp"] < now:
        raise InvalidTokenError("JWT expired")
    if "nbf" in payload and payload["nbf"] > now:
        raise InvalidTokenError("JWT not yet valid")
    if "iat" in payload and payload["iat"] > now:
        raise InvalidTokenError("JWT issued in the future")


def encode(payload: dict, key: str, algorithm: str) -> str:
    digest = _get_digest(algorithm)
    header = {"alg": algorithm, "typ": "JWT"}
    encoded_header = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    signature = hmac.new(key.encode("utf-8"), signing_input, digest).digest()
    return f"{encoded_header}.{encoded_payload}.{_b64url_encode(signature)}"


def decode(token: str, key: str, algorithms: Iterable[str]) -> dict:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
    except ValueError as exc:
        raise InvalidTokenError("Malformed JWT") from exc

    try:
        header = json.loads(_b64url_decode(encoded_header))
        payload = json.loads(_b64url_decode(encoded_payload))
    except (json.JSONDecodeError, ValueError) as exc:
        raise InvalidTokenError("Malformed JWT payload") from exc

    if not isinstance(header, dict):
        raise InvalidTokenError("Malformed JWT header")

    algorithm = header.get("alg")
    if algorithm not in algorithms:
        raise InvalidTokenError("JWT algorithm not allowed")

    digest = _get_digest(algorithm)
    signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
    expected_signature = hmac.new(key.encode("utf-8"), signing_input, digest).digest()
    actual_signature = _b64url_decode(encoded_signature)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise InvalidTokenError("Invalid JWT signature")

    if not isinstance(payload, dict):
        raise InvalidTokenError("Invalid JWT payload")

    _validate_claim_times(payload)
    return payload
