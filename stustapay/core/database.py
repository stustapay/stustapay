"""
perform schema updates and get a db shell.
"""

import argparse
import asyncio
import contextlib
import json
import logging
import os
import re
import shutil
import ssl
import tempfile
from pathlib import Path
from typing import Optional, Union, Literal

import asyncpg
import asyncpg.exceptions

from . import subcommand
from . import util
from .config import Config, DatabaseConfig
from .schema import DATA_PATH, DEFAULT_EXAMPLE_DATA_FILE, REVISION_PATH

logger = logging.getLogger(__name__)

REVISION_VERSION_RE = re.compile(r"^-- revision: (?P<version>\w+)$")
REVISION_REQUIRES_RE = re.compile(r"^-- requires: (?P<version>\w+)$")
REVISION_TABLE = "schema_revision"
CURRENT_REVISION = "0ac8948f"


class DatabaseManage(subcommand.SubCommand):
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

    async def _attach(self):
        with contextlib.ExitStack() as exitstack:
            env = dict(os.environ)
            env["PGDATABASE"] = self.config.database.dbname

            if self.config.database.user is None:
                if self.config.database.host is not None:
                    raise ValueError("database user is None, but host is set")
                if self.config.database.password is not None:
                    raise ValueError("database user is None, but password is set")
            else:

                def escape_colon(value: str):
                    return value.replace("\\", "\\\\").replace(":", "\\:")

                passfile = exitstack.enter_context(tempfile.NamedTemporaryFile("w"))
                os.chmod(passfile.name, 0o600)

                passfile.write(
                    ":".join(
                        [
                            escape_colon(self.config.database.host),
                            "*",
                            escape_colon(self.config.database.dbname),
                            escape_colon(self.config.database.user),
                            escape_colon(self.config.database.password),
                        ]
                    )
                )
                passfile.write("\n")
                passfile.flush()

                env["PGHOST"] = self.config.database.host
                env["PGUSER"] = self.config.database.user
                env["PGPASSFILE"] = passfile.name

            command = ["psql", "--variable", "ON_ERROR_STOP=1"]
            if shutil.which("pgcli") is not None:
                # if pgcli is installed, use that instead!
                command = ["pgcli"]

            cwd = os.path.join(os.path.dirname(__file__))
            ret = await util.run_as_fg_process(command, env=env, cwd=cwd)
            return ret

    async def run(self):
        """
        CLI entry point
        """
        if self.action == "attach":
            return await self._attach()

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


class SchemaRevision:
    def __init__(self, file_name: Path, code: str, version: str, requires: Optional[str]):
        self.file_name = file_name
        self.code = code
        self.version = version
        self.requires = requires

    async def apply(self, conn):
        logger.info(f"Applying revision {self.file_name.name} with version {self.version}")
        if self.requires:
            version = await conn.fetchval(
                f"update {REVISION_TABLE} set version = $1 where version = $2 returning version",
                self.version,
                self.requires,
            )
            if version != self.version:
                raise ValueError(f"Found other revision present than {self.requires} which was required")
        else:
            n_table = await conn.fetchval(f"select count(*) from {REVISION_TABLE}")
            if n_table != 0:
                raise ValueError(
                    f"Could not apply revision {self.version} as there appears to be a revision present,"
                    f"none was expected"
                )
            await conn.execute(f"insert into {REVISION_TABLE} (version) values ($1)", self.version)

        # now we can actually apply the revision
        try:
            await conn.execute(self.code)
        except asyncpg.exceptions.PostgresSyntaxError as exc:
            exc_dict = exc.as_dict()
            position = int(exc_dict["position"])
            message = exc_dict["message"]
            lineno = self.code.count("\n", 0, position) + 1
            raise ValueError(
                f"Syntax error when executing SQL code at character "
                f"{position} ({self.file_name!s}:{lineno}): {message!r}"
            ) from exc

    @classmethod
    def revisions_from_dir(cls, revision_dir: Path) -> list["SchemaRevision"]:
        """
        returns an ordered list of revisions with their dependencies resolved
        """
        revisions = []
        for revision in sorted(revision_dir.glob("*.sql")):
            revision_content = revision.read_text("utf-8")
            lines = revision_content.splitlines()
            if not len(lines) > 2:
                raise ValueError(f"Revision {revision} is invalid")

            if (version_match := REVISION_VERSION_RE.match(lines[0])) is None:
                raise ValueError(
                    f"Invalid version string in revision {revision}, " f"should be of form '-- revision: <name>'"
                )
            if (requires_match := REVISION_REQUIRES_RE.match(lines[1])) is None:
                raise ValueError(
                    f"Invalid requires string in revision {revision}, " f"should be of form '-- requires: <name>'"
                )

            version = version_match["version"]
            requires: Optional[str] = requires_match["version"]

            if requires == "null":
                requires = None

            revisions.append(
                cls(
                    revision,
                    revision_content,
                    version,
                    requires,
                )
            )

        if len(revisions) == 0:
            return revisions

        # now for the purpose of sorting the revisions according to their dependencies
        first_revision = next((x for x in revisions if x.requires is None), None)
        if first_revision is None:
            raise ValueError("Could not find a revision without any dependencies")

        # TODO: detect revision branches
        sorted_revisions = [first_revision]
        while len(sorted_revisions) < len(revisions):
            curr_revision = sorted_revisions[-1]
            next_revision = next((x for x in revisions if x.requires == curr_revision.version), None)
            if next_revision is None:
                raise ValueError(f"Could not find the successor to revision {curr_revision.version}")
            sorted_revisions.append(next_revision)

        return sorted_revisions


async def init_connection(conn: asyncpg.Connection):
    await conn.set_type_codec("json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog")


async def create_db_pool(cfg: DatabaseConfig, n_connections=10) -> asyncpg.Pool:
    """
    get a connection pool to the database
    """
    pool = None

    retry_counter = 0
    next_log_at_retry = 0
    while pool is None:
        try:
            sslctx: Optional[Union[ssl.SSLContext, Literal["verify-full", "prefer"]]]
            if cfg.sslrootcert and cfg.require_ssl:
                sslctx = ssl.create_default_context(
                    ssl.Purpose.SERVER_AUTH,
                    cafile=cfg.sslrootcert,
                )
                sslctx.check_hostname = True
            else:
                sslctx = "verify-full" if cfg.require_ssl else "prefer"

            pool = await asyncpg.create_pool(
                user=cfg.user,
                password=cfg.password,
                database=cfg.dbname,
                host=cfg.host,
                max_size=n_connections,
                min_size=n_connections,
                ssl=sslctx,
                # the introspection query of asyncpg (defined as introspection.INTRO_LOOKUP_TYPES)
                # can take 1s with the jit.
                # the introspection is triggered to create converters for unknown types,
                # for example the integer[] (oid = 1007).
                # see https://github.com/MagicStack/asyncpg/issues/530
                server_settings={"jit": "off"},
                init=init_connection,
            )
        except Exception as e:  # pylint: disable=broad-except
            sleep_amount = 10
            if next_log_at_retry == retry_counter:
                logger.warning(
                    f"Failed to create database pool: {e}, waiting {sleep_amount} seconds and trying again..."
                )

            retry_counter += 1
            next_log_at_retry = min(retry_counter * 2, 2**9)
            await asyncio.sleep(sleep_amount)

    return pool


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
