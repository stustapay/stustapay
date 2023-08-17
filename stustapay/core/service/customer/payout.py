import csv
import datetime
import io
import logging
import re
from typing import Optional

import asyncpg
from schwifty import IBAN
from sepaxml import SepaTransfer

from stustapay.core.config import Config
from stustapay.core.database import Connection
from stustapay.core.schema.config import SEPAConfig
from stustapay.core.schema.payout import Payout, PayoutRunWithStats, NewPayoutRun, PendingPayoutDetail
from stustapay.core.schema.user import format_user_tag_uid, Privilege, CurrentUser
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import with_db_transaction, requires_user
from stustapay.core.service.config import ConfigService


async def get_number_of_payouts(conn: Connection, payout_run_id: Optional[int]) -> int:
    if payout_run_id is None:
        return await conn.fetchval("select count(*) from payout where payout_run_id is null")
    return await conn.fetchval("select count(*) from payout where payout_run_id = $1", payout_run_id)


async def create_payout_run(
    conn: Connection, created_by: str, execution_date: datetime.date, max_payout_sum: float
) -> tuple[int, int]:
    payout_run_id = await conn.fetchval(
        "insert into payout_run (created_at, created_by, execution_date) values (now(), $1, $2) returning id",
        created_by,
        execution_date,
    )

    # set the new payout_run_id for all customers that have no payout assigned yet.
    # the customer record is created when people save their bank data to request a payout.
    number_of_payouts = await conn.fetchval(
        "with scheduled_payouts as ("
        "    update customer_info c "
        "        set payout_run_id = $1 "
        "    where c.customer_account_id in ( "
        "        select customer_account_id from ( "
        "            select customer_account_id, SUM(balance) OVER (order by customer_account_id rows between unbounded preceding and current row) as running_total from payout p where p.payout_run_id is null "
        "        ) as agr where running_total <= $2"
        "    ) returning 1"
        ") select count(*) from scheduled_payouts",
        payout_run_id,
        max_payout_sum,
    )
    return payout_run_id, number_of_payouts


async def get_customer_bank_data(
    conn: Connection, payout_run_id: int, max_export_items_per_batch: int, ith_batch: int = 0
) -> list[Payout]:
    return await conn.fetch_many(
        Payout,
        "select * from payout where payout_run_id = $1 order by customer_account_id asc limit $2 offset $3",
        payout_run_id,
        max_export_items_per_batch,
        ith_batch * max_export_items_per_batch,
    )


async def dump_payout_run_as_csv(
    customers_bank_data: list[Payout], sepa_config: SEPAConfig, currency_ident: str, execution_date: datetime.date
) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    fields = [
        "customer_account_id",
        "beneficiary_name",
        "iban",
        "amount",
        "currency",
        "reference",
        "execution_date",
        "uid",
        "email",
    ]
    writer.writerow(fields)
    for customer in customers_bank_data:
        writer.writerow(
            [
                customer.customer_account_id,
                customer.account_name,
                customer.iban,
                round(customer.balance, 2),
                currency_ident,
                sepa_config.description.format(user_tag_uid=format_user_tag_uid(customer.user_tag_uid)),
                execution_date.isoformat(),
                customer.user_tag_uid,
                customer.email,
            ]
        )
    return output.getvalue()


async def csv_export(
    customers_bank_data: list[Payout],
    output_path: str,
    sepa_config: SEPAConfig,
    currency_ident: str,
    execution_date: datetime.date,
) -> None:
    with open(output_path, "w") as f:
        csv_data = await dump_payout_run_as_csv(
            customers_bank_data=customers_bank_data,
            sepa_config=sepa_config,
            currency_ident=currency_ident,
            execution_date=execution_date,
        )
        f.write(csv_data)


async def dump_payout_run_as_sepa_xml(
    customers_bank_data: list[Payout],
    sepa_config: SEPAConfig,
    currency_ident: str,
    execution_date: datetime.date,
) -> str:
    iban = IBAN(sepa_config.sender_iban)
    config = {
        "name": sepa_config.sender_name,
        "IBAN": iban.compact,
        "BIC": str(iban.bic),
        "batch": len(customers_bank_data) > 1,
        "currency": currency_ident,  # ISO 4217
    }
    sepa = SepaTransfer(config, clean=True)
    if config["BIC"] == "None":
        raise ValueError("Sender BIC couldn't calculated correctly from given IBAN")
    if execution_date < datetime.date.today():
        raise ValueError("Execution date cannot be in the past")

    for customer in customers_bank_data:
        payment = {
            "name": customer.account_name,
            "IBAN": IBAN(customer.iban).compact,
            "amount": round(customer.balance * 100),  # in cents
            "execution_date": execution_date,
            "description": sepa_config.description.format(user_tag_uid=format_user_tag_uid(customer.user_tag_uid)),
        }

        if not re.match(r"^[a-zA-Z0-9 \-.,:()/?'+]*$", payment["description"]):  # type: ignore
            raise ValueError(
                f"Description contains invalid characters: {payment['description']}, id: {customer.customer_account_id}"
            )
        if payment["amount"] <= 0:  # type: ignore
            raise ValueError(f"Amount must be greater than 0: {payment['amount']}, id: {customer.customer_account_id}")

        sepa.add_payment(payment)

    sepa_xml = sepa.export(validate=True, pretty_print=True)
    return sepa_xml.decode("utf-8")


async def sepa_export(
    customers_bank_data: list[Payout],
    output_path: str,
    sepa_config: SEPAConfig,
    currency_ident: str,
    execution_date: datetime.date,
) -> None:
    if len(customers_bank_data) == 0:
        # avoid error in sepa library
        logging.warning("No customers with bank data found. Nothing to export.")
        return

    sepa_xml = await dump_payout_run_as_sepa_xml(
        customers_bank_data=customers_bank_data,
        sepa_config=sepa_config,
        currency_ident=currency_ident,
        execution_date=execution_date,
    )

    # create sepa xml file for sepa transfer to upload in online banking
    with open(output_path, "w") as f:
        f.write(sepa_xml)


class PayoutService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: payout_management
    # @requires_user([Privilege.tse_management])
    async def get_pending_payout_detail(self, *, conn: Connection) -> PendingPayoutDetail:
        return await conn.fetch_one(
            PendingPayoutDetail,
            "select coalesce(sum(c.balance), 0) - coalesce(sum(c.donation), 0) as total_payout_amount, "
            "   coalesce(sum(c.donation), 0) as total_donation_amount, "
            "   count(*) as n_payouts "
            "from customer c "
            "where c.payout_run_id is null and c.customer_account_id is not null",
        )

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: payout_management
    # @requires_user([Privilege.tse_management])
    async def get_payout_run_csv(self, *, conn: Connection, payout_run_id: int) -> str:
        payout_run = await conn.fetch_one(
            PayoutRunWithStats, "select * from payout_run_with_stats where id = $1", payout_run_id
        )
        number_of_payouts = await get_number_of_payouts(conn=conn, payout_run_id=payout_run_id)
        customers_bank_data = await get_customer_bank_data(
            conn=conn, payout_run_id=payout_run_id, max_export_items_per_batch=number_of_payouts
        )
        currency_identifier = (await self.config_service.get_public_config()).currency_identifier
        return await dump_payout_run_as_csv(
            customers_bank_data=customers_bank_data,
            sepa_config=await self.config_service.get_sepa_config(),
            currency_ident=currency_identifier,
            execution_date=payout_run.execution_date,
        )

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: payout_management
    # @requires_user([Privilege.tse_management])
    async def get_payout_run_sepa_xml(self, *, conn: Connection, payout_run_id: int) -> str:
        payout_run = await conn.fetch_one(
            PayoutRunWithStats, "select * from payout_run_with_stats where id = $1", payout_run_id
        )
        number_of_payouts = await get_number_of_payouts(conn=conn, payout_run_id=payout_run_id)
        customers_bank_data = await get_customer_bank_data(
            conn=conn, payout_run_id=payout_run_id, max_export_items_per_batch=number_of_payouts
        )
        currency_identifier = (await self.config_service.get_public_config()).currency_identifier
        return await dump_payout_run_as_sepa_xml(
            customers_bank_data=customers_bank_data,
            sepa_config=await self.config_service.get_sepa_config(),
            currency_ident=currency_identifier,
            execution_date=payout_run.execution_date,
        )

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: payout_management
    # @requires_user([Privilege.tse_management])
    async def create_payout_run(
        self, *, conn: Connection, current_user: CurrentUser, new_payout_run: NewPayoutRun
    ) -> PayoutRunWithStats:
        run_id, _ = await create_payout_run(
            conn=conn,
            created_by=current_user.login,
            max_payout_sum=new_payout_run.max_payout_sum,
            execution_date=new_payout_run.execution_date,
        )
        return await conn.fetch_one(PayoutRunWithStats, "select * from payout_run_with_stats where id = $1", run_id)

    @with_db_transaction
    @requires_user([Privilege.account_management])  # TODO: payout_management
    # @requires_user([Privilege.tse_management])
    async def list_payout_runs(self, *, conn: Connection) -> list[PayoutRunWithStats]:
        return await conn.fetch_many(PayoutRunWithStats, "select * from payout_run_with_stats")
