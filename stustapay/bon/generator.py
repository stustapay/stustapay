import asyncio
import logging
from pathlib import Path

import asyncpg

from stustapay.bon.pdflatex import pdflatex
from stustapay.core.config import Config
from stustapay.core.database import create_db_pool
from stustapay.core.dbhook import DBHook
from stustapay.core.service.order import OrderService
from stustapay.core.subcommand import SubCommand


class Generator(SubCommand):
    """
    Command which listens for database changes on bons and generates the bons immediately as pdf
    """

    def __init__(self, args, config: Config, **rest):
        del args, rest
        self.config = config
        self.events: asyncio.Queue = asyncio.Queue()
        self.logger = logging.getLogger(__name__)

        # set, once run is called
        self.psql: asyncpg.Connection
        self.db_hook: DBHook
        self.tx_service: OrderService

    async def run(self):
        # start all database connections and start the hook to listen for bon requests
        self.logger.info("Starting Bon Generator")
        pool = await create_db_pool(self.config.database)
        self.psql = await pool.acquire()
        db_hook_conn = await pool.acquire()
        self.tx_service = OrderService(pool, self.config)

        self.db_hook = DBHook(db_hook_conn, "bon", self.handle_hook)
        await self.db_hook.run()
        # cleanup
        db_hook_conn.close()
        self.psql.close()

    async def handle_hook(self, payload):
        self.logger.info(f"Received hook with payload {payload}")
        await self.generate()

    async def generate(self):
        """
        Generates all pending bons
        """
        self.logger.info("Generate missing bons")
        missing_bons = await self.psql.fetch("select id from bon where not generated and error is null")
        for row in missing_bons:
            await self.generate_bon(row)

    async def generate_bon(self, bon: asyncpg.Record):
        """
        Queries the database for the bon data and generates it
        """
        order_id = bon["id"]
        self.logger.info(f"Generating Bon {order_id}")

        order = await self.tx_service.show_order(order_id=order_id)
        # for now do a direct database request for tax rates
        tax_rates = await self.psql.fetch("select * from order_tax_rates where id=$1", order_id)
        context = {
            "order": order,
            "tax_rates": tax_rates,
        }
        out_file = f"{order_id:010}.pdf"

        # Generate the PDF and store the result back in the database
        success, msg = await pdflatex("bon.tex", context, Path(out_file))
        self.logger.info(f"Bon generated with result {success}, {msg}")
        return  # for testing purpose
        if success:  # pylint: disable=unreachable
            await self.psql.execute(
                "update bon set generated=$2, output_file=$3 , generated_at=now() where id=$1",
                order_id,
                success,
                out_file,
            )
        else:
            await self.psql.execute(
                "update bon set generated=$2, error=$3, generated_at=now() where id=$1", order_id, success, msg
            )
