import asyncio
import json
import logging
import os
import random
import sys

import asyncpg

from stustapay.bon.config import Config
from stustapay.bon.pdflatex import pdflatex
from stustapay.core.database import create_db_pool
from stustapay.core.dbhook import DBHook
from stustapay.core.service.order import OrderService
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService
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

        try:
            os.makedirs(self.config.bon.output_folder, exist_ok=True)
        except OSError as e:
            self.logger.fatal(f"Failed to create bon output directory '{self.config.bon.output_folder}'. {e}")
            sys.exit(1)

    async def run(self):
        # start all database connections and start the hook to listen for bon requests
        self.logger.info("Starting Bon Generator")
        pool = await create_db_pool(self.config.database)
        async with pool.acquire() as self.psql:
            async with pool.acquire() as db_hook_conn:
                # pylint: disable=attribute-defined-outside-init
                self.user_service = UserService(pool, self.config)
                # pylint: disable=attribute-defined-outside-init
                self.till_service = TillService(pool, self.config, self.user_service)
                # pylint: disable=attribute-defined-outside-init
                self.tx_service = OrderService(
                    pool, self.config, till_service=self.till_service, user_service=self.user_service
                )
                # pylint: disable=attribute-defined-outside-init
                self.db_hook = DBHook(db_hook_conn, "bon", self.handle_hook)
                await self.db_hook.run()

    async def handle_hook(self, payload):
        self.logger.info(f"Received hook with payload {payload}")
        await self.generate()

    async def generate(self):
        """
        Generates all pending bons
        """
        missing_bons = await self.psql.fetch("select id from bon where not generated and error is null")
        details = {
            "title": await self.psql.fetchval("select value from config where key = 'bon.title'"),
            "issuer": await self.psql.fetchval("select value from config where key = 'bon.issuer'"),
            "address": await self.psql.fetchval("select value from config where key = 'bon.addr'"),
            "ust_id": await self.psql.fetchval("select value from config where key = 'ust_id'"),
            "closing_texts": json.loads(
                await self.psql.fetchval("select value from config where key = 'bon.closing_texts'") or '[""]'
            ),
        }
        for row in missing_bons:
            await self.generate_bon(row, details)

    async def generate_bon(self, bon: asyncpg.Record, details: dict):
        """
        Queries the database for the bon data and generates it.
        Then saves the result back to the database
        """
        order_id = bon["id"]
        self.logger.info(f"Generating Bon {order_id}")

        order = await self.tx_service.show_order(order_id=order_id)
        # for now do a direct database request for tax rates
        tax_rates = await self.psql.fetch("select * from order_tax_rates where id=$1", order_id)
        context = {
            "order": order,
            "tax_rates": tax_rates,
            "funny_text": random.choice(details["closing_texts"]),
            **details,
        }
        file_name = f"{order_id:010}.pdf"
        out_file = self.config.bon.output_folder.joinpath(file_name)

        # Generate the PDF and store the result back in the database
        success, msg = await pdflatex("bon.tex", context, out_file)
        self.logger.info(f"Bon {order_id} generated with result {success}, {msg}")
        if success:
            await self.psql.execute(
                "update bon set generated=$2, output_file=$3 , generated_at=now() where id=$1",
                order_id,
                success,
                file_name,
            )
        else:
            await self.psql.execute(
                "update bon set generated=$2, error=$3, generated_at=now() where id=$1", order_id, success, msg
            )
