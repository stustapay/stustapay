import enum
from typing import Optional

from pydantic import BaseModel


class TseStatus(enum.Enum):
    new = "new"
    active = "active"
    disabled = "disabled"
    failed = "failed"


class Tse(BaseModel):
    tse_id: int
    tse_name: str
    tse_status: TseStatus
    tse_serial: Optional[str]
    tse_hashalgo: Optional[str]
    tse_time_format: Optional[str]
    tse_public_key: Optional[str]
    tse_certificate: Optional[str]
    tse_process_data_encoding: Optional[str]
