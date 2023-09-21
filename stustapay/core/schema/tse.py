import enum
from typing import Optional

from pydantic import BaseModel


class TseStatus(enum.Enum):
    new = "new"
    active = "active"
    disabled = "disabled"
    failed = "failed"


class TseType(enum.Enum):
    diebold_nixdorf = "diebold_nixdorf"


class UpdateTse(BaseModel):
    name: str
    ws_url: str
    ws_timeout: float
    password: str


class NewTse(UpdateTse):
    type: TseType
    serial: Optional[str]


class Tse(NewTse):
    node_id: int
    id: int
    status: TseStatus
    hashalgo: Optional[str]
    time_format: Optional[str]
    public_key: Optional[str]
    certificate: Optional[str]
    process_data_encoding: Optional[str]
