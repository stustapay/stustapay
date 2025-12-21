import os
from datetime import timedelta

import yaml
from pydantic import BaseModel
from sftkit.database import DatabaseConfig
from sftkit.http import HTTPServerConfig


class AdministrationApiConfig(HTTPServerConfig):
    base_url: str
    host: str = "localhost"
    port: int = 8081


class TerminalApiConfig(HTTPServerConfig):
    base_url: str
    host: str = "localhost"
    port: int = 8080


class CoreConfig(BaseModel):
    test_mode: bool = False
    test_mode_message: str = ""
    secret_key: str
    jwt_token_algorithm: str = "HS256"

    sumup_enabled: bool = False
    sumup_max_check_interval: int = 300
    sumup_payment_timeout: timedelta = timedelta(days=1)

    pretix_enabled: bool = False
    pretix_synchronization_interval: timedelta = timedelta(minutes=5)


class CustomerPortalApiConfig(HTTPServerConfig):
    base_url: str
    host: str = "localhost"
    port: int = 8082


class HeadwindConfig(BaseModel):
    enabled: bool = False
    base_url: str
    # Credentials for JWT login (/rest/public/jwt/login)
    login: str
    password_md5: str
    request_timeout_seconds: float = 10.0
    device_search_path: str = "/rest/private/devices/search"
    device_search_method: str = "POST"


class Config(BaseModel):
    database: DatabaseConfig
    core: CoreConfig
    administration: AdministrationApiConfig
    terminalserver: TerminalApiConfig
    customerportal: CustomerPortalApiConfig
    headwind: HeadwindConfig


def read_config(config_path: os.PathLike) -> Config:
    with open(config_path, "r") as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
