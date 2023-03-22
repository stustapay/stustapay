"""
database interaction
"""

from abc import ABC

from asyncpg.pool import Pool

from stustapay.core.config import Config


class DBService(ABC):
    """
    base class for all database interaction
    """

    def __init__(self, db_pool: Pool, config: Config):
        self.db_pool = db_pool
        self.cfg = config
