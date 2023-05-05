from typing import Optional

from pydantic import BaseModel


class ConfigEntry(BaseModel):
    key: str
    value: Optional[str]


class PublicConfig(BaseModel):
    currency_symbol: str
    currency_identifier: str
