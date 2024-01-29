import os

import yaml
from pydantic import BaseModel

from stustapay.framework.database import DatabaseConfig


class HTTPServerConfig(BaseModel):
    base_url: str
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


class CoreConfig(BaseModel):
    test_mode: bool = False
    test_mode_message: str = ""
    secret_key: str
    jwt_token_algorithm: str = "HS256"

    sumup_enabled: bool = False
    sumup_max_check_interval: int = 300


class CustomerPortalApiConfig(HTTPServerConfig):
    base_url: str
    host: str = "localhost"
    port: int = 8082


class BonConfig(BaseModel):
    n_workers: int = 1


class Config(BaseModel):
    database: DatabaseConfig
    core: CoreConfig
    administration: AdministrationApiConfig
    terminalserver: TerminalApiConfig
    customerportal: CustomerPortalApiConfig
    bon: BonConfig


def read_config(config_path: os.PathLike) -> Config:
    with open(config_path, "r") as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
