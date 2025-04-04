import base64
import binascii
import enum
from typing import Annotated
from uuid import UUID

from pydantic import AfterValidator, BaseModel


class MimeType(enum.Enum):
    svg = "image/svg+xml"


def is_valid_base64(data: str) -> str:
    try:
        base64.b64decode(data)
        return data
    except binascii.Error as e:
        raise ValueError("Invalid base64 string") from e


class NewBlob(BaseModel):
    data: Annotated[str, AfterValidator(is_valid_base64)]  # base64 encoded
    mime_type: str

    def data_as_bytes(self):
        return base64.b64decode(self.data)

    def is_known_mimetype(self):
        return self.mime_type == MimeType.svg


class Blob(BaseModel):
    id: UUID
    data: bytes
    mime_type: str


class EventDesign(BaseModel):
    bon_logo_blob_id: UUID | None
