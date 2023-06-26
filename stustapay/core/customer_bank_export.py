import datetime
import logging
import math
import os
from typing import Optional

import asyncpg

from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import (
    create_payout_run,
    csv_export,
    get_customer_bank_data,
    get_number_of_payouts,
    sepa_export,
)
from stustapay.core.subcommand import SubCommand
from . import database
from .config import Config
from .service.auth import AuthService


class CustomerExportCli(SubCommand):
    """
    Customer SEPA Export utility cli
    """

    SEPA_PATH = "sepa__run_{}__num_{}.xml"
    CSV_PATH = "bank_export__run_{}.csv"

    def __init__(self, args, config: Config, **kwargs):
        del kwargs
        self.config = config
        self.args = args

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument(
            "created_by", type=str, help="User who created the payout run. This is used for logging purposes."
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
        subparser.add_argument(
            "-d",
            "--dry-run",
            action="store_true",
            help="Dry run. No database entry created.",
        )
        subparser.add_argument(
            "-p",
            "--payout-run-id",
            default=None,
            type=int,
            help="Payout run id. If not given, a new payout run is created. If given, the payout run is recreated.",
        )
        subparser.add_argument(
            "-o",
            "--output-path",
            default="",
            type=str,
            help="Output path for the generated files. If not given, the current working directory is used.",
        )

    async def _export_customer_bank_data(
        self,
        db_pool: asyncpg.Pool,
        created_by: str,
        execution_date: Optional[datetime.date] = None,
        max_export_items_per_batch: Optional[int] = None,
        dry_run: bool = False,
        payout_run_id: Optional[int] = None,
        output_path: str = "",
    ):
        execution_date = execution_date or datetime.date.today() + datetime.timedelta(days=2)

        async with db_pool.acquire() as conn:
            async with conn.transaction():
                if payout_run_id is None:
                    payout_run_id, number_of_payouts = await create_payout_run(conn, created_by)
                else:
                    number_of_payouts = await get_number_of_payouts(conn=conn, payout_run_id=payout_run_id)

                if number_of_payouts == 0:
                    logging.warning("No customers with bank data found. Nothing to export.")
                    await conn.execute("rollback")
                    return

                max_export_items_per_batch = max_export_items_per_batch or number_of_payouts
                cfg_srvc = ConfigService(
                    db_pool=db_pool, config=self.config, auth_service=AuthService(db_pool=db_pool, config=self.config)
                )
                currency_ident = (await cfg_srvc.get_public_config(conn=conn)).currency_identifier
                sepa_config = await cfg_srvc.get_sepa_config(conn=conn)

                # sepa export
                for i in range(math.ceil(number_of_payouts / max_export_items_per_batch)):
                    customers_bank_data = await get_customer_bank_data(
                        conn=conn,
                        payout_run_id=payout_run_id,
                        max_export_items_per_batch=max_export_items_per_batch,
                        ith_batch=i,
                    )
                    file_path = os.path.join(output_path, self.SEPA_PATH.format(payout_run_id, i + 1))
                    await sepa_export(
                        customers_bank_data=customers_bank_data,
                        output_path=file_path,
                        sepa_config=sepa_config,
                        currency_ident=currency_ident,
                        execution_date=execution_date,
                    )

                # csv export
                file_path = os.path.join(output_path, self.CSV_PATH.format(payout_run_id))
                customers_bank_data = await get_customer_bank_data(
                    conn=conn, payout_run_id=payout_run_id, max_export_items_per_batch=number_of_payouts
                )
                await csv_export(
                    customers_bank_data=customers_bank_data,
                    output_path=file_path,
                    sepa_config=sepa_config,
                    currency_ident=currency_ident,
                    execution_date=execution_date,
                )
                if dry_run:
                    # abort transaction
                    await conn.execute("rollback")
                    logging.warning("Dry run. No database entry created!")

        logging.info(
            f"Exported bank data of {number_of_payouts} customers into #{i + 1} files named "
            f"{self.SEPA_PATH.format(payout_run_id, 'x')} and {self.CSV_PATH.format(payout_run_id)}"
        )

    async def run(self):
        db_pool = await database.create_db_pool(self.config.database)
        try:
            await database.check_revision_version(db_pool)
            execution_date = (
                datetime.datetime.strptime(self.args.execution_date, "%Y-%m-%d").date()
                if self.args.execution_date
                else None
            )
            await self._export_customer_bank_data(
                db_pool=db_pool,
                execution_date=execution_date,
                created_by=self.args.created_by,
                max_export_items_per_batch=self.args.max_transactions_batch,
                dry_run=self.args.dry_run,
                payout_run_id=self.args.payout_run_id,
                output_path=self.args.output_path,
            )
        finally:
            await db_pool.close()
