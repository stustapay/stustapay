import csv
import datetime
import io
import logging
import re
from typing import Iterator, Optional

import asyncpg
from schwifty import IBAN
from sepaxml import SepaTransfer

from stustapay.core.config import Config
from stustapay.core.schema.config import SEPAConfig
from stustapay.core.schema.payout import (
    NewPayoutRun,
    Payout,
    PayoutRunWithStats,
    PendingPayoutDetail,
)
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import CurrentUser, Privilege, format_user_tag_uid
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.config import ConfigService
from stustapay.core.service.tree.common import fetch_event_node_for_node
from stustapay.framework.database import Connection


async def get_number_of_payouts(conn: Connection, event_node_id: int, payout_run_id: int | None = None) -> int:
    if payout_run_id is None:
        return await conn.fetchval(
            "select count(*) from payout where payout_run_id is null and node_id = $1", event_node_id
        )
    return await conn.fetchval(
        "select count(*) from payout where payout_run_id = $1 and node_id = $2", payout_run_id, event_node_id
    )


async def create_payout_run(
    conn: Connection, event_node_id: int, created_by: str, max_payout_sum: float
) -> tuple[int, int]:
    """
    Args:
        created_by (str): Person who initiated the payout, can be used for documentation reasons
        max_payout_sum (float): Respected as the maximum amount of money payed out in this run.
            This is useful if your bank only allows to transfer a maximum amount of money per transaction.
    Raises:
        InvalidArgument: Thrown if no the payout does not contain any payouts.
            e.g. if max_payout_sum is too low such that a payout with at least one payout is included
            or if no customer provided his bank info.

    Returns:
        tuple[int, int]: created payout run id and number of payouts in that payout run
    """

    # check before if the number of payouts is larger than zero
    number_of_payouts = await conn.fetchval(
        "select count(*) from ( "
        "   select "
        "       customer_account_id, "
        "       sum(balance) over (order by customer_account_id rows between unbounded preceding and current row) as running_total "
        "   from payout p where p.payout_run_id is null and p.node_id = $2 "
        ") as agr "
        "where running_total <= $1",
        max_payout_sum,
        event_node_id,
    )
    if number_of_payouts == 0:
        raise InvalidArgument(
            "Payout run would have zero payouts. Either no customer has provided bank info or max payout sum is too low."
        )

    payout_run_id = await conn.fetchval(
        "insert into payout_run (node_id, created_at, created_by) values ($1, now(), $2) returning id",
        event_node_id,
        created_by,
    )

    # set the new payout_run_id for all customers that have no payout assigned yet.
    # the customer record is created when people save their bank data to request a payout.
    number_of_payouts = await conn.fetchval(
        "with scheduled_payouts as ("
        "    update customer_info c "
        "        set payout_run_id = $1 "
        "    where c.customer_account_id in ( "
        "        select customer_account_id from ( "
        "           select "
        "               customer_account_id, "
        "               sum(balance) over (order by customer_account_id rows between unbounded preceding and current row) as running_total "
        "           from payout p where p.payout_run_id is null and p.node_id = $3 "
        "        ) as agr where running_total <= $2"
        "    ) returning 1"
        ") select count(*) from scheduled_payouts",
        payout_run_id,
        max_payout_sum,
        event_node_id,
    )
    return payout_run_id, number_of_payouts


async def get_customer_bank_data(conn: Connection, payout_run_id: int) -> list[Payout]:
    return await conn.fetch_many(
        Payout,
        "select * from payout where payout_run_id = $1 order by customer_account_id asc",
        payout_run_id,
    )


def dump_payout_run_as_csv(
    customers_bank_data: list[Payout],
    sepa_config: SEPAConfig,
    currency_ident: str,
    batch_size: Optional[int] = None,
) -> Iterator[str]:
    batch_size = batch_size or len(customers_bank_data)
    for i in range(0, len(customers_bank_data), batch_size):
        batch = customers_bank_data[i : i + batch_size]
        output = io.StringIO()
        writer = csv.DictWriter(
            output,
            [
                "customer_account_id",
                "beneficiary_name",
                "iban",
                "amount",
                "currency",
                "reference",
                "uid",
                "email",
            ],
        )
        writer.writeheader()
        for customer in batch:
            writer.writerow(
                {
                    "customer_account_id": customer.customer_account_id,
                    "beneficiary_name": customer.account_name,
                    "iban": customer.iban,
                    "amount": round(customer.balance, 2),
                    "currency": currency_ident,
                    "reference": sepa_config.description.format(
                        user_tag_uid=format_user_tag_uid(customer.user_tag_uid)
                    ),
                    "uid": customer.user_tag_uid,
                    "email": customer.email,
                },
            )
        yield output.getvalue()


def dump_payout_run_as_sepa_xml(
    customers_bank_data: list[Payout],
    currency_ident: str,
    sepa_config: SEPAConfig,
    execution_date: datetime.date,
    batch_size: Optional[int] = None,
) -> Iterator[str]:
    if len(customers_bank_data) == 0:
        # avoid error in sepa library
        logging.warning("No customers with bank data found. Nothing to export.")
        return

    batch_size = batch_size or len(customers_bank_data)
    for i in range(0, len(customers_bank_data), batch_size):
        batch = customers_bank_data[i : i + batch_size]
        iban = IBAN(sepa_config.sender_iban)
        config = {
            "name": sepa_config.sender_name,
            "IBAN": iban.compact,
            "BIC": str(iban.bic),
            "batch": len(batch) > 1,
            "currency": currency_ident,  # ISO 4217
        }
        sepa = SepaTransfer(config, clean=True)
        if config["BIC"] == "None":
            raise ValueError("Sender BIC couldn't calculated correctly from given IBAN")
        if execution_date < datetime.date.today():
            raise ValueError("Execution date cannot be in the past")

        for customer in batch:
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
                raise ValueError(
                    f"Amount must be greater than 0: {payment['amount']}, id: {customer.customer_account_id}"
                )

            sepa.add_payment(payment)

        sepa_xml = sepa.export(validate=True, pretty_print=True)
        yield sepa_xml.decode("utf-8")


class PayoutService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_pending_payout_detail(self, *, conn: Connection) -> PendingPayoutDetail:
        return await conn.fetch_one(
            PendingPayoutDetail,
            "select coalesce(sum(c.balance), 0) - coalesce(sum(c.donation), 0) as total_payout_amount, "
            "   coalesce(sum(c.donation), 0) as total_donation_amount, "
            "   count(*) as n_payouts "
            "from customer c "
            "where c.payout_run_id is null and c.customer_account_id is not null",
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_payout_run_payouts(self, *, conn: Connection, payout_run_id: int) -> list[Payout]:
        return await conn.fetch_many(
            Payout, "select * from payout where payout_run_id = $1 order by account_name", payout_run_id
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_payout_run_csv(
        self, *, conn: Connection, node: Node, payout_run_id: int, batch_size: Optional[int]
    ) -> Iterator[str]:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=node.id)
        assert event_node is not None
        assert event_node.event is not None
        sepa_config = event_node.event.sepa_config
        if sepa_config is None:
            raise InvalidArgument("SEPA payout is disabled for this event")
        customers_bank_data = await get_customer_bank_data(conn=conn, payout_run_id=payout_run_id)
        currency_identifier = event_node.event.currency_identifier
        return dump_payout_run_as_csv(
            customers_bank_data=customers_bank_data,
            sepa_config=sepa_config,
            currency_ident=currency_identifier,
            batch_size=batch_size,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_payout_run_sepa_xml(
        self,
        *,
        conn: Connection,
        node: Node,
        payout_run_id: int,
        execution_date: datetime.date,
        batch_size: Optional[int],
    ) -> Iterator[str]:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=node.id)
        assert event_node is not None
        assert event_node.event is not None
        sepa_config = event_node.event.sepa_config
        if sepa_config is None:
            raise InvalidArgument("SEPA payout is disabled for this event")
        customers_bank_data = await get_customer_bank_data(conn=conn, payout_run_id=payout_run_id)
        currency_identifier = event_node.event.currency_identifier
        return dump_payout_run_as_sepa_xml(
            customers_bank_data=customers_bank_data,
            sepa_config=sepa_config,
            currency_ident=currency_identifier,
            execution_date=execution_date,
            batch_size=batch_size,
        )

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def create_payout_run(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, new_payout_run: NewPayoutRun
    ) -> PayoutRunWithStats:
        run_id, _ = await create_payout_run(
            conn=conn,
            event_node_id=node.id,
            created_by=current_user.login,
            max_payout_sum=new_payout_run.max_payout_sum,
        )
        return await conn.fetch_one(PayoutRunWithStats, "select * from payout_run_with_stats where id = $1", run_id)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def list_payout_runs(self, *, conn: Connection) -> list[PayoutRunWithStats]:
        return await conn.fetch_many(PayoutRunWithStats, "select * from payout_run_with_stats order by created_at desc")
