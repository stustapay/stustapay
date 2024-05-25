from typing import Optional

from pydantic import BaseModel


class ConfigEntry(BaseModel):
    key: str
    value: Optional[str]


class PublicConfig(BaseModel):
    test_mode: bool
    test_mode_message: str
    sumup_topup_enabled_globally: bool


class SEPAConfig(BaseModel):
    sender_name: str
    sender_iban: str
    # verwendungsungszweck
    description: str
    allowed_country_codes: list[str]
    max_num_payouts_in_run: int


class SMTPConfig(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_username: str
    smtp_password: str | None
