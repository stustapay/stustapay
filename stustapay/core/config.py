from typing import Optional

import yaml
from pydantic import BaseModel


class HTTPServerConfig(BaseModel):
    host: str
    port: int


class AdministrationApiConfig(HTTPServerConfig):
    base_url: str
    host: str = "localhost"
    port: int = 8081


class TerminalApiConfig(HTTPServerConfig):
    base_url: str
    host: str = "localhost"
    port: int = 8080


class DatabaseConfig(BaseModel):
    user: Optional[str] = None
    password: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = 5432
    dbname: str


class CoreConfig(BaseModel):
    test_mode: bool = False
    test_mode_message: str = ""
    secret_key: str
    jwt_token_algorithm: str = "HS256"
    sumup_affiliate_key: str = "unset"


class SumupConfig(BaseModel):
    enabled: bool = False
    client_id: str = ""
    client_secret: str = ""
    merchant_code: str = ""
    return_url: str = ""
    redirect_url: str = ""


class CustomerPortalApiConfig(HTTPServerConfig):
    base_url: str
    host: str = "localhost"
    port: int = 8082
    base_bon_url: str
    data_privacy_url: str
    about_page_url: str

    sumup_config: SumupConfig = SumupConfig()


class Config(BaseModel):
    administration: AdministrationApiConfig
    terminalserver: TerminalApiConfig
    database: DatabaseConfig
    core: CoreConfig
    customer_portal: CustomerPortalApiConfig


def read_config(config_path: str) -> Config:
    with open(config_path, "r") as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
