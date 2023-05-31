from typing import Union


class ServiceException(Exception):
    id: str


class NotFound(ServiceException):
    """
    raised when something wasn't found.
    """

    id = "NotFound"

    def __init__(self, element_typ: str, element_id: Union[str, int], hex_formatting: bool = False):
        self.element_typ = element_typ  # eg. order
        self.element_id = element_id  # e.g. 5
        self.hex_formatting = hex_formatting  # whether to format the id as hex or not

    @staticmethod
    def to_hex(element_id: Union[str, int]) -> str:
        if isinstance(element_id, str):
            return element_id
        return f"{element_id:#0{14}x}"

    def __str__(self):
        return f"{self.element_typ} with id {self.to_hex(self.element_id) if self.hex_formatting else self.element_id} not found"


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
