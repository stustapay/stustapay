import datetime
import logging
import os
from typing import Optional

import asyncpg

from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.payout import (
    create_payout_run,
    dump_payout_run_as_csv,
    dump_payout_run_as_sepa_xml,
    get_customer_bank_data,
    get_number_of_payouts,
)
from stustapay.core.subcommand import SubCommand

from . import database
from .config import Config
from .service.auth import AuthService

# filename for the sepa transfer export,
# can be batched into num_%d
SEPA_PATH = "sepa__run_{}__num_{}.xml"

# filename for the bank transfer csv overview
CSV_PATH = "bank_export__run_{}.csv"


class CustomerBankExport(SubCommand):
    """
    Customer SEPA Export utility CLI.

    Use this to generate payouts for leftover customer balance.
    """

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
            help="If set, don't perform any database modifications.",
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
        subparser.add_argument(
            "-s",
            "--max-payout-sum",
            default=50_000.0,
            type=float,
            help="Maximum sum of money being payed out for this payout run. Relevant is the bank only accepts a certain max. number that one can spend per day. If not given, the default is 50.000€.",
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
            await export_customer_payouts(
                config=self.config,
                db_pool=db_pool,
                execution_date=execution_date,
                created_by=self.args.created_by,
                max_export_items_per_batch=self.args.max_transactions_batch,
                dry_run=self.args.dry_run,
                payout_run_id=self.args.payout_run_id,
                output_path=self.args.output_path,
                max_payout_sum=self.args.max_payout_sum,
            )
        finally:
            await db_pool.close()


async def export_customer_payouts(
    config: Config,
    db_pool: asyncpg.Pool,
    created_by: str,
    execution_date: Optional[datetime.date] = None,
    max_export_items_per_batch: Optional[int] = None,
    dry_run: bool = False,
    payout_run_id: Optional[int] = None,
    output_path: str = "",
    max_payout_sum: float = 50000.0,
):
    execution_date = execution_date or datetime.date.today() + datetime.timedelta(days=2)

    async with db_pool.acquire() as conn:
        async with conn.transaction():
            if payout_run_id is None:
                payout_run_id, number_of_payouts = await create_payout_run(conn, created_by, max_payout_sum)
            else:
                number_of_payouts = await get_number_of_payouts(conn=conn, payout_run_id=payout_run_id)

            if number_of_payouts == 0:
                logging.warning("No customers with bank data found. Nothing to export.")
                await conn.execute("rollback")
                return

            max_export_items_per_batch = max_export_items_per_batch or number_of_payouts
            cfg_srvc = ConfigService(
                db_pool=db_pool, config=config, auth_service=AuthService(db_pool=db_pool, config=config)
            )
            currency_ident = (await cfg_srvc.get_public_config(conn=conn)).currency_identifier
            sepa_config = await cfg_srvc.get_sepa_config(conn=conn)

            # sepa export
            customers_bank_data = await get_customer_bank_data(
                conn=conn,
                payout_run_id=payout_run_id,
            )
            sepa_batches = dump_payout_run_as_sepa_xml(
                customers_bank_data=customers_bank_data,
                sepa_config=sepa_config,
                execution_date=execution_date,
                currency_ident=currency_ident,
                batch_size=max_export_items_per_batch,
            )
            for i, batch in enumerate(sepa_batches):
                file_path = os.path.join(output_path, SEPA_PATH.format(payout_run_id, i + 1))
                with open(file_path, "w+") as f:
                    f.write(batch)

            # csv export, only one batch
            csv_batches = list(
                dump_payout_run_as_csv(
                    customers_bank_data=customers_bank_data, sepa_config=sepa_config, currency_ident=currency_ident
                )
            )
            file_path = os.path.join(output_path, CSV_PATH.format(payout_run_id))
            with open(file_path, "w+") as f:
                f.write(csv_batches[0])
            if dry_run:
                # abort transaction
                await conn.execute("rollback")
                logging.warning("Dry run. No database entry created!")

    logging.info(
        f"Exported payouts of {number_of_payouts} customers into {max_export_items_per_batch} files named "
        f"{SEPA_PATH.format(payout_run_id, 'x')} and {CSV_PATH.format(payout_run_id)}"
    )
