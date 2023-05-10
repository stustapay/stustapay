import datetime
import logging
from typing import Optional
from .config import Config
from stustapay.core.subcommand import SubCommand
import asyncpg

from stustapay.core.service.customer import csv_export, get_customer_bank_data, sepa_export
from . import database


class CustomerExportCli(SubCommand):
    """
    Customer SEPA Export utility cli
    Examples:
        python -m stustapay.core -v customer-bank-export sepa -f sepa_transfer.xml
        python -m stustapay.core -v customer-bank-export csv -f customer_bank_data.csv
    """

    def __init__(self, args, config: Config, **kwargs):
        del kwargs
        self.config = config
        self.args = args

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument(
            "action", choices=["sepa", "csv"], default="sepa", help="Choose between SEPA transfer file or CSV file"
        )
        subparser.add_argument("-f", "--output-path", default=None, type=str, help="Output path for SEPA transfer file")
        subparser.add_argument(
            "-t",
            "--execution-date",
            default=None,
            type=str,
            help="Execution date for SEPA transfer. Format: YYYY-MM-DD",
        )

    async def _export_customer_csv_bank_data(self, db_pool: asyncpg.Pool, output_path: Optional[str]):
        output_path = output_path or "customer_bank_data.csv"

        # sql statement to get all customer with iban not null
        customers_bank_data = await get_customer_bank_data(db_pool=db_pool)

        # create csv file with iban, name, balance, transfer description: customer tag
        csv_export(customers_bank_data, output_path)
        logging.info(f"Exported customers' bank data to {output_path}")

    async def _export_customer_sepa_bank_data(
        self, db_pool: asyncpg.Pool, output_path: Optional[str], execution_date: Optional[datetime.date] = None
    ):
        output_path = output_path or "sepa_transfer.xml"

        # sql statement to get all customer with iban not null
        customers_bank_data = await get_customer_bank_data(db_pool=db_pool)

        # create csv file with iban, name, balance, transfer description: customer tag
        sepa_export(customers_bank_data, output_path, self.config, execution_date)
        logging.info(f"Exported customers' bank data to {output_path}")

    async def run(self):
        db_pool = await database.create_db_pool(self.config.database)
        if self.args.action == "sepa":
            await self._export_customer_sepa_bank_data(
                db_pool, self.args.output_path, datetime.datetime.strptime(self.args.execution_date, "%Y-%m-%d").date()
            )
        elif self.args.action == "csv":
            await self._export_customer_csv_bank_data(db_pool, self.args.output_path)
