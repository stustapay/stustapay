"""
perform schema updates and get a db shell.
"""

import logging
from pathlib import Path
from typing import Optional

import asyncpg.exceptions

from stustapay.framework.database import REVISION_TABLE, SchemaRevision

from .schema import DATA_PATH, REVISION_PATH

logger = logging.getLogger(__name__)

CURRENT_REVISION = "8697011c"


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
        async with conn.transaction():
            await conn.execute("drop schema public cascade")
            await conn.execute("create schema public")


async def apply_revisions(
    db_pool: asyncpg.Pool, revision_path: Optional[Path] = None, until_revision: Optional[str] = None
):
    revisions = SchemaRevision.revisions_from_dir(revision_path or REVISION_PATH)

    async with db_pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(f"create table if not exists {REVISION_TABLE} (version text not null primary key)")

            curr_revision = await conn.fetchval(f"select version from {REVISION_TABLE} limit 1")

            found = curr_revision is None
            for revision in revisions:
                if found:
                    await revision.apply(conn)

                if revision.version == curr_revision:
                    found = True

                if until_revision is not None and revision.version == until_revision:
                    return

            if not found:
                raise ValueError(f"Unknown revision {curr_revision} present in database")


async def add_data(db_pool: asyncpg.Pool, sql_file: str, data_path: Path = DATA_PATH):
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            data = data_path.joinpath(sql_file)
            content = data.read_text("utf-8")
            logger.info(f"Applying test data {data}")
            await conn.execute(content)


async def rebuild_with(db_pool: asyncpg.Pool, sql_file: str):
    """Wipe the DB and fill it with the info in `sql_file`"""
    await reset_schema(db_pool=db_pool)
    await apply_revisions(db_pool=db_pool)
    await add_data(db_pool=db_pool, sql_file=sql_file)
