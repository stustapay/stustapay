# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,disable=protected-access
import copy
import csv
import datetime
import os
import tempfile
import typing
import unittest
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from io import StringIO
from pathlib import Path

from dateutil.parser import parse

from stustapay.core.customer_bank_export import (
    CSV_PATH,
    SEPA_PATH,
    export_customer_payouts,
)
from stustapay.core.schema.config import SEPAConfig
from stustapay.core.schema.customer import Customer, OrderWithBon
from stustapay.core.schema.order import Order, OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct, Product
from stustapay.core.schema.user import format_user_tag_uid
from stustapay.core.service.common.error import (
    AccessDenied,
    InvalidArgument,
    Unauthorized,
)
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
from stustapay.tests.common import TerminalTestCase


@dataclass
class TestCustomer:
    account_id: int
    uid: int
    pin: str
    balance: float


@dataclass
class TestCustomerInfo:
    uid: int
    pin: str
    balance: float
    iban: str
    account_name: str
    email: str
    donation: float
    payout_export: bool


class CustomerServiceTest(TerminalTestCase):
    async def _create_order_with_bon(self) -> tuple[Order, str, TestCustomer]:
        test_customer = await self._create_test_customer()
        product1: Product = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Bier",
                price=5.0,
                tax_rate_id=self.tax_rate_ust.id,
                restrictions=[],
                is_locked=True,
                is_returnable=False,
                fixed_price=True,
            ),
        )
        product2: Product = await self.product_service.create_product(
            token=self.admin_token,
            product=NewProduct(
                name="Pfand",
                price=2.0,
                tax_rate_id=self.tax_rate_none.id,
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
            conn=self.db_conn,
            order_type=OrderType.sale,
            payment_method=PaymentMethod.tag,
            cashier_id=self.cashier.id,
            till_id=self.till.id,
            line_items=line_items,
            bookings={},
            customer_account_id=test_customer.account_id,
        )

        order = await fetch_order(conn=self.db_conn, order_id=booking.id)
        assert order is not None

        bon_path = "test_bon.pdf"
        await self.db_conn.execute(
            "insert into bon (id, generated, generated_at, output_file) overriding system value "
            "values ($1, $2, $3, $4)",
            order.id,
            True,
            parse("2023-01-01 15:35:02 UTC+1"),
            bon_path,
        )
        return order, bon_path, test_customer

    async def _create_test_customer(self) -> TestCustomer:
        pin = "pin"
        balance = 120
        uid = await self.create_random_user_tag(pin=pin)

        account_id = await self.db_conn.fetchval(
            "insert into account (node_id, user_tag_uid, balance, type) values ($1, $2, $3, $4) returning id",
            self.node_id,
            uid,
            balance,
            "private",
        )

        return TestCustomer(account_id=account_id, pin=pin, uid=uid, balance=120)

    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        # create tmp folder for tests which handle files
        self.tmp_dir_obj = tempfile.TemporaryDirectory()
        self.tmp_dir = Path(self.tmp_dir_obj.name)

        self.customer_service = CustomerService(
            db_pool=self.db_pool,
            config=self.test_config,
            auth_service=self.auth_service,
            config_service=self.config_service,
        )

        self.currency_identifier = self.event.currency_identifier
        self.contact_email = self.event.customer_portal_contact_email

        self.customers = await self._generate_customers(n_customers=11)

        # first customer with uid 12345 should not be included as he has a balance of 0
        # last customer has same amount of donation as balance, thus should also not be included
        self.customers_to_transfer = self.customers[1:-1]

        assert self.event.sepa_config is not None
        self.sepa_config = self.event.sepa_config

    async def asyncTearDown(self) -> None:
        await super().asyncTearDown()
        # delete tmp folder for tests which handle files with all its content
        self.tmp_dir_obj.cleanup()

    async def _generate_customers(self, n_customers: int = 10) -> list[TestCustomerInfo]:
        customers = []
        for i in range(n_customers):
            pin = f"pin{i}"
            balance = 10.321 * i + 0.0012
            iban = "DE89370400440532013000"
            account_name = f"Rolf{i}"
            email = "rolf@lol.de"
            donation = balance if i == n_customers - 1 else 1.0 * i
            payout_export = True
            uid = await self.create_random_user_tag(pin=pin)

            account_id = await self.db_conn.fetchval(
                "insert into account (node_id, user_tag_uid, balance, type) "
                "overriding system value values ($1, $2, $3, $4) returning id",
                self.node_id,
                uid,
                balance,
                "private",
            )

            await self.db_conn.execute(
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
                TestCustomerInfo(
                    uid=uid,
                    pin=pin,
                    donation=donation,
                    balance=balance,
                    iban=iban,
                    email=email,
                    account_name=account_name,
                    payout_export=payout_export,
                )
            )
        return customers

    @typing.no_type_check  # mypy is not happy with the whole tree.find().text since the actual return is Optional
    def _check_sepa_xml(self, xml_file, customers, sepa_config: SEPAConfig):
        tree = ET.parse(xml_file)
        p = "{urn:iso:std:iso:20022:tech:xsd:pain.001.001.03}"

        group_sum = float(tree.find(f"{p}CstmrCdtTrfInitn/{p}GrpHdr/{p}CtrlSum").text)

        total_sum = float(tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CtrlSum").text)

        self.assertEqual(group_sum, total_sum)

        l = tree.findall(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf")
        self.assertEqual(len(l), len(customers))

        total_sum = 0
        for i, customer in enumerate(customers):
            # check amount
            self.assertEqual(
                float(tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i + 1}]/{p}Amt/{p}InstdAmt").text),
                round(customer.balance - customer.donation, 2),
            )
            total_sum += round(customer.balance - customer.donation, 2)

            # check iban
            self.assertEqual(
                tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i + 1}]/{p}CdtrAcct/{p}Id/{p}IBAN").text,
                customer.iban,
            )

            # check name
            self.assertEqual(
                tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i + 1}]/{p}Cdtr/{p}Nm").text,
                customer.account_name,
            )

            # check description
            self.assertEqual(
                tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i + 1}]/{p}RmtInf/{p}Ustrd").text,
                sepa_config.description.format(user_tag_uid=format_user_tag_uid(customer.uid)),
            )

        self.assertEqual(total_sum, group_sum)

    async def test_get_number_of_payouts(self):
        result = await get_number_of_payouts(self.db_conn, event_node_id=self.node_id)
        self.assertEqual(result, len(self.customers_to_transfer))

    async def test_get_customer_bank_data(self):
        def check_data(result: list[Payout], leng: int, ith: int = 0) -> None:
            self.assertEqual(len(result), leng)
            for result_customer, customer in zip(result, self.customers_to_transfer[ith * leng : (ith + 1) * leng]):
                self.assertEqual(result_customer.iban, customer.iban)
                self.assertEqual(result_customer.account_name, customer.account_name)
                self.assertEqual(result_customer.email, customer.email)
                self.assertEqual(result_customer.user_tag_uid, customer.uid)
                self.assertEqual(result_customer.balance, customer.balance - customer.donation)

        # check not existing payout run
        result = await get_customer_bank_data(self.db_conn, 1)
        self.assertEqual(len(result), 0)

        # create payout run
        payout_run_id, number_of_payouts = await create_payout_run(
            self.db_conn, event_node_id=self.node_id, created_by="Test", max_payout_sum=50000.0
        )
        self.assertEqual(number_of_payouts, len(self.customers_to_transfer))

        self.assertEqual(
            number_of_payouts,
            await self.db_conn.fetchval("select count(*) from payout where payout_run_id = $1", payout_run_id),
        )

        result = await get_customer_bank_data(self.db_conn, payout_run_id)
        check_data(result, len(self.customers_to_transfer))

    async def test_csv_export(self):
        payout_run_id, number_of_payouts = await create_payout_run(
            self.db_conn, event_node_id=self.node_id, created_by="Test", max_payout_sum=50000.0
        )
        self.assertEqual(number_of_payouts, len(self.customers_to_transfer))

        customers_bank_data = await get_customer_bank_data(self.db_conn, payout_run_id)

        csv_batches = list(
            dump_payout_run_as_csv(
                customers_bank_data=customers_bank_data,
                sepa_config=self.sepa_config,
                currency_ident=self.currency_identifier,
            )
        )

        export_sum = 0.0

        # read the csv back in
        csvfile = StringIO(csv_batches[0])
        reader = csv.DictReader(csvfile)
        rows = list(reader)
        self.assertEqual(len(rows), len(self.customers_to_transfer))

        for row, customer in zip(rows, self.customers_to_transfer):
            self.assertEqual(row["beneficiary_name"], customer.account_name)
            self.assertEqual(row["iban"], customer.iban)
            self.assertEqual(float(row["amount"]), round(customer.balance - customer.donation, 2))
            self.assertEqual(row["currency"], self.currency_identifier)
            self.assertEqual(
                row["reference"],
                self.sepa_config.description.format(user_tag_uid=format_user_tag_uid(customer.uid)),
            )
            self.assertEqual(row["email"], customer.email)
            self.assertEqual(int(row["uid"]), customer.uid)
            export_sum += float(row["amount"])

        sql_sum = float(await self.db_conn.fetchval("select sum(round(balance, 2)) from payout"))
        self.assertEqual(sql_sum, export_sum)

    async def test_sepa_export(self):
        execution_date = datetime.date.today()
        payout_run_id, number_of_payouts = await create_payout_run(
            self.db_conn, event_node_id=self.node_id, created_by="Test", max_payout_sum=50000.0
        )
        self.assertEqual(number_of_payouts, len(self.customers_to_transfer))
        customers_bank_data = await get_customer_bank_data(self.db_conn, payout_run_id)

        test_sepa_config = copy.deepcopy(self.sepa_config)

        # allowed symbols
        test_sepa_config.description += "-.,:()/?'+"
        sepa_batches = list(
            dump_payout_run_as_sepa_xml(
                customers_bank_data=customers_bank_data,
                sepa_config=test_sepa_config,
                currency_ident=self.currency_identifier,
                execution_date=execution_date,
            )
        )
        xml_file = StringIO(sepa_batches[0])
        self._check_sepa_xml(xml_file, self.customers_to_transfer, test_sepa_config)

        # test invalid iban customer
        invalid_iban = "DE89370400440532013001"
        tmp_bank_data = copy.deepcopy(customers_bank_data)
        tmp_bank_data[0].iban = invalid_iban

        with self.assertRaises(ValueError):
            list(
                dump_payout_run_as_sepa_xml(
                    customers_bank_data=tmp_bank_data,
                    sepa_config=self.sepa_config,
                    currency_ident=self.currency_identifier,
                    execution_date=datetime.date.today(),
                )
            )

        # test invalid iban sender
        test_sepa_config = copy.deepcopy(self.sepa_config)
        test_sepa_config.sender_iban = invalid_iban
        with self.assertRaises(ValueError):
            list(
                dump_payout_run_as_sepa_xml(
                    customers_bank_data=customers_bank_data,
                    sepa_config=test_sepa_config,
                    currency_ident=self.currency_identifier,
                    execution_date=datetime.date.today(),
                )
            )

        # test invalid execution date
        with self.assertRaises(ValueError):
            list(
                dump_payout_run_as_sepa_xml(
                    customers_bank_data=customers_bank_data,
                    sepa_config=self.sepa_config,
                    currency_ident=self.currency_identifier,
                    execution_date=datetime.date.today() - datetime.timedelta(days=1),
                )
            )

        # test invalid amount
        tmp_bank_data = copy.deepcopy(customers_bank_data)
        tmp_bank_data[0].balance = -1
        with self.assertRaises(ValueError):
            list(
                dump_payout_run_as_sepa_xml(
                    customers_bank_data=tmp_bank_data,
                    sepa_config=self.sepa_config,
                    currency_ident=self.currency_identifier,
                    execution_date=datetime.date.today(),
                )
            )

        # test invalid description
        test_sepa_config = copy.deepcopy(self.sepa_config)
        test_sepa_config.description = "invalid {user_tag_uid}#%^;&*"
        with self.assertRaises(ValueError):
            list(
                dump_payout_run_as_sepa_xml(
                    customers_bank_data=customers_bank_data,
                    sepa_config=test_sepa_config,
                    currency_ident=self.currency_identifier,
                    execution_date=datetime.date.today(),
                )
            )

    async def test_auth_customer(self):
        test_customer = await self._create_test_customer()
        auth = await self.customer_service.login_customer(uid=test_customer.uid, pin=test_customer.pin)
        self.assertIsNotNone(auth)
        self.assertEqual(auth.customer.id, test_customer.account_id)
        self.assertEqual(auth.customer.balance, test_customer.balance)

        # test get_customer with correct token
        result = await self.customer_service.get_customer(token=auth.token)
        self.assertIsNotNone(result)
        self.assertEqual(result.id, test_customer.account_id)
        self.assertEqual(result.balance, test_customer.balance)

        # test get_customer with wrong token, should raise Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_customer(token="wrong")

        # test logout_customer
        await self.customer_service.logout_customer(token=auth.token)
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_customer(token=auth.token)

        # test wrong pin
        with self.assertRaises(AccessDenied):
            await self.customer_service.login_customer(uid=test_customer.uid, pin="wrong")

    async def test_get_orders_with_bon(self):
        order, bon_path, test_customer = await self._create_order_with_bon()
        # test get_orders_with_bon with wrong token, should raise Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_orders_with_bon(token="wrong")

        # login
        login_result = await self.customer_service.login_customer(uid=test_customer.uid, pin=test_customer.pin)
        self.assertIsNotNone(login_result)

        # test get_orders_with_bon
        result: list[OrderWithBon] = await self.customer_service.get_orders_with_bon(token=login_result.token)
        self.assertIsNotNone(result)

        order_with_bon = result[0]
        self.assertEqual(order_with_bon.id, order.id)

        # test bon data
        self.assertTrue(order_with_bon.bon_generated)
        self.assertEqual(
            order_with_bon.bon_output_file,
            self.test_config.customer_portal.base_bon_url.format(bon_output_file=bon_path),
        )

    async def test_update_customer_info(self):
        test_customer = await self._create_test_customer()
        auth = await self.customer_service.login_customer(uid=test_customer.uid, pin=test_customer.pin)
        self.assertIsNotNone(auth)

        valid_IBAN = "DE89370400440532013000"
        invalid_IBAN = "DE89370400440532013001"
        invalid_country_code = "VG67BGXY9228788158369211"

        account_name = "Der Tester"
        email = "test@testermensch.de"

        customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email=email, donation=0)

        await self.customer_service.update_customer_info(
            token=auth.token,
            customer_bank=customer_bank,
        )

        # test if get_customer returns the updated data
        result = await self.customer_service.get_customer(token=auth.token)
        self.assertIsNotNone(result)
        self.assertEqual(result.id, test_customer.account_id)
        self.assertEqual(result.balance, test_customer.balance)
        self.assertEqual(result.iban, valid_IBAN)
        self.assertEqual(result.account_name, account_name)
        self.assertEqual(result.email, email)

        # test invalid IBAN
        customer_bank = CustomerBank(iban=invalid_IBAN, account_name=account_name, email=email, donation=0)
        with self.assertRaises(InvalidArgument):
            await self.customer_service.update_customer_info(
                token=auth.token,
                customer_bank=customer_bank,
            )

        # test not allowed country codes
        customer_bank = CustomerBank(iban=invalid_country_code, account_name=account_name, email=email, donation=0)
        with self.assertRaises(InvalidArgument):
            await self.customer_service.update_customer_info(
                token=auth.token,
                customer_bank=customer_bank,
            )

        # test invalid email
        customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email="test@test", donation=0)
        with self.assertRaises(InvalidArgument):
            await self.customer_service.update_customer_info(
                token=auth.token,
                customer_bank=customer_bank,
            )

        # test negative donation
        customer_bank = CustomerBank(iban=valid_IBAN, account_name=account_name, email=email, donation=-1)
        with self.assertRaises(InvalidArgument):
            await self.customer_service.update_customer_info(
                token=auth.token,
                customer_bank=customer_bank,
            )

        # test more donation than balance
        customer_bank = CustomerBank(
            iban=valid_IBAN, account_name=account_name, email=email, donation=test_customer.balance + 1
        )
        with self.assertRaises(InvalidArgument):
            await self.customer_service.update_customer_info(
                token=auth.token,
                customer_bank=customer_bank,
            )

        # test if update_customer_info with wrong token raises Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.update_customer_info(token="wrong", customer_bank=customer_bank)

    async def test_export_customer_bank_data(self):
        output_path = self.tmp_dir / "test_export"
        output_path.mkdir(parents=True, exist_ok=True)

        await export_customer_payouts(
            config=self.test_config,
            event_node_id=self.node_id,
            created_by="test",
            dry_run=True,
            output_path=output_path,
        )
        self.assertTrue(os.path.exists(os.path.join(output_path, CSV_PATH.format(1))))
        self.assertTrue(os.path.exists(os.path.join(output_path, SEPA_PATH.format(1, 1))))

        self._check_sepa_xml(
            os.path.join(output_path, SEPA_PATH.format(1, 1)), self.customers_to_transfer, self.sepa_config
        )

        # check if dry run successful and no database entry created
        self.assertEqual(await get_number_of_payouts(self.db_conn, event_node_id=self.node_id, payout_run_id=1), 0)

        output_path = self.tmp_dir / "test_export2"
        output_path.mkdir(parents=True, exist_ok=True)

        # test several batches
        await export_customer_payouts(
            config=self.test_config,
            created_by="Test",
            event_node_id=self.node_id,
            dry_run=True,
            max_transactions_per_batch=1,
            output_path=output_path,
        )
        for i in range(len(self.customers_to_transfer)):
            self.assertTrue(os.path.exists(os.path.join(output_path, SEPA_PATH.format(2, i + 1))))
            self._check_sepa_xml(
                os.path.join(output_path, SEPA_PATH.format(2, i + 1)),
                self.customers_to_transfer[i : i + 1],
                self.sepa_config,
            )

        self.assertTrue(os.path.exists(os.path.join(output_path, CSV_PATH.format(2))))

        # test non dry run
        output_path = self.tmp_dir / "test_export3"
        output_path.mkdir(parents=True, exist_ok=True)
        await export_customer_payouts(
            config=self.test_config,
            created_by="Test",
            event_node_id=self.node_id,
            dry_run=False,
            output_path=output_path,
        )
        self.assertTrue(os.path.exists(os.path.join(output_path, SEPA_PATH.format(3, 1))))
        self._check_sepa_xml(
            os.path.join(output_path, SEPA_PATH.format(3, 1)), self.customers_to_transfer, self.sepa_config
        )

        self.assertTrue(os.path.exists(os.path.join(output_path, CSV_PATH.format(3))))

        # check that all customers in self.customers_to_transfer have payout_run_id set to 1 and rest null
        customers = await self.db_conn.fetch_many(Customer, "select * from customer")
        uid_to_transfer = [customer.uid for customer in self.customers_to_transfer]
        for customer in customers:
            if customer.user_tag_uid in uid_to_transfer:
                self.assertEqual(customer.payout_run_id, 3)
            else:
                self.assertIsNone(customer.payout_run_id)

        # test customer "Rolf1" can no longer be updated since they now have a payout run assigned
        auth = await self.customer_service.login_customer(
            uid=self.customers_to_transfer[0].uid, pin=self.customers_to_transfer[0].pin
        )
        self.assertIsNotNone(auth)
        customer_bank = CustomerBank(
            iban="DE89370400440532013000", account_name="Rolf1 updated", email="lol@rolf.de", donation=2.0
        )
        with self.assertRaises(InvalidArgument):
            await self.customer_service.update_customer_info(
                token=auth.token,
                customer_bank=customer_bank,
            )

        with self.assertRaises(InvalidArgument):
            await self.customer_service.update_customer_info_donate_all(
                token=auth.token,
            )

    async def test_max_payout_sum(self):
        output_path = self.tmp_dir / "test_max_payout_sum"
        output_path.mkdir(parents=True, exist_ok=True)

        num = 2
        s = sum(customer.balance - customer.donation for customer in self.customers_to_transfer[:num])

        await export_customer_payouts(
            config=self.test_config,
            created_by="test",
            event_node_id=self.node_id,
            dry_run=False,
            output_path=output_path,
            max_payout_sum=s,
        )

        self.assertTrue(os.path.exists(os.path.join(output_path, CSV_PATH.format(1))))
        self.assertTrue(os.path.exists(os.path.join(output_path, SEPA_PATH.format(1, 1))))
        self._check_sepa_xml(
            os.path.join(output_path, SEPA_PATH.format(1, 1)), self.customers_to_transfer[0:num], self.sepa_config
        )

    async def test_payout_runs(self):
        output_path = self.tmp_dir / "test_payout_runs"
        output_path.mkdir(parents=True, exist_ok=True)
        os.makedirs(output_path, exist_ok=True)

        uid_not_to_transfer = [customer.uid for customer in self.customers_to_transfer[:2]]

        await self.db_conn.execute(
            "update customer_info c set payout_export = false "
            "from account_with_history a where a.id = c.customer_account_id and a.user_tag_uid in ($1, $2)",
            *uid_not_to_transfer,
        )

        await export_customer_payouts(
            config=self.test_config,
            created_by="test",
            event_node_id=self.node_id,
            dry_run=False,
            output_path=output_path,
        )

        self.assertTrue(os.path.exists(os.path.join(output_path, CSV_PATH.format(1))))
        self.assertTrue(os.path.exists(os.path.join(output_path, SEPA_PATH.format(1, 1))))
        self._check_sepa_xml(
            os.path.join(output_path, SEPA_PATH.format(1, 1)), self.customers_to_transfer[2:], self.sepa_config
        )

        customers = await self.db_conn.fetch_many(Customer, "select * from customer")
        uid_to_transfer = [customer.uid for customer in self.customers_to_transfer[2:]]
        for customer in customers:
            if customer.user_tag_uid in uid_to_transfer:
                self.assertEqual(customer.payout_run_id, 1)
            else:
                self.assertIsNone(customer.payout_run_id)

        # now set them to payout_export = true and run again
        await self.db_conn.execute(
            "update customer_info c set payout_export = true "
            "from account_with_history a "
            "where a.id = c.customer_account_id and a.user_tag_uid in ($1, $2)",
            *uid_not_to_transfer,
        )

        # but set customer 1 to an error
        await self.db_conn.execute(
            "update customer_info c set payout_error = 'some error' "
            "from account_with_history a "
            "where a.id = c.customer_account_id and a.user_tag_uid = $1",
            self.customers_to_transfer[0].uid,
        )

        await export_customer_payouts(
            config=self.test_config,
            created_by="test",
            dry_run=False,
            event_node_id=self.node_id,
            output_path=output_path,
        )
        self.assertTrue(os.path.exists(os.path.join(output_path, CSV_PATH.format(2))))
        self.assertTrue(os.path.exists(os.path.join(output_path, SEPA_PATH.format(2, 1))))
        self._check_sepa_xml(
            os.path.join(output_path, SEPA_PATH.format(2, 1)), self.customers_to_transfer[1:2], self.sepa_config
        )

        self.assertEqual(await self.db_conn.fetchval("select count(*) from customer where payout_run_id = 2"), 1)


if __name__ == "__main__":
    unittest.main()
