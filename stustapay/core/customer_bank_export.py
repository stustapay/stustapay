import datetime
import logging
from pathlib import Path
from typing import Optional

import asyncpg

from stustapay.core.service.customer.payout import (
    create_payout_run,
    dump_payout_run_as_csv,
    dump_payout_run_as_sepa_xml,
    get_customer_bank_data,
    get_number_of_payouts,
)
from stustapay.framework.database import create_db_pool

from . import database
from .config import Config
from .service.common.error import InvalidArgument
from .service.tree.common import fetch_event_node_for_node

# filename for the sepa transfer export,
# can be batched into num_%d
SEPA_PATH = "sepa__run_{}__num_{}.xml"

# filename for the bank transfer csv overview
CSV_PATH = "bank_export__run_{}.csv"


async def _export_customer_payouts(
    db_pool: asyncpg.Pool,
    event_node_id: int,
    created_by: str,
    execution_date: Optional[datetime.date],
    max_export_items_per_batch: Optional[int],
    dry_run: bool,
    payout_run_id: Optional[int],
    output_path: Optional[Path],
    max_payout_sum: float,
) -> int:
    if output_path is None:
        output_path = Path.cwd()
    execution_date = execution_date or datetime.date.today() + datetime.timedelta(days=2)

    async with db_pool.acquire() as conn:
        async with conn.transaction(isolation="serializable"):
            event_node = await fetch_event_node_for_node(conn=conn, node_id=event_node_id)
            assert event_node is not None
            assert event_node.event is not None
            if payout_run_id is None:
                payout_run_id, number_of_payouts = await create_payout_run(
                    conn=conn, event_node_id=event_node.id, created_by=created_by, max_payout_sum=max_payout_sum
                )
            else:
                number_of_payouts = await get_number_of_payouts(
                    conn=conn, event_node_id=event_node.id, payout_run_id=payout_run_id
                )

            if number_of_payouts == 0:
                logging.warning("No customers with bank data found. Nothing to export.")
                await conn.execute("rollback")
                return payout_run_id

            max_export_items_per_batch = max_export_items_per_batch or number_of_payouts
            currency_ident = event_node.event.currency_identifier

            # sepa export
            customers_bank_data = await get_customer_bank_data(
                conn=conn,
                payout_run_id=payout_run_id,
            )
            sepa_config = event_node.event.sepa_config
            if sepa_config is None:
                raise InvalidArgument("SEPA payout is disabled for this event")
            sepa_batches = dump_payout_run_as_sepa_xml(
                customers_bank_data=customers_bank_data,
                sepa_config=sepa_config,
                execution_date=execution_date,
                currency_ident=currency_ident,
                batch_size=max_export_items_per_batch,
            )
            for i, batch in enumerate(sepa_batches):
                file_path = output_path / SEPA_PATH.format(payout_run_id, i + 1)
                with open(file_path, "w+") as f:
                    f.write(batch)

            # csv export, only one batch
            csv_batches = list(
                dump_payout_run_as_csv(
                    customers_bank_data=customers_bank_data, sepa_config=sepa_config, currency_ident=currency_ident
                )
            )
            file_path = output_path / CSV_PATH.format(payout_run_id)
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
    return payout_run_id


async def export_customer_payouts(
    config: Config,
    created_by: str,
    dry_run: bool,
    event_node_id: int,
    max_payout_sum: float = 50000.0,
    execution_date: Optional[datetime.date] = None,
    max_transactions_per_batch: Optional[int] = None,
    payout_run_id: Optional[int] = None,
    output_path: Optional[Path] = None,
) -> int:
    """
    returns: payout_run_id
    """
    db_pool = await create_db_pool(config.database)
    try:
        await database.check_revision_version(db_pool)
        return await _export_customer_payouts(
            db_pool=db_pool,
            execution_date=execution_date,
            created_by=created_by,
            max_export_items_per_batch=max_transactions_per_batch,
            dry_run=dry_run,
            event_node_id=event_node_id,
            payout_run_id=payout_run_id,
            output_path=output_path,
            max_payout_sum=max_payout_sum,
        )
    finally:
        await db_pool.close()
