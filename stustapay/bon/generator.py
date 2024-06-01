# pylint: disable=attribute-defined-outside-init
import asyncio
import json
import logging
import sys

from asyncpg.exceptions import PostgresError

from stustapay.bon.bon import generate_bon
from stustapay.core.config import Config
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.service.common.dbhook import DBHook
from stustapay.framework.database import Connection, create_db_pool


class GeneratorWorker:
    def __init__(self, config: Config):
        self.n_workers = config.bon.n_workers
        self.config = config
        self.logger = logging.getLogger(__name__)

        # set, once run is called
        self.db_conn: Connection | None = None
        self.db_hook: DBHook | None = None

        self.tasks: list[asyncio.Task] = []

    async def stop(self):
        if self.db_hook:
            await self.db_hook.stop_async()
        for task in self.tasks:
            task.cancel()

    async def run(self):
        # start all database connections and start the hook to listen for bon requests
        self.logger.info("Starting Bon Generator")
        self.pool = await create_db_pool(self.config.database)

        # initial processing of pending bons
        await self.cleanup_pending_bons()

        self.db_hook = DBHook(self.pool, "bon", self.handle_hook, hook_timeout=30)

        self.tasks = [
            asyncio.create_task(self.db_hook.run(num_parallel=self.n_workers)),
            asyncio.create_task(run_healthcheck(db_pool=self.pool, service_name="bon")),
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
            "where not generated and error is null and not n.read_only",
        )
        async with asyncio.TaskGroup() as tg:
            tasks = set()
            for row in missing_bons:
                task = tg.create_task(self.process_bon(order_id=row["id"]))
                tasks.add(task)
                if len(tasks) >= self.n_workers:
                    done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                    tasks.difference_update(done)

        self.logger.info("Finished generating left-over bons")

    async def handle_hook(self, payload):
        self.logger.debug(f"Received hook with payload {payload}")
        try:
            decoded = json.loads(payload)
            bon_id = decoded["bon_id"]
            order_uuid = await self.pool.fetchval("select uuid from ordr where id = $1", bon_id)
            assert order_uuid is not None
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
        # Generate the PDF and store the result back in the database
        self.logger.debug(f"Generating Bon for order {order_id}...")
        render_result = await generate_bon(db_pool=self.pool, order_id=order_id)
        self.logger.debug(f"Bon {order_id} generated with result {render_result.success}")
        async with self.pool.acquire() as conn:
            async with conn.transaction(isolation="serializable"):
                if render_result.success and render_result.bon is not None:
                    await conn.execute(
                        "update bon set generated = true, generated_at = now(), content = $2 , mime_type = $3 where id = $1",
                        order_id,
                        render_result.bon.content,
                        render_result.bon.mime_type,
                    )
                else:
                    self.logger.warning(f"Error while generating bon: {order_id}")
                    await conn.execute(
                        "update bon set generated = $2, error = $3, generated_at = now() where id = $1",
                        order_id,
                        False,
                        render_result.msg,
                    )


class Generator:
    """
    Command which listens for database changes on bons and generates the bons immediately as pdf
    """

    def __init__(self, config: Config):
        self.n_workers = config.bon.n_workers
        self.config = config
        self.logger = logging.getLogger(__name__)

    def run(self):
        self.logger.info("Starting Bon Generator...")

        worker = GeneratorWorker(config=self.config)
        asyncio.run(worker.run())
        self.logger.info("Stopping Bon Generator...")
