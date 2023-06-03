# pylint: disable=attribute-defined-outside-init
import asyncio
import json
import logging
import os
import sys
from uuid import UUID

import asyncpg
from asyncpg.exceptions import PostgresError

from stustapay.bon.bon import fetch_base_config, generate_bon, BonConfig
from stustapay.bon.config import Config
from stustapay.core.database import create_db_pool
from stustapay.core.healthcheck import run_healthcheck
from stustapay.core.service.common.dbhook import DBHook
from stustapay.core.subcommand import SubCommand


class Generator(SubCommand):
    """
    Command which listens for database changes on bons and generates the bons immediately as pdf
    """

    def __init__(self, args, config: Config, **rest):
        del rest
        self.args = args
        self.config = config
        self.logger = logging.getLogger(__name__)

        # set, once run is called
        self.db_conn: asyncpg.Connection
        self.db_hook: DBHook
        self.bon_config: BonConfig

        try:
            os.makedirs(self.config.bon.output_folder, exist_ok=True)
        except OSError as e:
            self.logger.fatal(f"Failed to create bon output directory '{self.config.bon.output_folder}'. {e}")
            sys.exit(1)

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("-n", "--n-workers", type=int, default=1, help="Number of bon generator indices")
        subparser.add_argument("-i", "--worker-id", type=int, default=0, help="Index of this worker instance")

    def _should_process_order(self, order_id: int) -> bool:
        return order_id % self.args.n_workers == self.args.worker_id

    async def run(self):
        # start all database connections and start the hook to listen for bon requests
        self.logger.info("Starting Bon Generator")
        self.pool = await create_db_pool(self.config.database)

        async with self.pool.acquire() as conn:
            self.bon_config = await fetch_base_config(conn=conn)

        # initial processing of pending bons
        await self.cleanup_pending_bons()

        self.db_hook = DBHook(self.pool, "bon", self.handle_hook, hook_timeout=30)

        await asyncio.gather(
            self.db_hook.run(),
            run_healthcheck(db_pool=self.pool, service_name=f"bon{self.args.worker_id}"),
            return_exceptions=True,
        )

    async def cleanup_pending_bons(self):
        self.logger.info("Generating not generated bons")
        async with self.pool.acquire() as conn:
            missing_bons = await conn.fetch(
                "select bon.id, o.uuid "
                "from bon join ordr o on bon.id = o.id "
                "where not generated and error is null and bon.id % $1 = $2",
                self.args.n_workers,
                self.args.worker_id,
            )
            for row in missing_bons:
                async with conn.transaction():
                    await self.process_bon(conn=conn, order_id=row["id"], order_uuid=row["uuid"])
            self.logger.info("Finished generating left-over bons")

    async def handle_hook(self, payload):
        self.logger.debug(f"Received hook with payload {payload}")
        try:
            decoded = json.loads(payload)
            bon_id = decoded["bon_id"]
            if not self._should_process_order(order_id=bon_id):
                return

            async with self.pool.acquire() as conn:
                async with conn.transaction():
                    order_uuid = await conn.fetchval("select uuid from ordr where id = $1", bon_id)
                    assert order_uuid is not None
                    await self.process_bon(conn=conn, order_id=bon_id, order_uuid=order_uuid)
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

    async def process_bon(self, conn: asyncpg.Connection, order_id: int, order_uuid: UUID):
        """
        Queries the database for the bon data and generates it.
        Then saves the result back to the database
        """
        file_name = f"{order_uuid}.pdf"
        out_file = self.config.bon.output_folder.joinpath(file_name)

        # Generate the PDF and store the result back in the database
        self.logger.debug(f"Generating Bon for order {order_id}...")
        success, msg = await generate_bon(conn=conn, config=self.bon_config, order_id=order_id, out_file=out_file)
        self.logger.debug(f"Bon {order_id} generated with result {success}, {msg}")
        if success:
            await conn.execute(
                "update bon set generated = true, output_file = $2 , generated_at = now() where id = $1",
                order_id,
                file_name,
            )
        else:
            self.logger.warning(f"Error while generating bon: {msg}")
            await conn.execute(
                "update bon set generated = $2, error = $3, generated_at = now() where id = $1", order_id, success, msg
            )
