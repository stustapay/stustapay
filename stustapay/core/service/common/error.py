from typing import Union


class ServiceException(Exception):
    id: str


class NotFound(ServiceException):
    """
    raised when something wasn't found.
    """

    id = "NotFound"

    def __init__(self, element_typ: str, element_id: Union[str, int]):
        self.element_typ = element_typ  # eg. order
        self.element_id = element_id  # e.g. 5

    def __str__(self):
        return f"{self.element_typ} with id {self.element_id} not found"


class InvalidArgument(ServiceException):
    """
    raised, when the argument error cannot be caught with pydantic, e.g. because of database constraints
    """

    id = "InvalidArgument"

    def __init__(self, msg: str):
        self.msg = msg


class AccessDenied(ServiceException):
    id = "AccessDenied"

    def __init__(self, msg: str):
        self.msg = msg

    def __str__(self):
        return self.msg


class Unauthorized(ServiceException):
    id = "Unauthorized"

    def __init__(self, msg: str):
        self.msg = msg

    def __str__(self):
        return self.msg
