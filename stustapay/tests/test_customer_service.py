# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,disable=protected-access
import copy
import csv
import datetime
import os
import unittest

from dateutil.parser import parse

from stustapay.core.config import CustomerPortalApiConfig
from stustapay.core.customer_bank_export import CustomerExportCli
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.order import Order, OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct
from stustapay.core.service.common.error import InvalidArgument, Unauthorized, AccessDenied
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer.customer import (
    CustomerBank,
    Payout,
    CustomerService,
    create_payout_run,
    csv_export,
    get_customer_bank_data,
    get_number_of_payouts,
    sepa_export,
)
from stustapay.core.service.order.booking import NewLineItem, book_order
from stustapay.core.service.order.order import fetch_order
from stustapay.tests.common import TEST_CONFIG, TerminalTestCase
import xml.etree.ElementTree as ET


class CustomerServiceTest(TerminalTestCase):
    async def asyncSetUp(self) -> None:
        await super().asyncSetUp()

        self.config_service = ConfigService(
            db_pool=self.db_pool, config=self.test_config, auth_service=self.auth_service
        )

        self.customer_service = CustomerService(
            db_pool=self.db_pool,
            config=self.test_config,
            auth_service=self.auth_service,
            config_service=self.config_service,
        )

        self.uid = 1234
        self.pin = "pin"
        self.balance = 120

        self.bon_path = "test_bon.pdf"
        pc = await self.config_service.get_public_config()
        self.currency_symbol = pc.currency_symbol
        self.currency_identifier = pc.currency_identifier
        self.contact_email = pc.contact_email

        await self.db_conn.execute(
            "insert into user_tag (uid, pin) values ($1, $2)",
            self.uid,
            self.pin,
        )

        self.account_id = await self.db_conn.fetchval(
            "insert into account (user_tag_uid, balance, type) values ($1, $2, $3) returning id",
            self.uid,
            self.balance,
            "private",
        )

        product1 = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="Bier", price=5.0, tax_name="ust")
        )
        product2 = await self.product_service.create_product(
            token=self.admin_token, product=NewProduct(name="Pfand", price=2.0, tax_name="none")
        )

        line_items = [
            NewLineItem(
                quantity=1,
                product_id=product1.id,
                product_price=product1.price,
                tax_name=product1.tax_name,
                tax_rate=product1.tax_rate,
            ),
            NewLineItem(
                quantity=1,
                product_id=product2.id,
                product_price=product2.price,
                tax_name=product2.tax_name,
                tax_rate=product2.tax_rate,
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
            customer_account_id=self.account_id,
        )

        self.order = await fetch_order(conn=self.db_conn, order_id=booking.id)
        assert self.order is not None

        await self.db_conn.execute(
            "insert into bon (id, generated, generated_at, output_file) overriding system value "
            "values ($1, $2, $3, $4)",
            self.order.id,
            True,
            parse("2023-01-01 15:35:02 UTC+1"),
            self.bon_path,
        )

        self.customers = [
            {
                "uid": 12345 * (i + 1),
                "pin": f"pin{i}",
                "balance": 10.321 * i + 0.0012,
                "iban": "DE89370400440532013000",
                "account_name": f"Rolf{i}",
                "email": "rolf@lol.de",
                "donation": 1.0 * i,
                "payout_export": True,
            }
            for i in range(10)
        ]

        # same amount of donation as balance
        self.customers += [
            {
                "uid": 12345 * (10 + 1),
                "pin": "pin10",
                "balance": 10,
                "iban": "DE89370400440532013000",
                "account_name": "Rolf",
                "email": "rolf@lol.de",
                "donation": 10,
                "payout_export": True,
            }
        ]

        await self._add_customers(self.customers)

        # first customer with uid 12345 should not be included as he has a balance of 0
        # last customer has same amount of donation as balance, thus should also not be included
        self.customers_to_transfer = self.customers[1:-1]

        self.currency_ident = (await self.config_service.get_public_config(conn=self.db_conn)).currency_identifier
        self.sepa_config = await self.config_service.get_sepa_config(conn=self.db_conn)

    async def _add_customers(self, data: list[dict]) -> None:
        for idx, customer in enumerate(data):
            await self.db_conn.execute(
                "insert into user_tag (uid, pin) values ($1, $2)",
                customer["uid"],
                customer["pin"],
            )

            await self.db_conn.execute(
                "insert into account (id, user_tag_uid, balance, type) overriding system value values ($1, $2, $3, $4)",
                idx + 100,
                customer["uid"],
                customer["balance"],
                "private",
            )

            await self.db_conn.execute(
                "insert into customer_info (customer_account_id, iban, account_name, email, donation, payout_export) values ($1, $2, $3, $4, $5, $6)",
                idx + 100,
                customer["iban"],
                customer["account_name"],
                customer["email"],
                customer["donation"],
                customer["payout_export"],
            )

            # update allowed country code config
            await self.db_conn.execute(
                "update config set value = '[\"DE\"]' where key = 'customer_portal.sepa.allowed_country_codes'",
            )

    def _check_sepa_xml(self, path, customers):
        tree = ET.parse(path)
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
                float(tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i+1}]/{p}Amt/{p}InstdAmt").text),
                round(customer["balance"] - customer["donation"], 2),
            )
            total_sum += round(customer["balance"] - customer["donation"], 2)

            # check iban
            self.assertEqual(
                tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i+1}]/{p}CdtrAcct/{p}Id/{p}IBAN").text,
                customer["iban"],
            )

            # check name
            self.assertEqual(
                tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i+1}]/{p}Cdtr/{p}Nm").text,
                customer["account_name"],
            )

            # check description
            self.assertEqual(
                tree.find(f"{p}CstmrCdtTrfInitn/{p}PmtInf/{p}CdtTrfTxInf[{i+1}]/{p}RmtInf/{p}Ustrd").text,
                self.sepa_config.description.format(user_tag_uid=hex(customer["uid"])),
            )

        self.assertEqual(total_sum, group_sum)

    async def test_get_number_of_payouts(self):
        result = await get_number_of_payouts(self.db_conn, None)
        self.assertEqual(result, len(self.customers_to_transfer))

    async def test_get_customer_bank_data(self):
        def check_data(result: list[Payout], leng: int, ith: int = 0) -> None:
            self.assertEqual(len(result), leng)
            for result_customer, customer in zip(result, self.customers_to_transfer[ith * leng : (ith + 1) * leng]):
                self.assertEqual(result_customer.iban, customer["iban"])
                self.assertEqual(result_customer.account_name, customer["account_name"])
                self.assertEqual(result_customer.email, customer["email"])
                self.assertEqual(result_customer.user_tag_uid, customer["uid"])
                self.assertEqual(result_customer.balance, customer["balance"] - customer["donation"])  # type: ignore

        # check not existing payout run
        result = await get_customer_bank_data(self.db_conn, 1, len(self.customers_to_transfer))
        self.assertEqual(len(result), 0)

        # create payout run
        payout_run_id, number_of_payouts = await create_payout_run(self.db_conn, "Test")
        self.assertEqual(number_of_payouts, len(self.customers_to_transfer))

        result = await get_customer_bank_data(self.db_conn, payout_run_id, len(self.customers_to_transfer))
        check_data(result, len(self.customers_to_transfer))

        async def test_batches(leng: int):
            for i in range(len(self.customers_to_transfer) // leng):
                result = await get_customer_bank_data(self.db_conn, payout_run_id, leng, i)
                check_data(result, leng, i)

        await test_batches(5)
        await test_batches(3)
        await test_batches(1)

    async def test_csv_export(self):
        test_file_name = "test.csv"
        execution_date = datetime.date.today()
        payout_run_id, number_of_payouts = await create_payout_run(self.db_conn, "Test")
        self.assertEqual(number_of_payouts, len(self.customers_to_transfer))

        customers_bank_data = await get_customer_bank_data(self.db_conn, payout_run_id, len(self.customers_to_transfer))

        await csv_export(
            customers_bank_data,
            os.path.join(self.tmp_dir, test_file_name),
            self.sepa_config,
            self.currency_ident,
            execution_date,
        )

        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, test_file_name)))

        export_sum = 0

        # read the csv back in
        with open(os.path.join(self.tmp_dir, test_file_name)) as csvfile:
            reader = csv.DictReader(csvfile)
            self.assertEqual(len(list(reader)), len(self.customers_to_transfer))
        with open(os.path.join(self.tmp_dir, test_file_name)) as csvfile:
            reader = csv.DictReader(csvfile)
            for row, customer in zip(reader, self.customers_to_transfer):
                self.assertEqual(row["beneficiary_name"], customer["account_name"])
                self.assertEqual(row["iban"], customer["iban"])
                self.assertEqual(float(row["amount"]), round(customer["balance"] - customer["donation"], 2))
                self.assertEqual(row["currency"], self.currency_ident)
                self.assertEqual(
                    row["reference"],
                    self.sepa_config.description.format(user_tag_uid=hex(customer["uid"])),
                )
                self.assertEqual(row["execution_date"], execution_date.isoformat())
                export_sum += float(row["amount"])

        sql_sum = float(await self.db_conn.fetchval("select sum(round(balance, 2)) from payout"))
        self.assertEqual(sql_sum, export_sum)

    async def test_sepa_export(self):
        test_file_name = "test_sepa.xml"
        payout_run_id, number_of_payouts = await create_payout_run(self.db_conn, "Test")
        self.assertEqual(number_of_payouts, len(self.customers_to_transfer))
        customers_bank_data = await get_customer_bank_data(self.db_conn, payout_run_id, max_export_items_per_batch=1)

        currency_ident = (await self.config_service.get_public_config(conn=self.db_conn)).currency_identifier
        sepa_config = await self.config_service.get_sepa_config(conn=self.db_conn)

        test_sepa_config = copy.deepcopy(sepa_config)

        # allowed symbols
        test_sepa_config.description += "-.,:()/?'+"
        await sepa_export(
            customers_bank_data,
            os.path.join(self.tmp_dir, test_file_name),
            test_sepa_config,
            currency_ident,
            datetime.date.today(),
        )
        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, test_file_name)))

        test_file_name = "test_sepa_multiple.xml"
        customers_bank_data = await get_customer_bank_data(
            self.db_conn, payout_run_id, max_export_items_per_batch=len(self.customers_to_transfer)
        )
        await sepa_export(
            customers_bank_data,
            os.path.join(self.tmp_dir, test_file_name),
            sepa_config,
            currency_ident,
            datetime.date.today(),
        )
        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, test_file_name)))
        self._check_sepa_xml(os.path.join(self.tmp_dir, test_file_name), self.customers_to_transfer)

        customers_bank_data = await get_customer_bank_data(self.db_conn, payout_run_id, max_export_items_per_batch=1)

        # test invalid iban customer
        invalid_iban = "DE89370400440532013001"
        tmp_bank_data = copy.deepcopy(customers_bank_data)
        tmp_bank_data[0].iban = invalid_iban

        with self.assertRaises(ValueError):
            await sepa_export(
                tmp_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                sepa_config,
                currency_ident,
                datetime.date.today(),
            )

        # test invalid iban country code, virgin islands are not allowed ;)
        invalid_iban = "VG67BGXY9228788158369211"
        tmp_bank_data = copy.deepcopy(customers_bank_data)
        tmp_bank_data[0].iban = invalid_iban

        with self.assertRaises(ValueError):
            await sepa_export(
                tmp_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                sepa_config,
                currency_ident,
                datetime.date.today(),
            )

        # test invalid iban sender
        test_sepa_config = copy.deepcopy(sepa_config)
        test_sepa_config.sender_iban = invalid_iban
        with self.assertRaises(ValueError):
            await sepa_export(
                customers_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                test_sepa_config,
                currency_ident,
                datetime.date.today(),
            )

        # test invalid execution date
        with self.assertRaises(ValueError):
            await sepa_export(
                customers_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                sepa_config,
                currency_ident,
                datetime.date.today() - datetime.timedelta(days=1),
            )

        # test invalid amount
        tmp_bank_data = copy.deepcopy(customers_bank_data)
        tmp_bank_data[0].balance = -1
        with self.assertRaises(ValueError):
            await sepa_export(
                tmp_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                sepa_config,
                currency_ident,
                datetime.date.today(),
            )

        # test invalid description
        test_sepa_config = copy.deepcopy(sepa_config)
        test_sepa_config.description = "invalid {user_tag_uid}#%^;&*"
        with self.assertRaises(ValueError):
            await sepa_export(
                customers_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                test_sepa_config,
                currency_ident,
                datetime.date.today(),
            )

    async def test_auth_customer(self):
        # test login_customer
        auth = await self.customer_service.login_customer(uid=self.uid, pin=self.pin)
        self.assertIsNotNone(auth)
        self.assertEqual(auth.customer.id, self.account_id)
        self.assertEqual(auth.customer.balance, self.balance)

        # test get_customer with correct token
        result = await self.customer_service.get_customer(token=auth.token)
        self.assertIsNotNone(result)
        self.assertEqual(result.id, self.account_id)
        self.assertEqual(result.balance, self.balance)

        # test get_customer with wrong token, should raise Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_customer(token="wrong")

        # test logout_customer
        await self.customer_service.logout_customer(token=auth.token)
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_customer(token=auth.token)

        # test wrong pin
        with self.assertRaises(AccessDenied):
            await self.customer_service.login_customer(uid=self.uid, pin="wrong")

    async def test_get_orders_with_bon(self):
        # test get_orders_with_bon with wrong token, should raise Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.get_orders_with_bon(token="wrong")

        # login
        result = await self.customer_service.login_customer(uid=self.uid, pin=self.pin)  # type: ignore
        self.assertIsNotNone(result)

        # test get_orders_with_bon
        result = await self.customer_service.get_orders_with_bon(token=result.token)
        self.assertIsNotNone(result)

        self.assertEqual(Order(**result[0].dict()), self.order)

        # test bon data
        self.assertTrue(result[0].bon_generated)
        self.assertEqual(
            result[0].bon_output_file,
            self.test_config.customer_portal.base_bon_url.format(bon_output_file=self.bon_path),
        )

    async def test_update_customer_info(self):
        # login
        auth = await self.customer_service.login_customer(uid=self.uid, pin=self.pin)
        self.assertIsNotNone(auth)

        valid_IBAN = "DE89370400440532013000"
        invalid_IBAN = "DE89370400440532013001"

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
        self.assertEqual(result.id, self.account_id)
        self.assertEqual(result.balance, self.balance)
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

        # TODO: test not allowed country codes

        # test if update_customer_info with wrong token raises Unauthorized error
        with self.assertRaises(Unauthorized):
            await self.customer_service.update_customer_info(token="wrong", customer_bank=customer_bank)

    async def test_get_public_customer_api_config(self):
        result = await self.customer_service.get_public_customer_api_config()
        self.assertIsNotNone(result)
        self.assertEqual(result.currency_identifier, self.currency_identifier)
        self.assertEqual(result.currency_symbol, self.currency_symbol)
        self.assertEqual(result.contact_email, self.contact_email)

        # TODO: change when config is refactored
        # test config keys from yaml config
        cpc = CustomerPortalApiConfig.parse_obj(TEST_CONFIG["customer_portal"])
        self.assertEqual(result.data_privacy_url, cpc.data_privacy_url)
        self.assertEqual(result.about_page_url, cpc.about_page_url)

    async def test_export_customer_bank_data(self):
        cli = CustomerExportCli(None, config=self.test_config)
        output_path = os.path.join(self.tmp_dir, "test_export")
        os.makedirs(output_path, exist_ok=True)

        await cli._export_customer_bank_data(
            db_pool=self.db_pool, created_by="test", dry_run=True, output_path=output_path
        )
        self.assertTrue(os.path.exists(os.path.join(output_path, cli.CSV_PATH.format(1))))
        self.assertTrue(os.path.exists(os.path.join(output_path, cli.SEPA_PATH.format(1, 1))))

        self._check_sepa_xml(os.path.join(output_path, cli.SEPA_PATH.format(1, 1)), self.customers_to_transfer)

        # check if dry run successful and no database entry created
        self.assertEqual(await get_number_of_payouts(self.db_conn, 1), 0)

        output_path = os.path.join(self.tmp_dir, "test_export2")
        os.makedirs(output_path, exist_ok=True)

        # test several batches
        await cli._export_customer_bank_data(
            db_pool=self.db_pool, created_by="Test", dry_run=True, max_export_items_per_batch=1, output_path=output_path
        )
        for i in range(len(self.customers_to_transfer)):
            self.assertTrue(os.path.exists(os.path.join(output_path, cli.SEPA_PATH.format(2, i + 1))))
            self._check_sepa_xml(
                os.path.join(output_path, cli.SEPA_PATH.format(2, i + 1)), self.customers_to_transfer[i : i + 1]
            )

        self.assertTrue(os.path.exists(os.path.join(output_path, cli.CSV_PATH.format(2))))

        # test non dry run
        output_path = os.path.join(self.tmp_dir, "test_export3")
        os.makedirs(output_path, exist_ok=True)
        await cli._export_customer_bank_data(
            db_pool=self.db_pool, created_by="Test", dry_run=False, output_path=output_path
        )
        self.assertTrue(os.path.exists(os.path.join(output_path, cli.SEPA_PATH.format(3, 1))))
        self._check_sepa_xml(os.path.join(output_path, cli.SEPA_PATH.format(3, 1)), self.customers_to_transfer)

        self.assertTrue(os.path.exists(os.path.join(output_path, cli.CSV_PATH.format(3))))

        # check that all customers in self.customers_to_transfer have payout_run_id set to 1 and rest null
        rows = await self.db_conn.fetch("select * from customer")
        customers = [Customer.parse_obj(row) for row in rows]
        uid_to_transfer = [customer["uid"] for customer in self.customers_to_transfer]
        for customer in customers:
            if customer.user_tag_uid in uid_to_transfer:
                self.assertEqual(customer.payout_run_id, 3)
            else:
                self.assertIsNone(customer.payout_run_id)

    async def test_payout_runs(self):
        cli = CustomerExportCli(None, config=self.test_config)
        output_path = os.path.join(self.tmp_dir, "test_payout_runs")
        os.makedirs(output_path, exist_ok=True)

        uid_not_to_transfer = [customer["uid"] for customer in self.customers_to_transfer[:2]]

        await self.db_conn.execute(
            "update customer_info c set payout_export = false from account_with_history a where a.id = c.customer_account_id and a.user_tag_uid in ($1, $2)",
            *uid_not_to_transfer,
        )

        await cli._export_customer_bank_data(
            db_pool=self.db_pool, created_by="test", dry_run=False, output_path=output_path
        )

        self.assertTrue(os.path.exists(os.path.join(output_path, cli.CSV_PATH.format(1))))
        self.assertTrue(os.path.exists(os.path.join(output_path, cli.SEPA_PATH.format(1, 1))))
        self._check_sepa_xml(os.path.join(output_path, cli.SEPA_PATH.format(1, 1)), self.customers_to_transfer[2:])

        rows = await self.db_conn.fetch("select * from customer")
        customers = [Customer.parse_obj(row) for row in rows]
        uid_to_transfer = [customer["uid"] for customer in self.customers_to_transfer[2:]]
        for customer in customers:
            if customer.user_tag_uid in uid_to_transfer:
                self.assertEqual(customer.payout_run_id, 1)
            else:
                self.assertIsNone(customer.payout_run_id)

        # now set them to payout_export = true and run again
        await self.db_conn.execute(
            "update customer_info c set payout_export = true from account_with_history a where a.id = c.customer_account_id and a.user_tag_uid in ($1, $2)",
            *uid_not_to_transfer,
        )

        # but set customer 1 to an error
        await self.db_conn.execute(
            "update customer_info c set payout_error = 'some error' from account_with_history a where a.id = c.customer_account_id and a.user_tag_uid = $1",
            self.customers_to_transfer[0]["uid"],
        )

        await cli._export_customer_bank_data(
            db_pool=self.db_pool, created_by="test", dry_run=False, output_path=output_path
        )
        self.assertTrue(os.path.exists(os.path.join(output_path, cli.CSV_PATH.format(2))))
        self.assertTrue(os.path.exists(os.path.join(output_path, cli.SEPA_PATH.format(2, 1))))
        self._check_sepa_xml(os.path.join(output_path, cli.SEPA_PATH.format(2, 1)), self.customers_to_transfer[1:2])

        self.assertEqual(await self.db_conn.fetchval("select count(*) from customer where payout_run_id = 2"), 1)


if __name__ == "__main__":
    unittest.main()
