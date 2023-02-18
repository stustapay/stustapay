import pathlib

import yaml
from pydantic import BaseModel

from stustapay.core.config import DatabaseConfig


class BonConfig(BaseModel):
    output_folder: pathlib.Path


class Config(BaseModel):
    database: DatabaseConfig
    bon: BonConfig


def read_config(config_path: str) -> Config:
    with open(config_path, "r") as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
