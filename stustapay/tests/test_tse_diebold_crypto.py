import pytest

from stustapay.tse.diebold_nixdorf_usb.crypto import (
    COORDINATE_SIZE,
    SIGNATURE_SIZE,
    generate_private_key,
    private_key_from_hex,
    private_key_to_hex,
    public_key_from_raw_bytes,
    public_key_to_raw_bytes,
    sign_raw,
    verify_raw,
)


@pytest.fixture(autouse=True)
async def setup_test_db_pool():
    yield None


def test_private_key_hex_roundtrip():
    private_key = generate_private_key()

    restored_key = private_key_from_hex(private_key_to_hex(private_key))

    assert private_key_to_hex(restored_key) == private_key_to_hex(private_key)


def test_sign_and_verify_raw_signature():
    private_key = generate_private_key()
    public_key = private_key.public_key()
    message = b"stustapay tse message"

    signature = sign_raw(private_key, message)

    assert len(signature) == SIGNATURE_SIZE
    assert verify_raw(public_key, signature, message)
    assert not verify_raw(public_key, signature, message + b"!")


def test_public_key_raw_bytes_roundtrip():
    private_key = generate_private_key()
    raw_public_key = public_key_to_raw_bytes(private_key.public_key())
    restored_public_key = public_key_from_raw_bytes(raw_public_key)
    message = b"roundtrip"
    signature = sign_raw(private_key, message)

    assert len(raw_public_key) == COORDINATE_SIZE * 2
    assert verify_raw(restored_public_key, signature, message)
