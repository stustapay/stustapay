import asyncio
import contextlib
import logging
from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.schema.tse import Tse
from stustapay.core.service.common.dbhook import DBHook
from stustapay.framework.database import Connection, create_db_pool

from .config import get_tse_handler
from .wrapper import TSEWrapper

LOGGER = logging.getLogger(__name__)


class SignatureProcessor:
    def __init__(self, config: Config):
        self.config = config
        self.tses: dict[str, TSEWrapper] = {}
        self.db_pool: Optional[asyncpg.Pool] = None
        # contains event objects for each object that is waiting for new events.

    async def run(self) -> None:
        self.db_pool = await create_db_pool(self.config.database)

        async with contextlib.AsyncExitStack() as aes:
            # Clean up pending signatures.
            # We have no idea what state the assigned TSE was in when our predecessor
            # process was stopped.
            # In theory, it might be possible to recover them by checking whether the
            # indicated TSE has actually completed the signature and advancing it to
            # 'done' if yes, setting it back to 'new' else.
            # This introduces much complexity and potential for bugs though,
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
            async with self.db_pool.acquire() as conn:
                tses_in_db = await conn.fetch_many(Tse, "select * from tse")
                for tse_in_db in tses_in_db:
                    factory = get_tse_handler(tse_in_db)
                    tse = TSEWrapper(name=tse_in_db.name, factory_function=factory)
                    tse.start(self.db_pool)
                    aes.push_async_callback(tse.stop)
                    self.tses[tse.name] = tse

            # TODO Task to assign feral tills to a TSE
            LOGGER.info(f"Configured TSEs: {self.tses}")

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
            psql: Connection = await aes.enter_async_context(self.db_pool.acquire())

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
                    active_tses = await psql.fetch("select name from tse where status='active'")
                    for tse in active_tses:
                        # TODO optimize this statement for really really large installations...
                        tse_stats[tse["name"]] = await psql.fetchval(
                            "select count(*) from till join tse on till.tse_id = tse.id where tse.name=$1 and tse.status='active'",
                            tse["name"],
                        )
                    tse_ranked = sorted(tse_stats.items(), key=lambda x: x[1])
                    # assign this till to tse with the lowest number
                    till_id_to_assign_to_tse = till["till_id"]
                    try:
                        tse_name_to_assign_to_till = tse_ranked[0][0]

                        tse_id = await psql.fetchval("select id from tse where name = $1 ", tse_name_to_assign_to_till)
                        assert tse_id is not None
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

        # notify all TSEs
        for tse in self.tses.values():
            tse.notify_maybe_orders_available()
