from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, utils
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

CURVE = ec.BrainpoolP384R1()
COORDINATE_SIZE = CURVE.key_size // 8
SIGNATURE_SIZE = COORDINATE_SIZE * 2


def private_key_from_hex(private_key_hex: str) -> ec.EllipticCurvePrivateKey:
    return ec.derive_private_key(int.from_bytes(bytes.fromhex(private_key_hex), "big"), CURVE)


def generate_private_key() -> ec.EllipticCurvePrivateKey:
    return ec.generate_private_key(CURVE)


def private_key_to_hex(private_key: ec.EllipticCurvePrivateKey) -> str:
    return private_key.private_numbers().private_value.to_bytes(COORDINATE_SIZE, "big").hex()


def public_key_to_raw_bytes(public_key: ec.EllipticCurvePublicKey) -> bytes:
    # TSE expects the raw uncompressed point without the SEC1 0x04 prefix.
    point = public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    return point[1:]


def public_key_from_raw_bytes(raw_public_key: bytes) -> ec.EllipticCurvePublicKey:
    return ec.EllipticCurvePublicKey.from_encoded_point(CURVE, b"\x04" + raw_public_key)


def sign_raw(private_key: ec.EllipticCurvePrivateKey, message: bytes) -> bytes:
    der_signature = private_key.sign(message, ec.ECDSA(hashes.SHA384()))
    r_value, s_value = utils.decode_dss_signature(der_signature)
    return r_value.to_bytes(COORDINATE_SIZE, "big") + s_value.to_bytes(COORDINATE_SIZE, "big")


def verify_raw(public_key: ec.EllipticCurvePublicKey, signature: bytes, message: bytes) -> bool:
    if len(signature) != SIGNATURE_SIZE:
        return False

    r_value = int.from_bytes(signature[:COORDINATE_SIZE], "big")
    s_value = int.from_bytes(signature[COORDINATE_SIZE:], "big")
    der_signature = utils.encode_dss_signature(r_value, s_value)
    try:
        public_key.verify(der_signature, message, ec.ECDSA(hashes.SHA384()))
        return True
    except InvalidSignature:
        return False
