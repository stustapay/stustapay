# pylint: disable=attribute-defined-outside-init
import asyncio
import json
import logging
import sys

from asyncpg.exceptions import PostgresError
from sftkit.database import Connection, DatabaseHook

from stustapay.bon.bon import generate_bon_json
from stustapay.core.config import Config
from stustapay.core.database import get_database
from stustapay.core.healthcheck import run_healthcheck


class GeneratorWorker:
    def __init__(self, config: Config):
        self.config = config
        self.logger = logging.getLogger(__name__)

        # set, once run is called
        self.db_conn: Connection | None = None
        self.db_hook: DatabaseHook | None = None

        self.tasks: list[asyncio.Task] = []

    async def stop(self):
        if self.db_hook:
            await self.db_hook.stop_async()
        for task in self.tasks:
            task.cancel()

    async def run(self):
        # start all database connections and start the hook to listen for bon requests
        self.logger.info("Starting Bon Generator")
        db = get_database(self.config.database)
        self.pool = await db.create_pool()

        # initial processing of pending bons
        await self.cleanup_pending_bons()

        self.db_hook = DatabaseHook(self.pool, "bon", self.handle_hook, hook_timeout=30)

        self.tasks = [
            asyncio.create_task(self.db_hook.run()),
            asyncio.create_task(run_healthcheck(db, service_name="bon")),
        ]

        try:
            await asyncio.gather(
                *self.tasks,
                return_exceptions=True,
            )
        except asyncio.CancelledError:
            pass

    async def cleanup_pending_bons(self):
        self.logger.info("Generating not generated bons")
        missing_bons = await self.pool.fetch(
            "select bon.id, o.uuid "
            "from bon "
            "join ordr o on bon.id = o.id "
            "join till t on o.till_id = t.id "
            "join node n on t.node_id = n.id "
            "where generated_at is null and not n.read_only",
        )
        for row in missing_bons:
            await self.process_bon(order_id=row["id"])

        self.logger.info("Finished generating left-over bons")

    async def handle_hook(self, payload):
        self.logger.debug(f"Received hook with payload {payload}")
        try:
            decoded = json.loads(payload)
            bon_id = decoded["bon_id"]
            bon_exists = await self.pool.fetchval("select exists (select from ordr where id = $1)", bon_id)
            assert bon_exists is not None
            await self.process_bon(order_id=bon_id)
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

    async def process_bon(self, order_id: int):
        """
        Queries the database for the bon data and generates it.
        Then saves the result back to the database
        """
        self.logger.debug(f"Generating Bon for order {order_id}...")
        bon_json = await generate_bon_json(db_pool=self.pool, order_id=order_id)
        if bon_json is None:
            self.logger.error(
                f"Error while generating bon data for order {order_id}. This is an internal stustapay error and should not occur naturally"
            )
            return

        async with self.pool.acquire() as conn:
            async with conn.transaction(isolation="serializable"):
                await conn.execute(
                    "update bon set bon_json = $2, generated_at = now() where id = $1",
                    order_id,
                    bon_json.model_dump_json(),
                )


class Generator:
    """
    Command which listens for database changes on bons and generates the bons immediately as pdf
    """

    def __init__(self, config: Config):
        self.config = config
        self.logger = logging.getLogger(__name__)

    def run(self):
        self.logger.info("Starting Bon Generator...")

        worker = GeneratorWorker(config=self.config)
        asyncio.run(worker.run())
        self.logger.info("Stopping Bon Generator...")
