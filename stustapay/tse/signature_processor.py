import contextlib
import functools
import logging

import asyncpg

from ..core.subcommand import SubCommand
from .config import Config
from .wrapper import TSEWrapper

from stustapay.core.database import create_db_pool
from stustapay.core.service.common.dbhook import DBHook

LOGGER = logging.getLogger(__name__)


class SignatureProcessor(SubCommand):
    @staticmethod
    def argparse_register(subparser):
        del subparser  # unused, no extra arguments

    def __init__(self, args: dict, config: Config, **rest):
        del args, rest  # unused

        self.config = config
        self.tses = dict[str, TSEWrapper]()
        self.db_pool: asyncpg.Pool = None
        # contains event objects for each object that is waiting for new events.

    async def run(self) -> None:
        pool = await create_db_pool(self.config.database)
        self.db_pool = pool

        async with contextlib.AsyncExitStack() as aes:
            psql: asyncpg.Connection = await aes.enter_async_context(pool.acquire())

            # Clean up pending signatures.
            # We have no idea what state the assigned TSE was in when our predecessor
            # process was stopped.
            # In theory it might be possible to recover them by checking whether the
            # indicated TSE has actually completed the signature and advancing it to
            # 'done' if yes, setting it back to 'todo' else.
            # This intruduces much complexity and potential for bugs though,
            # so for now we just assume that the signature was interrupted and failed.
            # after this clean-up the database will be in a consistent state where
            # the till <-> tse mapping can be obtained via select name, tse_id from till;
            # see the next request.
            await psql.execute(
                """
                update
                    tse_signature
                set
                    signature_status='failure',
                    result_message='pending signature was not completed due to signature processor restart'
                where
                    signature_status='pending'
                """
            )

            # initialize the TSE wrappers
            self.tses = dict[str, TSEWrapper]()
            for name, factory_function in self.config.tses.all_factories():
                tse = TSEWrapper(name=name, factory_function=functools.partial(factory_function, name=name))
                tse.start(pool)
                aes.push_async_callback(tse.stop)
                self.tses[name] = tse

            # TODO Task to assign feral tills to a TSE

            # pylint: disable=attribute-defined-outside-init
            db_hook_conn = await aes.enter_async_context(pool.acquire())
            db_hook = DBHook(db_hook_conn, "tse_signature", self.handle_hook)
            await db_hook.run()

    async def handle_hook(self, payload):
        del payload  # unused
        LOGGER.info("tse_signature hook")
        # notify all of the TSEs
        for tse in self.tses.values():
            tse.notify_maybe_orders_available()
