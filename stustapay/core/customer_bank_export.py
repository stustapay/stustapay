import datetime
import logging
import math
from typing import Optional

import asyncpg

from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import (
    csv_export,
    get_customer_bank_data,
    get_number_of_customers,
    sepa_export,
)
from stustapay.core.subcommand import SubCommand
from . import database
from .config import Config
from .service.auth import AuthService


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
            "action", choices=["sepa", "csv"], default="sepa", help="Choose between SEPA transfer file or CSV file."
        )
        subparser.add_argument(
            "-f",
            "--output-path",
            default="customer_bank_data",
            type=str,
            help="Output path for export file without file extensions.",
        )
        subparser.add_argument(
            "-t",
            "--execution-date",
            default=None,
            type=str,
            help="Execution date for SEPA transfer. Format: YYYY-MM-DD",
        )
        subparser.add_argument(
            "-n",
            "--max-transactions-batch",
            default=None,
            type=int,
            help="Maximum amount of transactions per file. Not giving this argument means one large batch with all customers in a single file.",
        )

    async def _export_customer_bank_data(
        self,
        db_pool: asyncpg.Pool,
        output_path: str,
        execution_date: Optional[datetime.date] = None,
        max_export_items_per_batch: Optional[int] = None,
        data_format: str = "sepa",
    ):
        """
        Supported data formats: sepa, csv
        """
        if data_format == "csv":
            export_function = csv_export
            file_extension = "csv"
        elif data_format == "sepa":
            export_function = sepa_export
            file_extension = "xml"
        else:
            logging.error("Data format not supported!")
            return

        async with db_pool.acquire() as conn:
            number_of_customers = await get_number_of_customers(conn=conn)
            if number_of_customers == 0:
                logging.info("No customers with bank data found. Nothing to export.")

            max_export_items_per_batch = max_export_items_per_batch or number_of_customers

            for i in range(math.ceil(number_of_customers / max_export_items_per_batch)):
                # get all customer with iban not null
                customers_bank_data = await get_customer_bank_data(
                    conn=conn, max_export_items_per_batch=max_export_items_per_batch, ith_batch=i
                )

                cfg_srvc = ConfigService(
                    db_pool=db_pool, config=self.config, auth_service=AuthService(db_pool=db_pool, config=self.config)
                )
                currency_ident = (await cfg_srvc.get_public_config(conn=conn)).currency_identifier
                sepa_config = await cfg_srvc.get_sepa_config(conn=conn)

                output_path_file_extension = f"{output_path}_{i+1}.{file_extension}"

                await export_function(
                    customers_bank_data=customers_bank_data,
                    output_path=output_path_file_extension,
                    sepa_config=sepa_config,
                    currency_ident=currency_ident,
                    execution_date=execution_date,
                )

        logging.info(
            f"Exported bank data of {number_of_customers} customers into #{i + 1} files named {output_path}_x.{file_extension}"
        )

    async def run(self):
        db_pool = await database.create_db_pool(self.config.database)
        await database.check_revision_version(db_pool)
        if self.args.action == "sepa":
            execution_date = (
                datetime.datetime.strptime(self.args.execution_date, "%Y-%m-%d").date()
                if self.args.execution_date
                else None
            )
        # self.args.action is either sepa or csv
        await self._export_customer_bank_data(
            db_pool=db_pool,
            output_path=self.args.output_path,
            execution_date=execution_date,
            data_format=self.args.action,
        )
