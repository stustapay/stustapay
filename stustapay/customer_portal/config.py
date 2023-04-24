from typing import Optional

import yaml
from pydantic import BaseModel
from stustapay.core.config import HTTPServerConfig


class CustomerPortalApiConfig(HTTPServerConfig):
    base_url: str
    host: str = "localhost"
    port: int = 8082


class DatabaseConfig(BaseModel):
    user: Optional[str] = None
    password: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = 5432
    dbname: str


class Config(BaseModel):
    customer_portal: CustomerPortalApiConfig
    database: DatabaseConfig


def read_config(config_path: str) -> Config:
    with open(config_path, "r") as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
