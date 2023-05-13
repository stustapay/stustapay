import ecdsa
from hashlib import sha384, sha256
import base64
from dateutil import parser
from datetime import timezone
import pprint
from asn1crypto.core import Integer, ObjectIdentifier, Sequence, OctetString, PrintableString, Any
import argparse


# initialize data structures
class SignatureAlgorithm_seq(Sequence):
    _fields = [
        ("signatureAlgorithm", ObjectIdentifier),
        ("parameters", OctetString, {"optional": True}),
    ]


class CertifiedData(Sequence):
    _fields = [
        ("operationType", PrintableString, {"implicit": 0}),
        ("clientId", PrintableString, {"implicit": 1}),
        ("ProcessData", OctetString, {"implicit": 2}),
        ("ProcessType", PrintableString, {"implicit": 3}),
        ("additionalExternalData", OctetString, {"implicit": 4, "optional": True}),
        ("transactionNumber", Integer, {"implicit": 5}),
        ("additionalInternalData", OctetString, {"implicit": 6, "optional": True}),
    ]


class TransactionData(Sequence):
    _fields = [
        ("Version", Integer),
        ("CertifiedDataType", ObjectIdentifier),
        ("CertifiedData", Any),
        ("SerialNumber", OctetString),
        ("signatureAlgorithm", Sequence),
        ("signatureCounter", Integer),
        ("LogTime", Integer),  # unixTime!
    ]


def main(args):
    qr = args.QR.split(";")

    certidata = CertifiedData()
    data = TransactionData()

    if qr[0] != "V0":  # check version
        raise NotImplemented

    certidata["clientId"] = qr[1]  # fill in data fields from QR code in prepared ASN.1 structure
    certidata["ProcessType"] = qr[2]
    certidata["ProcessData"] = qr[3].encode("utf-8")
    certidata["transactionNumber"] = int(qr[4])
    data["signatureCounter"] = int(qr[5])
    data["LogTime"] = int(parser.isoparse(qr[7].split(".")[0]).replace(tzinfo=timezone.utc).timestamp())

    public_key = qr[11]
    if qr[8] != "ecdsa-plain-SHA384":
        raise NotImplemented
    else:
        signaturealgorithm = SignatureAlgorithm_seq()
        signaturealgorithm["signatureAlgorithm"] = "0.4.0.127.0.7.1.1.4.1.4"  # ecdsa-plain-SHA384
        vk = ecdsa.VerifyingKey.from_string(base64.b64decode(public_key), curve=ecdsa.BRAINPOOLP384r1, hashfunc=sha384)

    if qr[9] != "unixTime":  # case sensitive != UnixTime ...
        raise NotImplemented
    signature = qr[10]

    certidata["operationType"] = "FinishTransaction"
    data["Version"] = 2
    data["CertifiedDataType"] = "0.4.0.127.0.7.3.7.1.1"  # transaction
    data["CertifiedData"] = certidata
    data["SerialNumber"] = sha256(base64.b64decode(public_key)).digest()
    data["signatureAlgorithm"] = signaturealgorithm

    message = (  # construct message to verify against signature ... why use ASN.1 Sequence, when you can make it more complicated?
        data["Version"].dump()
        + data["CertifiedDataType"].dump()
        + certidata["operationType"].dump()
        + certidata["clientId"].dump()
        + certidata["ProcessData"].dump()
        + certidata["ProcessType"].dump()
        + certidata["transactionNumber"].dump()
        + data["SerialNumber"].dump()
        + data["signatureAlgorithm"].dump()
        + data["signatureCounter"].dump()
        + data["LogTime"].dump()
    )

    pp = pprint.PrettyPrinter(indent=4)
    pp.pprint(data.native)
    print(f"raw message: {message.hex()!r}\n\n")
    try:  # verify
        result = vk.verify(base64.b64decode(signature), message)
        print(f"Signature valid: {result}")
    except ecdsa.BadSignatureError:
        print("Signature invalid")


if __name__ == "__main__":
    p = argparse.ArgumentParser(
        prog="TSE_Verify", description="Veryfies TSE QR codes", epilog="only ecdsa-plain-SHA384 and unixTime for now"
    )
    p.add_argument("QR", help="decoded QR code (str)")
    args = p.parse_args()
    main(args)
