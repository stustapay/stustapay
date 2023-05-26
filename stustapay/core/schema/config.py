from typing import Optional

from pydantic import BaseModel


class ConfigEntry(BaseModel):
    key: str
    value: Optional[str]


class PublicConfig(BaseModel):
    test_mode: bool
    test_mode_message: str
    currency_symbol: str
    currency_identifier: str
