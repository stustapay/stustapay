import asyncpg

from .config import Config


async def create_db_pool(cfg: Config) -> asyncpg.Pool:
    """
    get a connection pool to the database
    """
    return await asyncpg.create_pool(
        user=cfg.database.user,
        password=cfg.database.password,
        database=cfg.database.dbname,
        host=cfg.database.host,
    )
