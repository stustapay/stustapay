"""
perform schema updates and get a db shell.
"""

import logging

import asyncpg.exceptions
from sftkit.database import Database, DatabaseConfig

from .schema import DB_CODE_PATH, MIGRATION_PATH

logger = logging.getLogger(__name__)

CURRENT_REVISION = "7e81cbb1"

def get_database(config: DatabaseConfig) -> Database:
    return Database(
        config=config,
        migrations_dir=MIGRATION_PATH,
        code_dir=DB_CODE_PATH,
    )


def list_revisions(db: Database):
    revisions = db.list_migrations()
    for revision in revisions:
        print(f"Revision: {revision.version}, requires revision: {revision.requires}, filename: {revision.file_name}")


async def check_revision_version(db: Database):
    revision = await db.get_current_migration_version()
    if revision != CURRENT_REVISION:
        raise RuntimeError(
            f"Invalid database revision, expected {CURRENT_REVISION}, database is at revision {revision}"
        )


async def reset_schema(db_pool: asyncpg.Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction(isolation="serializable"):
            await conn.execute("drop schema public cascade")
            await conn.execute("create schema public")
