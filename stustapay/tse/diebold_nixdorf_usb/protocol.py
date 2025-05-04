"""
errorcodes from the manual
"""

from typing import Literal, NotRequired, TypedDict

errors = {
    1: "JSON_CODE_COMMAND_UNKNOWN",
    2: "JSON_CODE_COMMAND_UNSUPPORTED",
    3: "JSON_CODE_PARAMETER_MISSING",
    4: "JSON_CODE_PARAMETER_INVALID",
    5: "JSON_CODE_COMMAND_CANNOT_BE_PROCESSED",
    9: "JSON_CODE_PARAMETER_INVALID_BASE64",
    19: "JSON_CODE_ERROR_CLIENT_NOT_REGISTERED",
    21: "JSON_CODE_MAX_PARALLEL_TRANSACTIONS_REACHED",
    23: "JSON_CODE_MAX_REGISTERED_CLIENTS_REACHED",
    24: "JSON_CODE_ERROR_CLIENT_HAS_UNFINISHED_TRANSACTIONS",
    27: "JSON_CODE_ERROR_PARAMETER_PASSWORD_INVALID",
    28: "JSON_CODE_ERROR_PARAMETER_PUK_INVALID",
    29: "JSON_CODE_ERROR_PARAMETER_USER_WRONG",
    30: "JSON_CODE_ERROR_PARAMETER_PASSWORD_WRONG",
    31: "JSON_CODE_ERROR_PARAMETER_PUK_WRONG",
    32: "JSON_CODE_ERROR_PARAMETER_USER_BLOCKED",
    33: "JSON_CODE_ERROR_PARAMETER_PUK_BLOCKED --- now you are fucked!",
    34: "JSON_CODE_ERROR_PARAMETER_PASSWORD_SAME",
    1337: "ClientID name not allowed (reserved as Production-ClientID)",
    5017: "ERROR_NO_ORDER",
}


Parameters = TypedDict("Parameters", {"SignatureAlgorithm": str})
DeviceInfo = TypedDict("DeviceInfo", {"SerialNumber": str, "TimeFormat": str})

TseSuccess = TypedDict(
    "TseSuccess",
    {
        "Status": Literal["ok"],
        "TransactionNumber": NotRequired[int],
        "SerialNumber": NotRequired[str],
        "SignatureCounter": NotRequired[int],
        "Signature": NotRequired[str],
        "LogTime": NotRequired[str],
        "Parameters": NotRequired[Parameters],
        "DeviceInfo": NotRequired[DeviceInfo],
        "Name": NotRequired[str],
        "Value": NotRequired[str],
        "Length": NotRequired[int],
        "ClientIDs": NotRequired[list],
        "TSEDescription": NotRequired[str],
        "CertificateDate": NotRequired[str],
    },
)
TseError = TypedDict(
    "TseError",
    {"Status": Literal["error"], "Code": int, "Desc": str},
)

TseResponse = TseSuccess | TseError


def dnerror(code) -> TseError:
    return {"Status": "error", "Code": code, "Desc": errors[code]}
