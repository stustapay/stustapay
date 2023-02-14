import yaml

from pydantic import BaseModel

from ..core.config import DatabaseConfig
from .diebold_nixdorf_usb.config import DieboldNixdorfUSBTSEConfig
from .dummy.handler import DummyTSEConfig


class Config(BaseModel):
    database: DatabaseConfig
    tses: list[DieboldNixdorfUSBTSEConfig | DummyTSEConfig]


def read_config(config_path: str) -> Config:
    with open(config_path, "r") as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
