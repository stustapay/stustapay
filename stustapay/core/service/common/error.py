from sftkit.error import (
    AccessDenied,
    InvalidArgument,
    NotFound,
    ResourceNotAllowed,
    ServiceException,
    Unauthorized,
)

# we re-export all sftkit errors for better usage in stustapay
__all__ = [
    "ServiceException",
    "NotFound",
    "InvalidArgument",
    "ResourceNotAllowed",
    "Unauthorized",
    "AccessDenied",
    "EventRequired",
    "NodeIsReadOnly",
]


class EventRequired(ServiceException):
    id = "EventRequired"

    def __init__(self, msg: str):
        self.msg = msg

    def __str__(self):
        return self.msg


class NodeIsReadOnly(ServiceException):
    id = "NodeIsReadOnly"

    def __init__(self, msg: str):
        self.msg = msg

    def __str__(self):
        return self.msg
