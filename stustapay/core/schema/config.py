from typing import Optional

from pydantic import BaseModel

from stustapay.core.schema.language import Language


class ConfigEntry(BaseModel):
    key: str
    value: Optional[str]


class GlobalEmailConfig(BaseModel):
    email_enabled: bool
    email_default_sender: str | None = None
    email_smtp_host: str | None = None
    email_smtp_port: int | None = None
    email_smtp_username: str | None = None
    email_smtp_password: str | None = None
    invitation_texts: dict[Language, dict[str, str]] = {}


class GlobalSumUpConfig(BaseModel):
    sumup_affiliate_key: str = ""
    sumup_oauth_client_id: str = ""
    sumup_oauth_client_secret: str = ""


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
    smtp_host: str | None
    smtp_port: int | None
    smtp_username: str | None
    smtp_password: str | None
