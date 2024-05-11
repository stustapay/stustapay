"""
perform schema updates and get a db shell.
"""

import logging
from pathlib import Path
from typing import Optional

import asyncpg.exceptions

from stustapay.framework.database import REVISION_TABLE, SchemaRevision
from stustapay.framework.database import apply_revisions as framework_apply_revisions
from stustapay.framework.database import reload_db_code as framework_reload_db_code

from .schema import DATA_PATH, DB_CODE_PATH, REVISION_PATH

logger = logging.getLogger(__name__)

CURRENT_REVISION = "43408ac4"


def list_revisions():
    revisions = SchemaRevision.revisions_from_dir(REVISION_PATH)
    for revision in revisions:
        print(f"Revision: {revision.version}, requires revision: {revision.requires}, filename: {revision.file_name}")


async def check_revision_version(db_pool: asyncpg.Pool):
    curr_revision = await db_pool.fetchval(f"select version from {REVISION_TABLE} limit 1")
    if curr_revision != CURRENT_REVISION:
        raise RuntimeError(
            f"Invalid database revision, expected {CURRENT_REVISION}, database is at revision {curr_revision}"
        )


async def reset_schema(db_pool: asyncpg.Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction(isolation="serializable"):
            await conn.execute("drop schema public cascade")
            await conn.execute("create schema public")


async def add_data(db_pool: asyncpg.Pool, sql_file: str, data_path: Path = DATA_PATH):
    async with db_pool.acquire() as conn:
        async with conn.transaction(isolation="serializable"):
            data = data_path.joinpath(sql_file)
            content = data.read_text("utf-8")
            logger.info(f"Applying test data {data}")
            await conn.execute(content)


async def apply_revisions(db_pool: asyncpg.Pool, until_revision: Optional[str] = None):
    await framework_apply_revisions(
        db_pool=db_pool, revision_path=REVISION_PATH, code_path=DB_CODE_PATH, until_revision=until_revision
    )


async def reload_db_code(db_pool: asyncpg.Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction(isolation="serializable"):
            await framework_reload_db_code(conn=conn, code_path=DB_CODE_PATH)


async def rebuild_with(db_pool: asyncpg.Pool, sql_file: str):
    """Wipe the DB and fill it with the info in `sql_file`"""
    await reset_schema(db_pool=db_pool)
    await apply_revisions(db_pool=db_pool)
    await add_data(db_pool=db_pool, sql_file=sql_file)
