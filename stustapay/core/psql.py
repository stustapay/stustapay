"""
perform schema updates and get a db shell.

Runs the 'psql' tool with the appropriate parameters.
"""

import contextlib
import os
import shutil
import tempfile
from pathlib import Path

from . import database
from . import subcommand
from . import util
from .config import Config

REVISION_DIR = Path(__file__).parent / "schema" / "db"


class PSQL(subcommand.SubCommand):
    def __init__(self, config: Config, **args):
        self.config = config
        self.action = args["action"]

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("action", choices=["attach", "migrate", "rebuild"])

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

        db_pool = await database.create_db_pool(self.config)
        if self.action == "migrate":
            await database.apply_revisions(db_pool=db_pool, revision_dir=REVISION_DIR)
        elif self.action == "rebuild":
            await database.reset_schema(db_pool=db_pool)
            await database.apply_revisions(db_pool=db_pool, revision_dir=REVISION_DIR)
