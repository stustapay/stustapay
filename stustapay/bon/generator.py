# pylint: disable=attribute-defined-outside-init
import asyncio
import json
import logging
import sys

from asyncpg.exceptions import PostgresError

from stustapay.bon.bon import BonConfig, generate_bon
from stustapay.core.config import Config
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.service.common.dbhook import DBHook
from stustapay.framework.database import Connection, create_db_pool


class Generator:
    """
    Command which listens for database changes on bons and generates the bons immediately as pdf
    """

    def __init__(self, config: Config, worker_id: int = 0):
        self.n_workers = config.bon.n_workers
        self.worker_id = worker_id
        self.config = config
        self.logger = logging.getLogger(__name__)

        # set, once run is called
        self.db_conn: Connection
        self.db_hook: DBHook
        self.bon_config: BonConfig

    def _should_process_order(self, order_id: int) -> bool:
        return order_id % self.n_workers == self.worker_id

    async def run(self):
        # start all database connections and start the hook to listen for bon requests
        self.logger.info("Starting Bon Generator")
        self.pool = await create_db_pool(self.config.database)

        # initial processing of pending bons
        await self.cleanup_pending_bons()

        self.db_hook = DBHook(self.pool, "bon", self.handle_hook, hook_timeout=30)

        await asyncio.gather(
            self.db_hook.run(),
            run_healthcheck(db_pool=self.pool, service_name=f"bon{self.worker_id}"),
            return_exceptions=True,
        )

    async def cleanup_pending_bons(self):
        self.logger.info("Generating not generated bons")
        async with self.pool.acquire() as conn:
            missing_bons = await conn.fetch(
                "select bon.id, o.uuid "
                "from bon join ordr o on bon.id = o.id "
                "where not generated and error is null and bon.id % $1 = $2",
                self.n_workers,
                self.worker_id,
            )
            for row in missing_bons:
                async with conn.transaction(isoloation="serializable"):
                    await self.process_bon(conn=conn, order_id=row["id"])
            self.logger.info("Finished generating left-over bons")

    async def handle_hook(self, payload):
        self.logger.debug(f"Received hook with payload {payload}")
        try:
            decoded = json.loads(payload)
            bon_id = decoded["bon_id"]
            if not self._should_process_order(order_id=bon_id):
                return

            async with self.pool.acquire() as conn:
                async with conn.transaction(isolation="serializable"):
                    order_uuid = await conn.fetchval("select uuid from ordr where id = $1", bon_id)
                    assert order_uuid is not None
                    await self.process_bon(conn=conn, order_id=bon_id)
        except json.JSONDecodeError as e:
            self.logger.error(f"Error while trying to decode database payload for bon notification: {e}")
        except PostgresError as e:
            self.logger.error(f"Database error while processing bon: {e}")
        except Exception:  # pylint: disable=broad-except
            exc_type, exc_value, exc_traceback = sys.exc_info()
            import traceback

            self.logger.error(
                f"Unexpected error while processing bon: {traceback.format_exception(exc_type, exc_value, exc_traceback)}"
            )

    async def process_bon(self, conn: Connection, order_id: int):
        """
        Queries the database for the bon data and generates it.
        Then saves the result back to the database
        """
        # Generate the PDF and store the result back in the database
        self.logger.debug(f"Generating Bon for order {order_id}...")
        render_result = await generate_bon(conn=conn, order_id=order_id)
        self.logger.debug(f"Bon {order_id} generated with result {render_result.success}, {render_result.msg}")
        if render_result.success and render_result.bon is not None:
            await conn.execute(
                "update bon set generated = true, generated_at = now(), content = $2 , mime_type = $3 where id = $1",
                order_id,
                render_result.bon.content,
                render_result.bon.mime_type,
            )
        else:
            self.logger.warning(f"Error while generating bon: {render_result.msg}")
            await conn.execute(
                "update bon set generated = $2, error = $3, generated_at = now() where id = $1",
                order_id,
                False,
                render_result.msg,
            )
