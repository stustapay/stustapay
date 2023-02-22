class ServiceException(Exception):
    id: str
    description: str  # allgemeine Fehler beschreibung


class NotFoundException(ServiceException):
    id = "NotFound"
    description = "Element not found"

    def __init__(self, element_typ: str, element_id: str):
        self.element_typ = element_typ  # eg. order
        self.element_id = element_id  # e.g. 5

    def __str__(self):
        return f"{self.element_typ} with id {self.element_id} not found"
