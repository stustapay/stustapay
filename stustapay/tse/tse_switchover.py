import contextlib

# import functools
import logging

import asyncpg

from ..core.subcommand import SubCommand
from .config import Config

from stustapay.core.database import create_db_pool

LOGGER = logging.getLogger(__name__)


class TseSwitchover(SubCommand):
    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("--host", default="::1", help="local bind address, defa")
        subparser.add_argument(
            "-p", "--port", type=int, default=10001, help="port for websocket to listen, default 10001"
        )
        subparser.add_argument("-s", "--show", action="store_true", default=False, help="only show status")

        subparser.add_argument("-l", "--secret_key", type=str, default=None, help="ECDSA BRAINPOOLP384r1 sha384 in hex")
        subparser.add_argument("-g", "--gen_key", action="store_true", default=False, help="generate new secret key")
        subparser.add_argument("-b", "--broken", action="store_true", default=False, help="simulator with error")

    def __init__(self, args, config: Config, **rest):
        del rest  # unused

        self.config = config
        self.show = args.show
        self.db_pool: asyncpg.Pool = None
        # contains event objects for each object that is waiting for new events.

    async def run(self) -> None:
        pool = await create_db_pool(self.config.database)
        self.db_pool = pool

        async with contextlib.AsyncExitStack() as aes:
            psql: asyncpg.Connection = await aes.enter_async_context(pool.acquire())

            tses = await psql.fetch("select * from tse")
            for tse in tses:
                if self.show:
                    for key, item in tse.items():
                        LOGGER.info(f"{key}: {item}")
                    LOGGER.info("-----------------------------------")

            # TODO Task to assign feral tills to a TSE
            LOGGER.info("job done")
