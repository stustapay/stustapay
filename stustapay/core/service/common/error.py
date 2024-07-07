from sftkit.error import ServiceException


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
