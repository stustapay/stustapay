import logging

import asyncpg

from ..core.subcommand import SubCommand
from .config import Config

from stustapay.core.database import create_db_pool

from .generator import Generator


LOGGER = logging.getLogger(__name__)


class Exporter(SubCommand):
    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument(
            "-f", "--filename", default="dsfinV_k.zip", help="Filename of export ZIP. Default: %(default)s"
        )
        subparser.add_argument(
            "--xml", default="./stustapay/dsfinvk/assets/index.xml", help="index.xml file to include"
        )
        subparser.add_argument(
            "--dtd", default="./stustapay/dsfinvk/assets/gdpdu-01-09-2004.dtd", help="*.dtd file to include"
        )
        subparser.add_argument("-s", "--simulate", default=False, action="store_true", help="don't export file")

    def __init__(self, args, config: Config, **rest):
        del rest  # unused

        self.cfg = config

        self.config = config

        self.generator = Generator(args.filename, args.xml, args.dtd, args.simulate)
        self.db_pool: asyncpg.Pool = None

    async def run(self):
        self.db_pool = await create_db_pool(self.config.database)
        await self.generator.run(self.db_pool)
