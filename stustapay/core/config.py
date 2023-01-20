import yaml
from pydantic import BaseModel


class AdministrationApiConfig(BaseModel):
    host: str = "localhost"
    port: int = 8081


class TerminalApiConfig(BaseModel):
    host: str = "localhost"
    port: int = 8080


class DatabaseConfig(BaseModel):
    user: str
    password: str
    dbname: str
    host: str
    port: int = 5432


class Config(BaseModel):
    # in case all params are optional this is needed to make the whole section optional
    administration: AdministrationApiConfig = AdministrationApiConfig()
    terminalserver: TerminalApiConfig = TerminalApiConfig()
    database: DatabaseConfig


def read_config(config_path: str) -> Config:
    with open(config_path, "r") as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
