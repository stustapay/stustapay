# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,disable=protected-access,redefined-outer-name
import copy
import csv
import datetime
import os
import tempfile
import typing
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from io import StringIO
from pathlib import Path

import asyncpg
import pytest
from dateutil.parser import parse

from stustapay.core.config import Config
from stustapay.core.customer_bank_export import (
    CSV_PATH,
    SEPA_PATH,
    export_customer_payouts,
)
from stustapay.core.schema.config import SEPAConfig
from stustapay.core.schema.customer import Customer, OrderWithBon
from stustapay.core.schema.order import Order, OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.tax_rate import TaxRate
from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.schema.user import format_user_tag_uid
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.error import (
    AccessDenied,
    InvalidArgument,
    Unauthorized,
)
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import CustomerBank, CustomerService
from stustapay.core.service.customer.payout import (
    Payout,
    create_payout_run,
    dump_payout_run_as_csv,
    dump_payout_run_as_sepa_xml,
    get_customer_bank_data,
    get_number_of_payouts,
)
from stustapay.core.service.order.booking import NewLineItem, book_order
from stustapay.core.service.order.order import fetch_order
from stustapay.core.service.product import ProductService
from stustapay.core.service.user_tag import get_or_assign_user_tag
from stustapay.framework.database import Connection
from stustapay.tests.conftest import Cashier, CreateRandomUserTag


@dataclass
class CustomerTest:
    account_id: int
    uid: int
    pin: str
    balance: float


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


@pytest.fixture
def tmp_dir() -> typing.Generator[Path, None, None]:
    tmp_dir_obj = tempfile.TemporaryDirectory()
    yield Path(tmp_dir_obj.name)
    tmp_dir_obj.cleanup()


@pytest.fixture
async def customer_service(
    setup_test_db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService
) -> CustomerService:
    return CustomerService(
        db_pool=setup_test_db_pool, config=config, auth_service=auth_service, config_service=config_service
    )


@pytest.fixture
async def test_customer(
    db_connection: Connection, event_node: Node, create_random_user_tag: CreateRandomUserTag
) -> CustomerTest:
    balance = 120
    tag = await create_random_user_tag()

    account_id = await db_connection.fetchval(
        "insert into account (node_id, user_tag_id, balance, type) values ($1, $2, $3, $4) returning id",
        event_node.id,
        tag.id,
        balance,
        "private",
    )

    return CustomerTest(account_id=account_id, pin=tag.pin, uid=tag.uid, balance=120)


@pytest.fixture
async def order_with_bon(
    db_connection: Connection,
    product_service: ProductService,
    test_customer: CustomerTest,
    event_node: Node,
    event_admin_token: str,
    tax_rate_ust: TaxRate,
    tax_rate_none: TaxRate,
    cashier: Cashier,
    till: Till,
) -> tuple[Order, CustomerTest]:
    product1: Product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Bier",
            price=5.0,
            tax_rate_id=tax_rate_ust.id,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
            fixed_price=True,
        ),
    )
    product2: Product = await product_service.create_product(
        token=event_admin_token,
        node_id=event_node.id,
        product=NewProduct(
            name="Pfand",
            price=2.0,
            tax_rate_id=tax_rate_none.id,
            restrictions=[],
            is_locked=True,
            is_returnable=False,
            fixed_price=True,
        ),
    )

    line_items = [
        NewLineItem(
            quantity=1,
            product_id=product1.id,
            product_price=product1.price,
            tax_rate_id=product1.tax_rate_id,
        ),
        NewLineItem(
            quantity=1,
            product_id=product2.id,
            product_price=product2.price,
            tax_rate_id=product2.tax_rate_id,
        ),
    ]

    booking = await book_order(
        conn=db_connection,
        order_type=OrderType.sale,
        payment_method=PaymentMethod.tag,
        cashier_id=cashier.id,
        till_id=till.id,
        line_items=line_items,
        bookings={},
        customer_account_id=test_customer.account_id,
    )

    order = await fetch_order(conn=db_connection, order_id=booking.id)
    assert order is not None

    await db_connection.execute(
        "insert into bon (id, generated, generated_at, mime_type, content) overriding system value values ($1, $2, $3, $4, $5)",
        order.id,
        True,
        parse("2023-01-01 15:35:02 UTC+1"),
        "application/pdf",
        b"asdf1234",  # this is obviously not a valid pdf but that's fine for a test
    )
    return order, test_customer


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
            "insert into customer_info (customer_account_id, iban, account_name, email, donation, payout_export) "
            "values ($1, $2, $3, $4, $5, $6)",
            account_id,
            iban,
            account_name,
            email,
            donation,
            payout_export,
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
            )
        )
    return customers


@pytest.fixture
async def customers_to_transfer(customers: list[CustomerTestInfo]) -> list[CustomerTestInfo]:
    # first customer with uid 12345 should not be included as he has a balance of 0
    # last customer has same amount of donation as balance, thus should also not be included
    return customers[1:-1]


@typing.no_type_check  # mypy is not happy with the whole tree.find().text since the actual return is Optional
def check_sepa_xml(xml_file, customers, sepa_config: SEPAConfig):
    tree = ET.parse(xml_file)
    p = "{urn:iso:std:iso:20022:tech:xsd:pain.001.001.03}"

    group_sum = float(tree.find(f"{p}CstmrCdtTrfInitn/{p}GrpHdr/{p}CtrlSum").text)

    total_sum = float(tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CtrlSum").text)

    assert group_sum == total_sum

    l = tree.findall(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf")
    assert len(l) == len(customers)

    total_sum = 0
    for i, customer in enumerate(customers):
        # check amount
        assert float(
            tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i + 1}]/{p}Amt/{p}InstdAmt").text
        ) == round(customer.balance - customer.donation, 2)
        total_sum += round(customer.balance - customer.donation, 2)

        # check iban
        assert (
            tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i + 1}]/{p}CdtrAcct/{p}Id/{p}IBAN").text
            == customer.iban
        )

        # check name
        assert (
            tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i + 1}]/{p}Cdtr/{p}Nm").text
            == customer.account_name
        )

        # check description
        assert tree.find(
            f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i + 1}]/{p}RmtInf/{p}Ustrd"
        ).text == sepa_config.description.format(user_tag_uid=format_user_tag_uid(customer.uid))

    assert total_sum == group_sum


async def test_payout_runs(
    tmp_dir: Path,
    db_connection: Connection,
    event_node: Node,
    config: Config,
    customers_to_transfer: list[CustomerTestInfo],
    event: RestrictedEventSettings,
):
    output_path = tmp_dir / "test_payout_runs"
    output_path.mkdir(parents=True, exist_ok=True)
    os.makedirs(output_path, exist_ok=True)

    ids_not_to_transfer = [customer.id for customer in customers_to_transfer[:2]]

    await db_connection.execute(
        "update customer_info c set payout_export = false "
        "from account_with_history a "
        "where a.id = c.customer_account_id and a.id in ($1, $2) and node_id = any($3)",
        *ids_not_to_transfer,
        event_node.ids_to_event_node,
    )

    payout_run_id = await export_customer_payouts(
        config=config,
        created_by="test",
        event_node_id=event_node.id,
        dry_run=False,
        output_path=output_path,
    )

    csv_path = os.path.join(output_path, CSV_PATH.format(payout_run_id))
    sepa_path = os.path.join(output_path, SEPA_PATH.format(payout_run_id, 1))
    assert os.path.exists(csv_path)
    assert os.path.exists(sepa_path)
    check_sepa_xml(sepa_path, customers_to_transfer[2:], event.sepa_config)

    customers = await db_connection.fetch_many(
        Customer, "select * from customer where node_id = any($1)", event_node.ids_to_event_node
    )
    ids_to_transfer = [customer.id for customer in customers_to_transfer[2:]]
    for customer in customers:
        if customer.id in ids_to_transfer:
            assert customer.payout_run_id == payout_run_id
        else:
            assert customer.payout_run_id is None

    # now set them to payout_export = true and run again
    await db_connection.execute(
        "update customer_info c set payout_export = true "
        "from account_with_history a "
        "where a.id = c.customer_account_id and a.id in ($1, $2) and node_id = any($3)",
        *ids_not_to_transfer,
        event_node.ids_to_event_node,
    )

    # but set customer 1 to an error
    await db_connection.execute(
        "update customer_info c set payout_error = 'some error' "
        "from account_with_history a "
        "where a.id = c.customer_account_id and a.id = $1 and node_id = any($2)",
        customers_to_transfer[0].id,
        event_node.ids_to_event_node,
    )

    payout_run_id_2 = await export_customer_payouts(
        config=config,
        created_by="test",
        dry_run=False,
        event_node_id=event_node.id,
        output_path=output_path,
    )
    sepa_path = os.path.join(output_path, SEPA_PATH.format(payout_run_id_2, 1))
    os.path.exists(os.path.join(output_path, CSV_PATH.format(payout_run_id_2)))
    os.path.exists(sepa_path)
    check_sepa_xml(sepa_path, customers_to_transfer[1:2], event.sepa_config)

    n_customers = await db_connection.fetchval(
        "select count(*) from customer where node_id = any($1) and payout_run_id = $2",
        event_node.ids_to_event_node,
        payout_run_id_2,
    )
    assert n_customers == 1


async def test_max_payout_sum(
    tmp_dir: Path,
    customers_to_transfer: list[CustomerTestInfo],
    config: Config,
    event_node: Node,
    event: RestrictedEventSettings,
):
    output_path = tmp_dir / "test_max_payout_sum"
    output_path.mkdir(parents=True, exist_ok=True)

    num = 2
    s = sum(customer.balance - customer.donation for customer in customers_to_transfer[:num])

    payout_run_id = await export_customer_payouts(
        config=config,
        created_by="test",
        event_node_id=event_node.id,
        dry_run=False,
        output_path=output_path,
        max_payout_sum=s,
    )

    sepa_path = os.path.join(output_path, SEPA_PATH.format(payout_run_id, 1))
    assert os.path.exists(os.path.join(output_path, CSV_PATH.format(payout_run_id)))
    assert os.path.exists(sepa_path)
    check_sepa_xml(
        sepa_path,
        customers_to_transfer[0:num],
        event.sepa_config,
    )


async def test_zero_payouts(
    tmp_dir: Path,
    customers_to_transfer: list[CustomerTestInfo],
    config: Config,
    event_node: Node,
):
    output_path = tmp_dir / "test_max_payout_sum"
    output_path.mkdir(parents=True, exist_ok=True)

    num = 1
    s = sum(customer.balance - customer.donation for customer in customers_to_transfer[:num])
    with pytest.raises(InvalidArgument):
        _ = await export_customer_payouts(
            config=config,
            created_by="test",
            event_node_id=event_node.id,
            dry_run=False,
            output_path=output_path,
            max_payout_sum=s - 1,
        )


async def test_export_customer_bank_data(
    tmp_dir: Path,
    customer_service: CustomerService,
    db_connection: Connection,
    config: Config,
    customers_to_transfer: list[CustomerTestInfo],
    event_node: Node,
    event: RestrictedEventSettings,
):
    output_path = tmp_dir / "test_export"
    output_path.mkdir(parents=True, exist_ok=True)

    payout_run_id = await export_customer_payouts(
        config=config,
        event_node_id=event_node.id,
        created_by="test",
        dry_run=True,
        output_path=output_path,
    )
    csv_path = os.path.join(output_path, CSV_PATH.format(payout_run_id))
    sepa_path = os.path.join(output_path, SEPA_PATH.format(payout_run_id, 1))
    assert os.path.exists(csv_path)
    assert os.path.exists(sepa_path)
    check_sepa_xml(sepa_path, customers_to_transfer, event.sepa_config)

    # check if dry run successful and no database entry created
    assert await get_number_of_payouts(db_connection, event_node_id=event_node.id, payout_run_id=1) == 0

    output_path = tmp_dir / "test_export2"
    output_path.mkdir(parents=True, exist_ok=True)

    # test several batches
    payout_run_id_2 = await export_customer_payouts(
        config=config,
        created_by="Test",
        event_node_id=event_node.id,
        dry_run=True,
        max_transactions_per_batch=1,
        output_path=output_path,
    )
    csv_path = os.path.join(output_path, CSV_PATH.format(payout_run_id_2))
    assert os.path.exists(csv_path)
    for i in range(len(customers_to_transfer)):
        sepa_path = os.path.join(output_path, SEPA_PATH.format(payout_run_id_2, i + 1))
        assert os.path.exists(sepa_path)
        check_sepa_xml(
            sepa_path,
            customers_to_transfer[i : i + 1],
            event.sepa_config,
        )

    # test non dry run
    output_path = tmp_dir / "test_export3"
    output_path.mkdir(parents=True, exist_ok=True)
    payout_run_id_3 = await export_customer_payouts(
        config=config,
        created_by="Test",
        event_node_id=event_node.id,
        dry_run=False,
        output_path=output_path,
    )
    csv_path = os.path.join(output_path, CSV_PATH.format(payout_run_id_3))
    sepa_path = os.path.join(output_path, SEPA_PATH.format(payout_run_id_3, 1))
    assert os.path.exists(csv_path)
    assert os.path.exists(sepa_path)
    check_sepa_xml(sepa_path, customers_to_transfer, event.sepa_config)

    # check that all customers in self.customers_to_transfer have payout_run_id set to 1 and rest null
    customers = await db_connection.fetch_many(
        Customer, "select * from customer where node_id = any($1)", event_node.ids_to_event_node
    )
    ids_to_transfer = [customer.id for customer in customers_to_transfer]
    for customer in customers:
        if customer.id in ids_to_transfer:
            assert customer.payout_run_id == payout_run_id_3
        else:
            assert customer.payout_run_id is None

    # test customer "Rolf1" can no longer be updated since they now have a payout run assigned
    auth = await customer_service.login_customer(pin=customers_to_transfer[0].pin)
    assert auth is not None
    customer_bank = CustomerBank(
        iban="DE89370400440532013000", account_name="Rolf1 updated", email="lol@rolf.de", donation=2.0
    )
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
        )

    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info_donate_all(
            token=auth.token,
        )


async def test_get_number_of_payouts(
    db_connection: Connection, event_node: Node, customers_to_transfer: list[CustomerTestInfo]
):
    result = await get_number_of_payouts(db_connection, event_node_id=event_node.id)
    assert result == len(customers_to_transfer)


async def test_get_customer_bank_data(
    db_connection: Connection, customers_to_transfer: list[CustomerTestInfo], event_node: Node
):
    def check_data(result: list[Payout], leng: int, ith: int = 0) -> None:
        assert len(result) == leng
        for result_customer, customer in zip(result, customers_to_transfer[ith * leng : (ith + 1) * leng]):
            assert result_customer.iban == customer.iban
            assert result_customer.account_name == customer.account_name
            assert result_customer.email == customer.email
            assert result_customer.balance == customer.balance - customer.donation

    # create payout run
    payout_run_id, number_of_payouts = await create_payout_run(
        db_connection, event_node_id=event_node.id, created_by="Test", max_payout_sum=50000.0
    )
    assert number_of_payouts == len(customers_to_transfer)

    assert number_of_payouts == await db_connection.fetchval(
        "select count(*) from payout where payout_run_id = $1 and node_id = any($2)",
        payout_run_id,
        event_node.ids_to_event_node,
    )

    result = await get_customer_bank_data(db_connection, payout_run_id)
    check_data(result, len(customers_to_transfer))


async def test_csv_export(
    db_connection: Connection,
    event_node: Node,
    customers_to_transfer: list[CustomerTestInfo],
    event: RestrictedEventSettings,
):
    sepa_config = event.sepa_config
    assert sepa_config is not None
    payout_run_id, number_of_payouts = await create_payout_run(
        db_connection, event_node_id=event_node.id, created_by="Test", max_payout_sum=50000.0
    )
    assert number_of_payouts == len(customers_to_transfer)

    customers_bank_data = await get_customer_bank_data(db_connection, payout_run_id)

    csv_batches = list(
        dump_payout_run_as_csv(
            customers_bank_data=customers_bank_data,
            sepa_config=sepa_config,
            currency_ident=event.currency_identifier,
        )
    )

    export_sum = 0.0

    # read the csv back in
    csvfile = StringIO(csv_batches[0])
    reader = csv.DictReader(csvfile)
    rows = list(reader)
    assert len(rows) == len(customers_to_transfer)

    for row, customer in zip(rows, customers_to_transfer):
        assert row["beneficiary_name"] == customer.account_name
        assert row["iban"] == customer.iban
        assert float(row["amount"]) == round(customer.balance - customer.donation, 2)
        assert row["currency"] == event.currency_identifier
        assert row["reference"] == sepa_config.description.format(user_tag_uid=format_user_tag_uid(customer.uid))
        assert row["email"] == customer.email
        assert row["uid"] == format_user_tag_uid(customer.uid)
        export_sum += float(row["amount"])

    sql_sum = float(
        await db_connection.fetchval(
            "select sum(round(balance, 2)) from payout where node_id = any($1)", event_node.ids_to_event_node
        ),
    )
    assert sql_sum == export_sum


async def test_sepa_export(
    db_connection: Connection,
    event_node: Node,
    customers_to_transfer: list[CustomerTestInfo],
    event: RestrictedEventSettings,
):
    sepa_config = event.sepa_config
    assert sepa_config is not None
    execution_date = datetime.date.today()
    payout_run_id, number_of_payouts = await create_payout_run(
        db_connection, event_node_id=event_node.id, created_by="Test", max_payout_sum=50000.0
    )
    assert number_of_payouts == len(customers_to_transfer)
    customers_bank_data = await get_customer_bank_data(db_connection, payout_run_id)

    test_sepa_config = copy.deepcopy(sepa_config)

    # allowed symbols
    test_sepa_config.description += "-.,:()/?'+"
    sepa_batches = list(
        dump_payout_run_as_sepa_xml(
            customers_bank_data=customers_bank_data,
            sepa_config=test_sepa_config,
            currency_ident=event.currency_identifier,
            execution_date=execution_date,
        )
    )
    xml_file = StringIO(sepa_batches[0])
    check_sepa_xml(xml_file, customers_to_transfer, test_sepa_config)

    # test invalid iban customer
    invalid_iban = "DE89370400440532013001"
    tmp_bank_data = copy.deepcopy(customers_bank_data)
    tmp_bank_data[0].iban = invalid_iban

    with pytest.raises(ValueError):
        list(
            dump_payout_run_as_sepa_xml(
                customers_bank_data=tmp_bank_data,
                sepa_config=sepa_config,
                currency_ident=event.currency_identifier,
                execution_date=datetime.date.today(),
            )
        )

    # test invalid iban sender
    test_sepa_config = copy.deepcopy(sepa_config)
    test_sepa_config.sender_iban = invalid_iban
    with pytest.raises(ValueError):
        list(
            dump_payout_run_as_sepa_xml(
                customers_bank_data=customers_bank_data,
                sepa_config=test_sepa_config,
                currency_ident=event.currency_identifier,
                execution_date=datetime.date.today(),
            )
        )

    # test invalid execution date
    with pytest.raises(ValueError):
        list(
            dump_payout_run_as_sepa_xml(
                customers_bank_data=customers_bank_data,
                sepa_config=sepa_config,
                currency_ident=event.currency_identifier,
                execution_date=datetime.date.today() - datetime.timedelta(days=1),
            )
        )

    # test invalid amount
    tmp_bank_data = copy.deepcopy(customers_bank_data)
    tmp_bank_data[0].balance = -1
    with pytest.raises(ValueError):
        list(
            dump_payout_run_as_sepa_xml(
                customers_bank_data=tmp_bank_data,
                sepa_config=sepa_config,
                currency_ident=event.currency_identifier,
                execution_date=datetime.date.today(),
            )
        )

    # test invalid description
    test_sepa_config = copy.deepcopy(sepa_config)
    test_sepa_config.description = "invalid {user_tag_uid}#%^;&*"
    with pytest.raises(ValueError):
        list(
            dump_payout_run_as_sepa_xml(
                customers_bank_data=customers_bank_data,
                sepa_config=test_sepa_config,
                currency_ident=event.currency_identifier,
                execution_date=datetime.date.today(),
            )
        )


async def test_auth_customer(customer_service: CustomerService, test_customer: CustomerTest):
    auth = await customer_service.login_customer(pin=test_customer.pin)
    assert auth is not None
    assert auth.customer.id == test_customer.account_id
    assert auth.customer.balance == test_customer.balance

    # test get_customer with correct token
    result = await customer_service.get_customer(token=auth.token)
    assert result is not None
    assert result.id == test_customer.account_id
    assert result.balance == test_customer.balance

    # test get_customer with wrong token, should raise Unauthorized error
    with pytest.raises(Unauthorized):
        await customer_service.get_customer(token="wrong")

    # test logout_customer
    await customer_service.logout_customer(token=auth.token)
    with pytest.raises(Unauthorized):
        await customer_service.get_customer(token=auth.token)

    # test wrong pin
    with pytest.raises(AccessDenied):
        await customer_service.login_customer(pin="wrong")


async def test_get_orders_with_bon(customer_service: CustomerService, order_with_bon: tuple[Order, CustomerTest]):
    order, test_customer = order_with_bon
    # test get_orders_with_bon with wrong token, should raise Unauthorized error
    with pytest.raises(Unauthorized):
        await customer_service.get_orders_with_bon(token="wrong")

    # login
    login_result = await customer_service.login_customer(pin=test_customer.pin)
    assert login_result is not None

    # test get_orders_with_bon
    result: list[OrderWithBon] = await customer_service.get_orders_with_bon(token=login_result.token)
    assert result is not None

    resulting_order_with_bon = result[0]
    assert resulting_order_with_bon.id == order.id

    # test bon data
    assert resulting_order_with_bon.bon_generated


async def test_update_customer_info(test_customer: CustomerTest, customer_service: CustomerService):
    auth = await customer_service.login_customer(pin=test_customer.pin)
    assert auth is not None

    valid_IBAN = "DE89370400440532013000"
    invalid_IBAN = "DE89370400440532013001"
    invalid_country_code = "VG67BGXY9228788158369211"

    account_name = "Der Tester"
    email = "test@testermensch.de"

    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email=email, donation=0)

    await customer_service.update_customer_info(
        token=auth.token,
        customer_bank=customer_bank,
    )

    # test if get_customer returns the updated data
    result = await customer_service.get_customer(token=auth.token)
    assert result is not None
    assert result.id == test_customer.account_id
    assert result.balance == test_customer.balance
    assert result.iban == valid_IBAN
    assert result.account_name == account_name
    assert result.email == email

    # test invalid IBAN
    customer_bank = CustomerBank(iban=invalid_IBAN, account_name=account_name, email=email, donation=0)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
        )

    # test not allowed country codes
    customer_bank = CustomerBank(iban=invalid_country_code, account_name=account_name, email=email, donation=0)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
        )

    # test invalid email
    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email="test@test", donation=0)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
        )

    # test negative donation
    customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email=email, donation=-1)
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
        )

    # test more donation than balance
    customer_bank = CustomerBank(
        iban=valid_IBAN, account_name=account_name, email=email, donation=test_customer.balance + 1
    )
    with pytest.raises(InvalidArgument):
        await customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
        )

    # test if update_customer_info with wrong token raises Unauthorized error
    with pytest.raises(Unauthorized):
        await customer_service.update_customer_info(token="wrong", customer_bank=customer_bank)
