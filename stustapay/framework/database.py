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
from typing import Literal, Optional, Type, TypeVar, Union

import asyncpg
from pydantic import BaseModel

from stustapay.core import util

logger = logging.getLogger(__name__)

REVISION_VERSION_RE = re.compile(r"^-- revision: (?P<version>\w+)$")
REVISION_REQUIRES_RE = re.compile(r"^-- requires: (?P<version>\w+)$")
REVISION_TABLE = "schema_revision"


class DatabaseConfig(BaseModel):
    user: Optional[str] = None
    password: Optional[str] = None
    host: Optional[str] = None
    port: Optional[int] = 5432
    dbname: str
    require_ssl: bool = False
    sslrootcert: Optional[str] = None


async def psql_attach(config: DatabaseConfig):
    with contextlib.ExitStack() as exitstack:
        env = dict(os.environ)
        env["PGDATABASE"] = config.dbname

        if config.user is None:
            if config.host is not None:
                raise ValueError("database user is None, but host is set")
            if config.password is not None:
                raise ValueError("database user is None, but password is set")
        else:

            def escape_colon(value: str):
                return value.replace("\\", "\\\\").replace(":", "\\:")

            passfile = exitstack.enter_context(tempfile.NamedTemporaryFile("w"))
            os.chmod(passfile.name, 0o600)

            passfile.write(
                ":".join(
                    [
                        escape_colon(config.host),
                        "*",
                        escape_colon(config.dbname),
                        escape_colon(config.user),
                        escape_colon(config.password),
                    ]
                )
            )
            passfile.write("\n")
            passfile.flush()

            env["PGHOST"] = config.host
            env["PGUSER"] = config.user
            env["PGPASSFILE"] = passfile.name

        command = ["psql", "--variable", "ON_ERROR_STOP=1"]
        if shutil.which("pgcli") is not None:
            # if pgcli is installed, use that instead!
            command = ["pgcli"]

        cwd = os.path.join(os.path.dirname(__file__))
        ret = await util.run_as_fg_process(command, env=env, cwd=cwd)
        return ret


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


T = TypeVar("T", bound=BaseModel)


class Connection(asyncpg.Connection):
    async def fetch_one(self, model: Type[T], query: str, *args) -> T:
        result: Optional[asyncpg.Record] = await self.fetchrow(query, *args)
        if result is None:
            raise asyncpg.DataError("not found")

        return model.model_validate(dict(result))

    async def fetch_maybe_one(self, model: Type[T], query: str, *args) -> Optional[T]:
        result: Optional[asyncpg.Record] = await self.fetchrow(query, *args)
        if result is None:
            return None

        return model.model_validate(dict(result))

    async def fetch_many(self, model: Type[T], query: str, *args) -> list[T]:
        # TODO: also allow async cursor
        results: list[asyncpg.Record] = await self.fetch(query, *args)
        return [model.model_validate(dict(r)) for r in results]


async def init_connection(conn: Connection):
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
                connection_class=Connection,
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
