import asyncio
import logging

import asyncpg

from stustapay.bon.pdflatex import pdflatex
from stustapay.core.config import Config
from stustapay.core.database import create_db_pool
from stustapay.core.dbhook import DBHook
from stustapay.core.subcommand import SubCommand


class Generator(SubCommand):
    """
    Command which listens for database changes on bons and generates the bons immediately as pdf
    """

    def __init__(self, args, config: Config, **rest):
        self.config = config
        self.events = asyncio.Queue()
        self.logger = logging.getLogger(__name__)

        # set, once run is called
        self.psql: asyncpg.Connection
        self.db_hook: DBHook

    async def run(self):
        self.logger.info("Starting Generator")
        pool = await create_db_pool(self.config.database)
        self.psql = await pool.acquire()
        self.db_hook = DBHook(self.psql, "bon", self.handle_hook)
        self.logger.info("Listening for Database Changes")
        await self.db_hook.run()
        self.logger.info("Finished")

    async def handle_hook(self, payload):
        self.logger.info(f"Database Trigger received with payload {payload}")
        await self.generate()

    async def generate(self):
        """
        Generates all pending bons
        """
        self.logger.info("Generate missing bons")
        missing_bons = await self.psql.fetch(
            "select id, status, output_file from bon where not generated and status is null"
        )
        for row in missing_bons:
            await self.generate_bon(row)

    async def generate_bon(self, bon: asyncpg.Record):
        """
        Queries the database for the bon data and generates it
        """
        self.logger.info(f"Generating Bon {bon['t_id']}")
        # TODO fetch lineitems from database
        context = {
            "name": "Test Name",
        }
        out_file = bon["t_id"] + ".pdf"

        # Generate the PDF and store the result back in the database
        success, msg = await pdflatex("bon.tex", context, out_file)
        if success:
            await self.psql.execute(
                "update bon set generated=$2, output_file=$3 where id=$1", bon["t_id"], success, out_file
            )
        else:
            await self.psql.execute("update bon set generated=$2, status=$3 where id=$1", bon["t_id"], success, msg)
