import asyncio
import contextlib
import functools
import logging
from typing import Optional

import asyncpg

from stustapay.core.database import create_db_pool
from stustapay.core.service.common.dbhook import DBHook
from stustapay.core.subcommand import SubCommand
from .config import Config
from .wrapper import TSEWrapper
from ..core.healthcheck import run_healthcheck

LOGGER = logging.getLogger(__name__)


class SignatureProcessor(SubCommand):
    @staticmethod
    def argparse_register(subparser):
        del subparser  # unused, no extra arguments

    def __init__(self, args, config: Config, **rest):
        del args, rest  # unused

        self.config = config
        self.tses = dict[str, TSEWrapper]()
        self.db_pool: Optional[asyncpg.Pool] = None
        # contains event objects for each object that is waiting for new events.

    async def run(self) -> None:
        self.db_pool = await create_db_pool(self.config.database)

        async with contextlib.AsyncExitStack() as aes:
            # Clean up pending signatures.
            # We have no idea what state the assigned TSE was in when our predecessor
            # process was stopped.
            # In theory it might be possible to recover them by checking whether the
            # indicated TSE has actually completed the signature and advancing it to
            # 'done' if yes, setting it back to 'new' else.
            # This intruduces much complexity and potential for bugs though,
            # so for now we just assume that the signature was interrupted and failed.
            # after this clean-up the database will be in a consistent state where
            # the till <-> tse mapping can be obtained via select name, tse_id from till;
            # see the next request.
            await self.db_pool.execute(
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
                tse.start(self.db_pool)
                aes.push_async_callback(tse.stop)
                self.tses[name] = tse

            # TODO Task to assign feral tills to a TSE
            LOGGER.info(f"Configured TSEs: {self.tses}")

            # pylint: disable=attribute-defined-outside-init
            db_hook = DBHook(self.db_pool, "tse_signature", self.handle_hook, initial_run=True)
            await db_hook.run()
            await asyncio.gather(
                db_hook.run(),
                run_healthcheck(db_pool=self.db_pool, service_name="tses"),
                return_exceptions=True,
            )

        await self.db_pool.close()

    async def handle_hook(self, payload):
        del payload  # unused
        LOGGER.info("tse_signature hook")

        # check if it is from a till without an assigned TSE
        async with contextlib.AsyncExitStack() as aes:
            psql: asyncpg.Connection = await aes.enter_async_context(self.db_pool.acquire())

            feral_till_id_rows = await psql.fetch(
                """
                    select
                        till.id as till_id
                    from
                        tse_signature
                        join ordr on ordr.id=tse_signature.id
                        join till on ordr.till_id=till.id
                    where
                        tse_signature.signature_status='new' and
                        till.tse_id is Null
                    """
            )
            if feral_till_id_rows is None:
                pass  # all fine
            else:
                LOGGER.info(f"till(s) without TSE but an order {feral_till_id_rows}")
                LOGGER.info(f"{len(feral_till_id_rows)} till(s) need a TSE")
                # assign TSEs
                for till in feral_till_id_rows:
                    # get number of assigned tills per tse, but only of active TSEs
                    tse_stats = dict()
                    active_tses = await psql.fetch("select tse_name from tse where tse_status='active'")
                    for tse in active_tses:
                        # TODO optimize this statement for really really large installations...
                        tse_stats[tse["tse_name"]] = await psql.fetchval(
                            "select count(*) from till join tse on till.tse_id = tse.tse_id where tse.tse_name=$1 and tse.tse_status='active'",
                            tse["tse_name"],
                        )
                    tse_ranked = sorted(tse_stats.items(), key=lambda x: x[1])
                    # assign this till to tse with lowest number
                    till_id_to_assign_to_tse = till["till_id"]
                    try:
                        tse_name_to_assign_to_till = tse_ranked[0][0]

                        tse_id = await psql.fetchval(
                            "select tse_id from tse where tse_name = $1 ", tse_name_to_assign_to_till
                        )
                        await psql.execute(
                            "update till set tse_id = $1 where id = $2", tse_id, till_id_to_assign_to_tse
                        )
                        LOGGER.info(
                            f"Till with ID={till_id_to_assign_to_tse} is assigned to TSE: {tse_name_to_assign_to_till}"
                        )
                    except IndexError:
                        LOGGER.error("ERROR: no more active TSEs available")
                        LOGGER.warning("will set all signature requests to 'failure'")
                        await psql.execute(
                            "update tse_signature set signature_status='failure',result_message='TSE failure, no active TSE available', tse_id=1 where signature_status='new'"
                        )

        # notify all of the TSEs
        for tse in self.tses.values():
            tse.notify_maybe_orders_available()
