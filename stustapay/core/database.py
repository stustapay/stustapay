"""
perform schema updates and get a db shell.
"""

import argparse
import logging
from pathlib import Path
from typing import Optional

import asyncpg.exceptions

from stustapay.framework import subcommand
from stustapay.framework.database import (
    REVISION_TABLE,
    SchemaRevision,
    create_db_pool,
    psql_attach,
)

from .config import Config
from .schema import DATA_PATH, DEFAULT_EXAMPLE_DATA_FILE, REVISION_PATH

logger = logging.getLogger(__name__)

CURRENT_REVISION = "8697011c"


class DatabaseManage(subcommand.SubCommand[Config]):
    def __init__(self, args, config: Config, **rest):
        del rest

        self.config = config
        self.action = args.action
        self.args = args

    @staticmethod
    def argparse_register(subparser: argparse.ArgumentParser):
        subparsers = subparser.add_subparsers(dest="action")
        subparsers.add_parser("attach")
        migrate_parser = subparsers.add_parser("migrate")
        migrate_parser.add_argument("--until-revision", type=str, help="Only apply revisions until this version")

        subparsers.add_parser("rebuild")
        subparsers.add_parser("reset")
        subparsers.add_parser("list_revisions")

        add_data_parser = subparsers.add_parser("add_data", formatter_class=argparse.ArgumentDefaultsHelpFormatter)
        add_data_parser.add_argument(
            "--sql-file",
            type=str,
            help=f"Name of the .sql file in {DATA_PATH} that will get loaded into the DB",
            default=DEFAULT_EXAMPLE_DATA_FILE,
        )

    async def run(self):
        """
        CLI entry point
        """
        if self.action == "attach":
            return await psql_attach(self.config.database)

        db_pool = await create_db_pool(self.config.database)
        if self.action == "migrate":
            await apply_revisions(db_pool=db_pool, until_revision=self.args.until_revision)
        if self.action == "rebuild":
            await reset_schema(db_pool=db_pool)
            await apply_revisions(db_pool=db_pool)
        if self.action == "reset":
            await reset_schema(db_pool=db_pool)
        if self.action == "add_data":
            await add_data(db_pool=db_pool, sql_file=self.args.sql_file)
        if self.action == "list_revisions":
            revisions = SchemaRevision.revisions_from_dir(REVISION_PATH)
            for revision in revisions:
                print(
                    f"Revision: {revision.version}, requires revision: {revision.requires}, filename: {revision.file_name}"
                )

        await db_pool.close()


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
