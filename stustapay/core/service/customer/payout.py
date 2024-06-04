import csv
import datetime
import io
import re

import asyncpg
from schwifty import IBAN
from sepaxml import SepaTransfer

from stustapay.core.config import Config
from stustapay.core.schema.account import AccountType
from stustapay.core.schema.config import SEPAConfig
from stustapay.core.schema.payout import (
    NewPayoutRun,
    Payout,
    PayoutRun,
    PayoutRunWithStats,
    PendingPayoutDetail,
)
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import CurrentUser, Privilege, format_user_tag_uid
from stustapay.core.service.account import get_system_account_for_node
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument, NotFound
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.common import fetch_customer
from stustapay.core.service.mail import MailService
from stustapay.core.service.tree.common import (
    fetch_event_node_for_node,
    fetch_restricted_event_settings_for_node,
)
from stustapay.framework.database import Connection


async def fetch_payout_run(conn: Connection, node: Node, payout_run_id: int) -> PayoutRun:
    return await conn.fetch_one(
        PayoutRun,
        "select id, created_by, created_at, node_id, done, revoked, sepa_xml is not null as sepa_was_generated,"
        "   set_done_by, set_done_at "
        "from payout_run where id = $1 and node_id = $2",
        payout_run_id,
        node.event_node_id,
    )


async def fetch_payout_run_with_stats(conn: Connection, node: Node, payout_run_id: int) -> PayoutRunWithStats:
    return await conn.fetch_one(
        PayoutRunWithStats,
        "select id, created_by, created_at, node_id, done, revoked, sepa_xml is not null as sepa_was_generated, "
        "   total_donation_amount, total_payout_amount, n_payouts, set_done_by, set_done_at "
        "from payout_run_with_stats where id = $1 and node_id = $2",
        payout_run_id,
        node.event_node_id,
    )


async def get_number_of_payouts(conn: Connection, event_node_id: int, payout_run_id: int | None = None) -> int:
    if payout_run_id is None:
        return await conn.fetchval(
            "select count(*) from customers_without_payout_run where node_id = $1", event_node_id
        )
    return await conn.fetchval(
        "select count(*) from payout p join account a on p.customer_account_id = a.id "
        "where p.payout_run_id = $1 and a.node_id = $2",
        payout_run_id,
        event_node_id,
    )


async def get_customer_bank_data(conn: Connection, payout_run_id: int) -> list[Payout]:
    return await conn.fetch_many(
        Payout,
        "select * from payout_view where payout_run_id = $1 order by customer_account_id asc",
        payout_run_id,
    )


def dump_payout_run_as_csv(
    customers_bank_data: list[Payout],
    sepa_config: SEPAConfig,
    currency_ident: str,
) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        [
            "customer_account_id",
            "beneficiary_name",
            "iban",
            "amount",
            "donation",
            "currency",
            "reference",
            "uid",
            "email",
        ],
    )
    writer.writeheader()
    for customer in customers_bank_data:
        writer.writerow(
            {
                "customer_account_id": customer.customer_account_id,
                "beneficiary_name": customer.account_name,
                "iban": customer.iban,
                "amount": round(customer.amount, 2),
                "donation": round(customer.donation, 2),
                "currency": currency_ident,
                "reference": sepa_config.description.format(user_tag_uid=format_user_tag_uid(customer.user_tag_uid)),
                "uid": format_user_tag_uid(customer.user_tag_uid),
                "email": customer.email,
            },
        )
    return output.getvalue()


def dump_payout_run_as_sepa_xml(
    payouts: list[Payout],
    currency_ident: str,
    sepa_config: SEPAConfig,
    execution_date: datetime.date,
) -> str:
    if len(payouts) == 0:
        raise InvalidArgument("No customers with bank data found. Nothing to export.")

    batch = payouts
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
        assert customer.iban is not None
        payment = {
            "name": customer.account_name,
            "IBAN": IBAN(customer.iban).compact,
            "amount": round(customer.amount * 100),  # in cents
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


class PayoutService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management])
    async def get_pending_payout_detail(self, *, conn: Connection, node: Node) -> PendingPayoutDetail:
        return await conn.fetch_one(
            PendingPayoutDetail,
            "select coalesce(sum(c.balance), 0) - coalesce(sum(c.donation), 0) as total_payout_amount, "
            "   coalesce(sum(c.donation), 0) as total_donation_amount, "
            "   count(*) as n_payouts "
            "from customers_without_payout_run c where c.node_id = $1",
            node.id,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management])
    async def get_payout_run_payouts(self, *, conn: Connection, node: Node, payout_run_id: int) -> list[Payout]:
        # this will error if no payout run with the given id exists for the given node
        await fetch_payout_run(conn=conn, node=node, payout_run_id=payout_run_id)
        return await conn.fetch_many(
            Payout, "select * from payout_view where payout_run_id = $1 order by account_name", payout_run_id
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management])
    async def get_payout_run_csv(self, *, conn: Connection, node: Node, payout_run_id: int) -> str:
        csv_data = await conn.fetchval(
            "select csv from payout_run where id = $1 and node_id = $2", payout_run_id, node.id
        )
        if csv_data is None:
            raise NotFound(element_typ="payout_run", element_id=payout_run_id)
        return csv_data

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management])
    async def get_payout_run_sepa_xml(
        self,
        *,
        conn: Connection,
        node: Node,
        payout_run_id: int,
        execution_date: datetime.date,
    ) -> str:
        event_node = await fetch_event_node_for_node(conn=conn, node_id=node.id)
        assert event_node is not None
        assert event_node.event is not None
        sepa_config = event_node.event.sepa_config
        if sepa_config is None:
            raise InvalidArgument("SEPA payout is disabled for this event")
        payouts = await conn.fetch_many(
            Payout,
            "select * from payout_view "
            "where payout_run_id = $1 and round(amount, 2) > 0 "
            "order by customer_account_id asc",
            payout_run_id,
        )
        currency_identifier = event_node.event.currency_identifier
        sepa_xml = dump_payout_run_as_sepa_xml(
            payouts=payouts,
            sepa_config=sepa_config,
            currency_ident=currency_identifier,
            execution_date=execution_date,
        )

        await conn.execute("update payout_run set sepa_xml = $1 where id = $2", sepa_xml, payout_run_id)

        return sepa_xml

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management])
    async def get_previous_payout_run_sepa_xml(
        self,
        *,
        conn: Connection,
        node: Node,
        payout_run_id: int,
    ) -> str:
        row = await conn.fetchrow(
            "select id, sepa_xml from payout_run where id = $1 and node_id = $2", payout_run_id, node.id
        )
        if row is None:
            raise NotFound(element_id=payout_run_id, element_typ="payout_run")
        if row["sepa_xml"] is None:
            raise InvalidArgument("SEPA xml has not been generated for this payout run yet")

        return row["sepa_xml"]

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management])
    async def set_payout_run_as_done(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, payout_run_id: int, mail_service: MailService
    ):
        payout_run = await fetch_payout_run(conn=conn, node=node, payout_run_id=payout_run_id)
        if payout_run.done:
            raise InvalidArgument("Payout run is already set to done")

        if payout_run.revoked:
            raise InvalidArgument("Payout run has been revoked")

        await conn.execute(
            "update payout_run set done = true, set_done_at = now(), set_done_by = $2 where id = $1",
            payout_run_id,
            current_user.id,
        )
        sepa_exit_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.sepa_exit)
        await conn.execute(
            "select book_transaction("
            "   order_id => null,"
            "   source_account_id => p.customer_account_id,"
            "   target_account_id => $2,"
            "   amount => p.amount,"  # this is customers balance minus donation (see payout creation)
            "   vouchers_amount => 0,"
            "   conducting_user_id => $3,"
            "   description => format('payout run %s sepa exit', $1::bigint)) "
            "from payout_view p where payout_run_id = $1 and round(p.amount, 2) > 0",
            payout_run_id,
            sepa_exit_acc.id,
            current_user.id,
        )
        donation_exit_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.donation_exit
        )
        await conn.execute(
            "select book_transaction("
            "   order_id => null,"
            "   source_account_id => p.customer_account_id,"
            "   target_account_id => $2,"
            "   amount => p.donation,"
            "   vouchers_amount => 0,"
            "   conducting_user_id => $3,"
            "   description => format('payout run %s donation exit', $1::bigint)) "
            "from payout_view p where payout_run_id = $1 and round(p.donation, 2) > 0",
            payout_run_id,
            donation_exit_acc.id,
            current_user.id,
        )

        payouts = await conn.fetch_many(
            Payout,
            "select * from payout_view p where p.payout_run_id = $1",
            payout_run_id,
        )

        res_config = await fetch_restricted_event_settings_for_node(conn, node.id)
        for payout in payouts:
            if payout.email is None:
                continue
            mail_service.send_mail(
                subject=res_config.payout_done_subject,
                message=res_config.payout_done_message.format(**payout.model_dump()),
                from_email=res_config.payout_sender,
                to_email=payout.email,
                node_id=node.id,
            )

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management])
    async def revoke_payout_run(self, *, conn: Connection, node: Node, payout_run_id: int):
        payout = await fetch_payout_run(conn=conn, node=node, payout_run_id=payout_run_id)
        if payout.done:
            raise InvalidArgument("Cannot revoke a payout run which has been marked as done")

        if payout.revoked:
            raise InvalidArgument("Payout run has already been revoked")

        await conn.execute("delete from payout where payout_run_id = $1", payout_run_id)
        await conn.execute("update payout_run set revoked = true where id = $1", payout_run_id)

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def create_payout_run(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, new_payout_run: NewPayoutRun
    ) -> PayoutRunWithStats:
        """
        Raises:
            InvalidArgument: Thrown if no the payout does not contain any payouts.
                e.g. if max_payout_sum is too low such that a payout with at least one payout is included
                or if no customer provided his bank info.
        """
        assert node.event_node_id is not None

        max_payout_sum = new_payout_run.max_payout_sum
        max_num_payouts = new_payout_run.max_num_payouts
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.event_node_id)
        if event_settings.sepa_config is None:
            raise InvalidArgument("SEPA payout is not configured for this event")

        if max_num_payouts > event_settings.sepa_max_num_payouts_in_run:
            raise InvalidArgument(
                "Max num of payouts cannot be larger than the max set at the event level. "
                f"Maximum defined at event: {event_settings.sepa_max_num_payouts_in_run}"
            )
        if max_num_payouts <= 0:
            raise InvalidArgument("Max num of payouts cannot be less than zero.")

        max_num_payouts = min(event_settings.sepa_max_num_payouts_in_run, max_num_payouts)

        # check before if the number of payouts is larger than zero
        number_of_payouts = await conn.fetchval(
            "select count(*) from ( "
            "   select "
            "       customer_account_id, "
            "       sum(balance - donation) over (order by customer_account_id rows between unbounded preceding and current row) as running_total "
            "   from customers_without_payout_run p where p.node_id = $2 and p.payout_export and round(p.balance, 2) > 0 "
            "   order by customer_account_id "
            ") as agr "
            "where running_total <= $1",
            max_payout_sum,
            node.event_node_id,
        )
        if number_of_payouts == 0:
            raise InvalidArgument(
                "Payout run would have zero payouts. "
                "Either no customer has provided bank info or max payout sum is too low."
            )

        payout_run_id = await conn.fetchval(
            "insert into payout_run (node_id, created_at, created_by) values ($1, now(), $2) returning id",
            node.event_node_id,
            current_user.id,
        )

        # set the new payout_run_id for all customers that have no payout assigned yet.
        # the customer record is created when people save their bank data to request a payout.
        await conn.fetchval(
            "with scheduled_payouts as ("
            "    insert into payout (customer_account_id, iban, account_name, email, amount, donation, payout_run_id) "
            "    select "
            "        c.id, "
            "        c.iban, "
            "        c.account_name, "
            "        c.email, "
            "        case when c.donate_all then 0.0 else greatest(0.0, c.balance - c.donation) end, "
            "        case when c.donate_all then c.balance else least(c.balance, c.donation) end, "
            "        $1 "
            "    from customer c "
            "    where c.customer_account_id in ( "
            "        select customer_account_id from ( "
            "           select "
            "               customer_account_id, "
            "               count(*) over (order by customer_account_id rows between unbounded preceding and current row) as index, "
            "               sum(balance - donation) over (order by customer_account_id rows between unbounded preceding and current row) as running_total "
            "           from customers_without_payout_run p "
            "           where p.node_id = $3 and p.payout_export and round(p.balance, 2) > 0 "
            "           order by customer_account_id "
            "        ) as agr where running_total <= $2 and index <= $4 "
            "    )"
            "   order by customer_account_id "
            "   returning 1"
            ")"
            "select count(*) from scheduled_payouts",
            payout_run_id,
            max_payout_sum,
            node.event_node_id,
            max_num_payouts,
        )
        payouts = await conn.fetch_many(Payout, "select * from payout_view where payout_run_id = $1", payout_run_id)
        csv_content = dump_payout_run_as_csv(payouts, event_settings.sepa_config, event_settings.currency_identifier)
        await conn.execute("update payout_run set csv = $1 where id = $2", csv_content, payout_run_id)

        return await fetch_payout_run_with_stats(conn=conn, node=node, payout_run_id=payout_run_id)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_payout_run(self, *, conn: Connection, node: Node, payout_run_id: int) -> PayoutRunWithStats:
        return await fetch_payout_run_with_stats(conn=conn, node=node, payout_run_id=payout_run_id)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def list_payout_runs(self, *, conn: Connection, node: Node) -> list[PayoutRunWithStats]:
        return await conn.fetch_many(
            PayoutRunWithStats,
            "select "
            "   id, created_by, created_at, node_id, done, revoked, sepa_xml is not null as sepa_was_generated, "
            "   total_donation_amount, total_payout_amount, n_payouts, set_done_by, set_done_at "
            "from payout_run_with_stats "
            "where node_id = $1 "
            "order by created_at desc",
            node.id,
        )

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management, Privilege.customer_management])
    async def prevent_customer_payout(self, *, conn: Connection, node: Node, customer_id: int):
        customer = await fetch_customer(conn=conn, node=node, customer_id=customer_id)
        if customer.payout is not None:
            raise InvalidArgument("Customer is already included in a payout")
        customer_info_exists = await conn.fetchval(
            "select exists(select from customer_info where customer_account_id = $1)", customer.id
        )
        if customer_info_exists:
            await conn.execute(
                "update customer_info set payout_export = false where customer_account_id = $1", customer.id
            )
        else:
            await conn.execute(
                "insert into customer_info (customer_account_id, payout_export) values ($1, false)", customer.id
            )

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.payout_management, Privilege.customer_management])
    async def allow_customer_payout(self, *, conn: Connection, node: Node, customer_id: int):
        customer = await fetch_customer(conn=conn, node=node, customer_id=customer_id)
        if customer.payout is not None:
            raise InvalidArgument("Customer is already included in a payout")
        await conn.execute("update customer_info set payout_export = true where customer_account_id = $1", customer.id)
