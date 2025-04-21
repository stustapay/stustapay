import asyncio
import contextlib
import logging

import asyncpg
from sftkit.database import Connection, DatabaseHook

from stustapay.core.config import Config
from stustapay.core.database import get_database
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.schema.tse import Tse
from stustapay.core.service.tree.common import fetch_node

from .config import get_tse_handler
from .wrapper import TSEWrapper

LOGGER = logging.getLogger(__name__)


class SignatureProcessor:
    def __init__(self, config: Config):
        self.config = config
        self.tses: dict[int, TSEWrapper] = {}  # tse_id -> Tse
        self.db_pool: asyncpg.Pool | None = None
        # contains event objects for each object that is waiting for new events.

    async def run(self) -> None:
        db = get_database(self.config.database)
        self.db_pool = await db.create_pool()

        async with contextlib.AsyncExitStack() as aes:
            aes.push_async_callback(self.db_pool.close)

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
                tses_in_db = await conn.fetch_many(
                    Tse, "select t.* from tse t join node n on t.node_id = n.id where not n.read_only"
                )
                for tse_in_db in tses_in_db:
                    factory = get_tse_handler(tse_in_db)
                    tse = TSEWrapper(tse_id=tse_in_db.id, factory_function=factory)
                    tse.start(self.db_pool)
                    aes.push_async_callback(tse.stop)
                    self.tses[tse_in_db.id] = tse

            LOGGER.info(f"Configured TSEs: {self.tses}")

            db_hook = DatabaseHook(self.db_pool, "tse_signature", self.handle_hook, initial_run=True)
            await db_hook.run()
            await asyncio.gather(
                db_hook.run(),
                run_healthcheck(db, service_name="tses"),
                return_exceptions=True,
            )

    async def _handle_feral_tses(self, conn: Connection):
        feral_till_id_rows = await conn.fetch(
            """
                select distinct
                    till.id as till_id
                    till.node_id as node_id
                from
                    tse_signature
                    join ordr on ordr.id = tse_signature.id
                    join till on ordr.till_id = till.id
                where
                    tse_signature.signature_status = 'new' and
                    till.tse_id is null
                """
        )
        if feral_till_id_rows is None:
            return

        LOGGER.info(f"till(s) without TSE but an order {feral_till_id_rows}")
        LOGGER.info(f"{len(feral_till_id_rows)} till(s) need a TSE")
        # assign TSEs
        for till in feral_till_id_rows:
            node = await fetch_node(conn=conn, node_id=till["node_id"])
            assert node is not None
            # get number of assigned tills per tse, but only of active TSEs
            tse_stats = dict()
            active_tses = await conn.fetch(
                "select id from tse where status='active' and node_id = any($1)", node.ids_to_event_node
            )
            for tse in active_tses:
                # TODO optimize this statement for really really large installations...
                tse_stats[tse["id"]] = await conn.fetchval(
                    "select count(*) from till join tse on till.tse_id = tse.id where tse.id = $1 and tse.status='active'",
                    tse["id"],
                )
            tse_ranked = sorted(tse_stats.items(), key=lambda x: x[1])
            # assign this till to tse with the lowest number
            till_id_to_assign_to_tse = till["till_id"]
            try:
                tse_id_to_assign_to_till = tse_ranked[0][0]
                await conn.execute(
                    "update till set tse_id = $1 where id = $2", tse_id_to_assign_to_till, till_id_to_assign_to_tse
                )
                LOGGER.info(f"Till with ID={till_id_to_assign_to_tse} is assigned to TSE: {tse_id_to_assign_to_till}")
            except IndexError:
                LOGGER.error("ERROR: no more active TSEs available")
                LOGGER.warning("will set all signature requests to 'failure'")
                await conn.execute(
                    "update tse_signature set signature_status = 'failure', result_message = 'TSE failure, no active TSE available', tse_id = 1 where signature_status='new'"
                )

    async def handle_hook(self, payload):
        assert self.db_pool is not None
        del payload  # unused
        LOGGER.info("tse_signature hook")

        # check if it is from a till without an assigned TSE
        async with self.db_pool.acquire() as conn:
            await self._handle_feral_tses(conn=conn)

        # notify all TSEs
        for tse in self.tses.values():
            tse.notify_maybe_orders_available()
