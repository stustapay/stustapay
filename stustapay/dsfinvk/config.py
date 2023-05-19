from typing import Iterable, Callable, Tuple

# import functools
# import logging

import yaml
from pydantic import BaseModel

from ..core.config import DatabaseConfig


class Config(BaseModel):
    database: DatabaseConfig


def read_config(config_path: str) -> Config:
    with open(config_path, "r") as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
