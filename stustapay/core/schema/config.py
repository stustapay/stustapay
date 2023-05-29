from typing import Optional

from pydantic import BaseModel


class ConfigEntry(BaseModel):
    key: str
    value: Optional[str]


class PublicConfig(BaseModel):
    test_mode: bool
    test_mode_message: str
    sumup_topup_enabled: bool
    currency_symbol: str
    currency_identifier: str
    contact_email: str


class SEPAConfig(BaseModel):
    sender_name: str
    sender_iban: str
    # verwendungsungszweck
    description: str
