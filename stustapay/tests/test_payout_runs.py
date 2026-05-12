# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,disable=protected-access,redefined-outer-name
import copy
import csv
import datetime
import secrets
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from io import StringIO

import pytest
from sftkit.database import Connection
from sftkit.error import AccessDenied, InvalidArgument, NotFound

from stustapay.core.schema.config import SEPAConfig
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.payout import NewPayoutRun, PayoutRunWithStats
from stustapay.core.schema.tree import ROOT_NODE_ID, NewEvent, Node, RestrictedEventSettings
from stustapay.core.schema.user import NewUser, NewUserRole, NewUserToRoles, Privilege, format_user_tag_uid
from stustapay.core.schema.user_tag import NewUserTag
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.customer.payout import Payout, dump_payout_run_as_sepa_xml
from stustapay.core.service.mail import MailService
from stustapay.core.service.tree.service import create_event
from stustapay.core.service.user import UserService
from stustapay.core.service.user_tag import create_user_tags, get_or_assign_user_tag
from stustapay.tests.conftest import CreateRandomUserTag


@dataclass
class CustomerTestInfo:
    id: int
    uid: int
    pin: str
    balance: float
    iban: str
    account_name: str
    email: str
    donation: float
    payout_export: bool
    donation_all: bool
    has_entered_info: bool


@pytest.fixture
async def customers(
    db_connection: Connection, event_node: Node, create_random_user_tag: CreateRandomUserTag
) -> list[CustomerTestInfo]:
    n_customers = 10
    customers = []
    for i in range(n_customers):
        balance = 10.321 * i + 0.0012
        iban = "DE89370400440532013000"
        account_name = f"Rolf{i}"
        email = "rolf@lol.de"
        donation = balance if i == n_customers - 1 else 1.0 * i
        payout_export = True
        donation_all = False
        has_entered_info = True
        tag = await create_random_user_tag()
        await get_or_assign_user_tag(conn=db_connection, node=event_node, uid=tag.uid, pin=tag.pin)
        account_id = await db_connection.fetchval(
            "insert into account (node_id, user_tag_id, balance, type) "
            "overriding system value values ($1, $2, $3, $4) returning id",
            event_node.id,
            tag.id,
            balance,
            "private",
        )

        await db_connection.execute(
            "update customer_info set iban = $2, account_name = $3, email = $4, donation = $5, payout_export = $6, donate_all = $7, has_entered_info = $8 "
            "where customer_account_id = $1",
            account_id,
            iban,
            account_name,
            email,
            donation,
            payout_export,
            donation_all,
            has_entered_info,
        )
        customers.append(
            CustomerTestInfo(
                id=account_id,
                uid=tag.uid,
                pin=tag.pin,
                donation=donation,
                balance=balance,
                iban=iban,
                email=email,
                account_name=account_name,
                payout_export=payout_export,
                donation_all=donation_all,
                has_entered_info=has_entered_info,
            )
        )
    return customers


def filter_zero_payout(customers: list[CustomerTestInfo]) -> list[CustomerTestInfo]:
    return [c for c in customers if round(c.balance - c.donation, 2) > 0 or c.donation_all]


def _xml_text_at_node(tree: ET.Element | ET.ElementTree, path: str) -> str:
    node = tree.find(path)
    assert node is not None
    assert node.text is not None
    return node.text


def check_sepa_xml(xml_file_content: str, customers: list[CustomerTestInfo], sepa_config: SEPAConfig):
    tree: ET.Element = ET.fromstring(xml_file_content)
    p = "{urn:iso:std:iso:20022:tech:xsd:pain.001.001.03}"
    assert all([round(c.balance - c.donation, 2) > 0 for c in customers])

    group_sum = float(_xml_text_at_node(tree, f"{p}CstmrCdtTrfInitn/{p}GrpHdr/{p}CtrlSum"))
    total_sum = float(_xml_text_at_node(tree, f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CtrlSum"))

    assert group_sum == total_sum

    sepa_transfers = tree.findall(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf")
    assert len(sepa_transfers) == len(customers)

    sum_of_individual_payments = 0.0
    for sepa_transfer in sepa_transfers:
        account_name = _xml_text_at_node(sepa_transfer, f"{p}Cdtr/{p}Nm")
        customers_with_name = [c for c in customers if c.account_name == account_name]
        assert len(customers_with_name) == 1, (
            f"A customer with the account name {account_name} should not be part of a payout run"
        )
        customer = customers_with_name[0]

        assert float(_xml_text_at_node(sepa_transfer, f"{p}Amt/{p}InstdAmt")) == round(
            customer.balance - customer.donation, 2
        )
        sum_of_individual_payments += round(customer.balance - customer.donation, 2)

        # check iban
        assert _xml_text_at_node(sepa_transfer, f"{p}CdtrAcct/{p}Id/{p}IBAN") == customer.iban

        # check description
        assert _xml_text_at_node(sepa_transfer, f"{p}RmtInf/{p}Ustrd") == sepa_config.description.format(
            user_tag_uid=format_user_tag_uid(customer.uid)
        )

    assert sum_of_individual_payments == pytest.approx(group_sum)


async def create_event_role_token(
    *,
    privileges: list[Privilege],
    user_service: UserService,
    global_admin_token: str,
    event_node: Node,
) -> str:
    role = await user_service.create_user_role(
        token=global_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"payout-role-{'-'.join(privilege.value for privilege in privileges) or 'none'}-{secrets.token_hex(8)}",
            is_privileged=False,
            privileges=privileges,
        ),
    )
    password = "rolf"
    user = await user_service.create_user(
        token=global_admin_token,
        node_id=event_node.id,
        new_user=NewUser(
            login=f"payout-user-{secrets.token_hex(8)}",
            description="",
            display_name="Payout Tester",
        ),
        password=password,
    )
    await user_service.update_user_to_roles(
        token=global_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=user.id, role_ids=[role.id]),
    )
    result = await user_service.login_user(username=user.login, password=password)
    assert result.success is not None
    return result.success.token


async def _create_other_payout_event(conn: Connection) -> Node:
    suffix = secrets.token_hex(8)
    return await create_event(
        conn=conn,
        parent_id=ROOT_NODE_ID,
        event=NewEvent(
            name=f"other-payout-event-{suffix}",
            description="",
            customer_portal_url=f"http://other-payout-event-{suffix}.test",
            customer_portal_contact_email="test@test.support.test.com",
            customer_portal_about_page_url="",
            customer_portal_data_privacy_url="",
            currency_identifier="EUR",
            sepa_enabled=True,
            sepa_sender_name="Other Event",
            sepa_description="other payout {user_tag_uid}",
            sepa_sender_iban="DE89370400440532013000",
            sepa_allowed_country_codes=["DE"],
            bon_title="",
            bon_issuer="",
            bon_address="",
            max_account_balance=150,
            sumup_topup_enabled=False,
            sumup_payment_enabled=False,
            sumup_affiliate_key="",
            sumup_api_key="",
            sumup_merchant_code="",
            ust_id="",
            email_enabled=False,
            email_default_sender=None,
            email_smtp_host=None,
            email_smtp_port=None,
            email_smtp_username=None,
            email_smtp_password=None,
            payout_done_subject="",
            payout_done_message="",
            payout_registered_subject="",
            payout_registered_message="",
            payout_sender=None,
            pretix_presale_enabled=False,
            pretix_api_key=None,
            pretix_event=None,
            pretix_organizer=None,
            pretix_shop_url=None,
            pretix_ticket_ids=None,
        ),
    )


async def _create_payout_customer(
    conn: Connection, event_node: Node, create_random_user_tag: CreateRandomUserTag
) -> int:
    tag = await create_random_user_tag()
    secret_id = await conn.fetchval(
        "insert into user_tag_secret (node_id, key0, key1) values "
        "($1, decode('000102030405060708090a0b0c0d0e0f', 'hex'), decode('000102030405060708090a0b0c0d0e0f', 'hex')) "
        "returning id",
        event_node.id,
    )
    await create_user_tags(
        conn=conn,
        node_id=event_node.id,
        tags=[NewUserTag(uid=tag.uid, pin=tag.pin, secret_id=secret_id)],
    )
    user_tag_id = await conn.fetchval("select id from user_tag where node_id = $1 and uid = $2", event_node.id, tag.uid)
    account_id = await conn.fetchval(
        "insert into account (node_id, user_tag_id, balance, type) values ($1, $2, $3, 'private') returning id",
        event_node.id,
        user_tag_id,
        42,
    )
    await conn.execute(
        "update customer_info set iban = $2, account_name = $3, email = $4, donation = 0, payout_export = true, "
        "donate_all = false, has_entered_info = true where customer_account_id = $1",
        account_id,
        "DE89370400440532013000",
        "Other Event Customer",
        "other@example.test",
    )
    return account_id


async def test_create_payout_run(
    db_connection: Connection,
    event_admin_token: str,
    event_node: Node,
    customers: list[CustomerTestInfo],
    customer_service: CustomerService,
    event: RestrictedEventSettings,
):
    assert event.sepa_config is not None
    customers = filter_zero_payout(customers)
    customer_ids = [c.id for c in customers]
    ids_not_to_transfer = [customer.id for customer in customers[:2]]
    customers_to_transfer = list(filter(lambda c: c.id not in ids_not_to_transfer, customers))

    await db_connection.execute(
        "update customer_info c set payout_export = false "
        "from account_with_history a "
        "where a.id = c.customer_account_id and a.id = any($1) and node_id = any($2)",
        ids_not_to_transfer,
        event_node.ids_to_event_node,
    )

    payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=10, max_payout_sum=10000),
    )

    xml_content = await customer_service.payout.get_payout_run_sepa_xml(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
        execution_date=datetime.date.today(),
    )
    check_sepa_xml(xml_content, customers_to_transfer, event.sepa_config)

    updated_customers = await db_connection.fetch_many(
        Customer, "select * from customer where id = any($1)", customer_ids
    )
    for customer in updated_customers:
        if customer.id in ids_not_to_transfer:
            assert customer.payout is None
        else:
            assert customer.payout is not None
            assert customer.payout.payout_run_id == payout_run.id

    # now set them to payout_export = true and run again
    await db_connection.execute(
        "update customer_info c set payout_export = true "
        "from account_with_history a "
        "where a.id = c.customer_account_id and a.id = any($1) and node_id = any($2)",
        ids_not_to_transfer,
        event_node.ids_to_event_node,
    )

    payout_run2: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=10, max_payout_sum=10000),
    )

    assert payout_run2.n_payouts == len(ids_not_to_transfer)
    xml_content = await customer_service.payout.get_payout_run_sepa_xml(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=payout_run2.id,
        execution_date=datetime.date.today(),
    )
    check_sepa_xml(xml_content, [c for c in customers if c.id in ids_not_to_transfer], event.sepa_config)


async def test_sepa_xml_generation_rejects_foreign_event_payout_run(
    db_connection: Connection,
    event_admin_token: str,
    event_node: Node,
    customer_service: CustomerService,
    global_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
):
    other_event = await _create_other_payout_event(db_connection)
    await _create_payout_customer(db_connection, other_event, create_random_user_tag)
    foreign_payout_run = await customer_service.payout.create_payout_run(
        token=global_admin_token,
        node_id=other_event.id,
        new_payout_run=NewPayoutRun(max_num_payouts=10, max_payout_sum=10000),
    )

    with pytest.raises(NotFound):
        await customer_service.payout.get_payout_run_sepa_xml(
            token=event_admin_token,
            node_id=event_node.id,
            payout_run_id=foreign_payout_run.id,
            execution_date=datetime.date.today(),
        )

    assert (
        await db_connection.fetchval("select sepa_xml from payout_run where id = $1", foreign_payout_run.id)
    ) is None


async def test_max_payout_sum(
    customers: list[CustomerTestInfo],
    event_node: Node,
    event: RestrictedEventSettings,
    event_admin_token: str,
    customer_service: CustomerService,
):
    assert event.sepa_config is not None
    num = 5
    customers_to_transfer = filter_zero_payout(customers)[:num]
    s = sum(customer.balance - customer.donation for customer in customers_to_transfer) + 1

    payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=10, max_payout_sum=s),
    )

    xml_content = await customer_service.payout.get_payout_run_sepa_xml(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
        execution_date=datetime.date.today(),
    )
    check_sepa_xml(xml_content, customers_to_transfer, event.sepa_config)


async def test_max_num_payouts(
    customers: list[CustomerTestInfo],
    event_node: Node,
    event: RestrictedEventSettings,
    event_admin_token: str,
    customer_service: CustomerService,
):
    assert event.sepa_config is not None
    num = 5
    customers_to_transfer = filter_zero_payout(customers)[:num]

    payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=num, max_payout_sum=15000),
    )

    xml_content = await customer_service.payout.get_payout_run_sepa_xml(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
        execution_date=datetime.date.today(),
    )
    check_sepa_xml(xml_content, customers_to_transfer, event.sepa_config)


async def test_revoke_payout(
    event_node: Node,
    customers: list[CustomerTestInfo],
    event_admin_token: str,
    customer_service: CustomerService,
    mail_service: MailService,
):
    expected_num_payouts = len([customer for customer in customers if round(customer.balance, 2) > 0])
    payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
    )
    await customer_service.payout.revoke_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
    )
    payouts = await customer_service.payout.get_payout_run_payouts(
        token=event_admin_token, node_id=event_node.id, payout_run_id=payout_run.id
    )
    assert len(payouts) == 0
    payout_run = await customer_service.payout.get_payout_run(
        token=event_admin_token, node_id=event_node.id, payout_run_id=payout_run.id
    )
    assert payout_run.revoked
    assert not payout_run.done
    assert payout_run.n_payouts == 0
    assert payout_run.total_payout_amount == pytest.approx(0)
    assert payout_run.total_donation_amount == pytest.approx(0)

    payout_run_after_revoke: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
    )
    assert payout_run_after_revoke.n_payouts == expected_num_payouts

    with pytest.raises(InvalidArgument):
        await customer_service.payout.set_payout_run_as_done(
            token=event_admin_token,
            node_id=event_node.id,
            payout_run_id=payout_run.id,
            mail_service=mail_service,
        )


async def test_set_payout_to_done(
    db_connection: Connection,
    customers: list[CustomerTestInfo],
    event_node: Node,
    event_admin_token: str,
    customer_service: CustomerService,
    mail_service: MailService,
):
    await db_connection.execute("delete from mails")
    await db_connection.execute(
        "update event set email_enabled = true, email_default_sender = $2 where id = $1",
        event_node.id,
        "noreply@test.invalid",
    )

    created_payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
    )
    await customer_service.payout.set_payout_run_as_done(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=created_payout_run.id,
        mail_service=mail_service,
    )

    for customer in customers:
        balance = await db_connection.fetchval("select round(balance, 2) from account where id = $1", customer.id)
        assert balance == 0

    payout_run = await customer_service.payout.get_payout_run(
        token=event_admin_token, node_id=event_node.id, payout_run_id=created_payout_run.id
    )
    assert not payout_run.revoked
    assert payout_run.done

    updated_customers = await db_connection.fetch_many(
        Customer, "select * from customer where id = any($1)", [c.id for c in customers]
    )
    assert all(customer.payout is None for customer in updated_customers)

    mails = await db_connection.fetch(
        "select subject, text_message, html_message, to_addr, from_addr from mails order by id asc"
    )
    assert len(mails) == created_payout_run.n_payouts
    first_mail = mails[0]
    assert first_mail["subject"] == "[StuStaPay] Payout Completed"
    assert first_mail["to_addr"] == customers[0].email
    assert first_mail["from_addr"] == f"{event_node.name} Auszahlung <noreply@test.invalid>"
    assert "payout process has been completed" in first_mail["text_message"]
    assert first_mail["html_message"] is not None
    assert "<html" in first_mail["html_message"]
    assert "teamfestlichPay" in first_mail["html_message"]
    assert "#2AD2C9" in first_mail["html_message"]
    assert "payout process has been completed" in first_mail["html_message"]

    with pytest.raises(InvalidArgument):
        await customer_service.payout.revoke_payout_run(
            token=event_admin_token,
            node_id=event_node.id,
            payout_run_id=payout_run.id,
        )


async def test_customer_with_completed_payout_can_be_scheduled_again(
    db_connection: Connection,
    customers: list[CustomerTestInfo],
    event_node: Node,
    event_admin_token: str,
    customer_service: CustomerService,
    mail_service: MailService,
):
    first_payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
    )
    await customer_service.payout.set_payout_run_as_done(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=first_payout_run.id,
        mail_service=mail_service,
    )

    rescheduled_customers = customers[:3]
    for index, customer in enumerate(rescheduled_customers, start=1):
        await db_connection.execute("update account set balance = $2 where id = $1", customer.id, 20 + index)

    second_payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
    )

    second_run_payouts = await customer_service.payout.get_payout_run_payouts(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=second_payout_run.id,
    )

    assert second_payout_run.n_payouts == len(rescheduled_customers)
    assert {p.customer_account_id for p in second_run_payouts} == {customer.id for customer in rescheduled_customers}


async def test_csv_export(
    db_connection: Connection,
    event_node: Node,
    customers: list[CustomerTestInfo],
    event: RestrictedEventSettings,
    event_admin_token: str,
    customer_service: CustomerService,
):
    assert event.sepa_config is not None
    # csv contains zero payouts that have non zero donation!
    customers = [c for c in customers if round(c.balance, 2) > 0]
    payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=20, max_payout_sum=15000),
    )
    csv_content = await customer_service.payout.get_payout_run_csv(
        token=event_admin_token, node_id=event_node.id, payout_run_id=payout_run.id
    )

    export_sum = 0.0

    # read the csv back in
    csvfile = StringIO(csv_content)
    reader = csv.DictReader(csvfile)
    rows = list(reader)
    assert len(rows) == len(customers)

    for row in rows:
        matching_customers = [c for c in customers if format_user_tag_uid(c.uid) == row["uid"]]
        assert len(matching_customers) == 1
        customer = matching_customers[0]
        assert row["beneficiary_name"] == customer.account_name
        assert row["iban"] == customer.iban
        assert float(row["amount"]) == round(customer.balance - customer.donation, 2)
        assert row["currency"] == event.currency_identifier
        assert row["reference"] == event.sepa_config.description.format(user_tag_uid=format_user_tag_uid(customer.uid))
        assert row["email"] == customer.email
        assert row["uid"] == format_user_tag_uid(customer.uid)
        export_sum += float(row["amount"])

    sql_sum = float(
        await db_connection.fetchval(
            "select sum(round(amount, 2)) from payout where payout_run_id = $1", payout_run.id
        ),
    )
    assert sql_sum == pytest.approx(export_sum)


@pytest.mark.parametrize("privileges", [[Privilege.payout_management], [Privilege.node_administration]])
async def test_payout_run_permissions_allow_management_with_payout_or_node_admin(
    privileges: list[Privilege],
    event_node: Node,
    customers: list[CustomerTestInfo],
    event: RestrictedEventSettings,
    customer_service: CustomerService,
    mail_service: MailService,
    user_service: UserService,
    global_admin_token: str,
):
    assert event.sepa_config is not None

    token = await create_event_role_token(
        privileges=privileges,
        user_service=user_service,
        global_admin_token=global_admin_token,
        event_node=event_node,
    )

    payout_run = await customer_service.payout.create_payout_run(
        token=token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
    )

    listed_runs = await customer_service.payout.list_payout_runs(token=token, node_id=event_node.id)
    assert payout_run.id in [run.id for run in listed_runs]

    fetched_run = await customer_service.payout.get_payout_run(
        token=token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
    )
    assert fetched_run.id == payout_run.id

    csv_content = await customer_service.payout.get_payout_run_csv(
        token=token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
    )
    assert len(list(csv.DictReader(StringIO(csv_content)))) > 0

    sepa_content = await customer_service.payout.get_payout_run_sepa_xml(
        token=token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
        execution_date=datetime.date.today(),
    )
    check_sepa_xml(sepa_content, filter_zero_payout(customers), event.sepa_config)

    previous_sepa_content = await customer_service.payout.get_previous_payout_run_sepa_xml(
        token=token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
    )
    assert previous_sepa_content == sepa_content

    await customer_service.payout.set_payout_run_as_done(
        token=token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
        mail_service=mail_service,
    )

    done_run = await customer_service.payout.get_payout_run(
        token=token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
    )
    assert done_run.done


@pytest.mark.parametrize("privileges", [[Privilege.payout_management], [Privilege.node_administration]])
async def test_payout_run_permissions_allow_revoke_with_payout_or_node_admin(
    privileges: list[Privilege],
    event_node: Node,
    customers: list[CustomerTestInfo],
    customer_service: CustomerService,
    user_service: UserService,
    global_admin_token: str,
):
    del customers  # fixture populates payout data

    token = await create_event_role_token(
        privileges=privileges,
        user_service=user_service,
        global_admin_token=global_admin_token,
        event_node=event_node,
    )

    payout_run = await customer_service.payout.create_payout_run(
        token=token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
    )
    await customer_service.payout.revoke_payout_run(
        token=token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
    )

    revoked_run = await customer_service.payout.get_payout_run(
        token=token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
    )
    assert revoked_run.revoked


async def test_payout_run_permissions_deny_users_without_payout_privileges(
    event_node: Node,
    customers: list[CustomerTestInfo],
    customer_service: CustomerService,
    user_service: UserService,
    global_admin_token: str,
):
    del customers  # fixture populates payout data

    token = await create_event_role_token(
        privileges=[],
        user_service=user_service,
        global_admin_token=global_admin_token,
        event_node=event_node,
    )

    with pytest.raises(AccessDenied):
        await customer_service.payout.list_payout_runs(token=token, node_id=event_node.id)

    with pytest.raises(AccessDenied):
        await customer_service.payout.create_payout_run(
            token=token,
            node_id=event_node.id,
            new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
        )


async def test_sepa_export(
    customers: list[CustomerTestInfo],
    event: RestrictedEventSettings,
):
    customers = filter_zero_payout(customers)
    sepa_config = event.sepa_config
    assert sepa_config is not None
    execution_date = datetime.date.today()
    customers_bank_data = [
        Payout(
            id=i,
            payout_run_id=1,
            customer_account_id=c.id,
            account_name=c.account_name,
            user_tag_id=i,
            user_tag_uid=c.uid,
            amount=c.balance - c.donation,
            donation=c.donation,
            iban=c.iban,
            email=c.email,
        )
        for i, c in enumerate(customers)
        if round(c.balance - c.donation, 2) > 0
    ]

    test_sepa_config = copy.deepcopy(sepa_config)

    # allowed symbols
    test_sepa_config.description += "-.,:()/?'+"
    sepa_content = dump_payout_run_as_sepa_xml(
        payouts=customers_bank_data,
        sepa_config=test_sepa_config,
        currency_ident=event.currency_identifier,
        execution_date=execution_date,
    )
    check_sepa_xml(sepa_content, customers, test_sepa_config)

    # test invalid iban customer
    invalid_iban = "DE89370400440532013001"
    tmp_bank_data = copy.deepcopy(customers_bank_data)
    tmp_bank_data[0].iban = invalid_iban

    with pytest.raises(ValueError):
        dump_payout_run_as_sepa_xml(
            payouts=tmp_bank_data,
            sepa_config=sepa_config,
            currency_ident=event.currency_identifier,
            execution_date=datetime.date.today(),
        )

    # test invalid iban sender
    test_sepa_config = copy.deepcopy(sepa_config)
    test_sepa_config.sender_iban = invalid_iban
    with pytest.raises(ValueError):
        dump_payout_run_as_sepa_xml(
            payouts=customers_bank_data,
            sepa_config=test_sepa_config,
            currency_ident=event.currency_identifier,
            execution_date=datetime.date.today(),
        )

    # test invalid execution date
    with pytest.raises(ValueError):
        dump_payout_run_as_sepa_xml(
            payouts=customers_bank_data,
            sepa_config=sepa_config,
            currency_ident=event.currency_identifier,
            execution_date=datetime.date.today() - datetime.timedelta(days=1),
        )

    # test invalid amount
    tmp_bank_data = copy.deepcopy(customers_bank_data)
    tmp_bank_data[0].amount = -1
    with pytest.raises(ValueError):
        dump_payout_run_as_sepa_xml(
            payouts=tmp_bank_data,
            sepa_config=sepa_config,
            currency_ident=event.currency_identifier,
            execution_date=datetime.date.today(),
        )

    # test invalid description
    test_sepa_config = copy.deepcopy(sepa_config)
    test_sepa_config.description = "invalid {user_tag_uid}#%^;&*"
    with pytest.raises(ValueError):
        dump_payout_run_as_sepa_xml(
            payouts=customers_bank_data,
            sepa_config=test_sepa_config,
            currency_ident=event.currency_identifier,
            execution_date=datetime.date.today(),
        )
