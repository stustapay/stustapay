# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,disable=protected-access,redefined-outer-name
import copy
import csv
import datetime
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from io import StringIO

import pytest
from sftkit.database import Connection

from stustapay.core.schema.config import SEPAConfig
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.payout import NewPayoutRun, PayoutRunWithStats
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.schema.user import format_user_tag_uid
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.customer.customer import CustomerService
from stustapay.core.service.customer.payout import Payout, dump_payout_run_as_sepa_xml
from stustapay.core.service.mail import MailService
from stustapay.core.service.user_tag import get_or_assign_user_tag
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
        assert (
            len(customers_with_name) == 1
        ), f"A customer with the account name {account_name} should not be part of a payout run"
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
    del customers  # we just need the fixture to be setup to populate the database
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
    payout_run: PayoutRunWithStats = await customer_service.payout.create_payout_run(
        token=event_admin_token,
        node_id=event_node.id,
        new_payout_run=NewPayoutRun(max_num_payouts=15, max_payout_sum=15000),
    )
    await customer_service.payout.set_payout_run_as_done(
        token=event_admin_token,
        node_id=event_node.id,
        payout_run_id=payout_run.id,
        mail_service=mail_service,
    )

    for customer in customers:
        balance = await db_connection.fetchval("select round(balance, 2) from account where id = $1", customer.id)
        assert balance == 0

    payout_run = await customer_service.payout.get_payout_run(
        token=event_admin_token, node_id=event_node.id, payout_run_id=payout_run.id
    )
    assert not payout_run.revoked
    assert payout_run.done

    with pytest.raises(InvalidArgument):
        await customer_service.payout.revoke_payout_run(
            token=event_admin_token,
            node_id=event_node.id,
            payout_run_id=payout_run.id,
        )


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
