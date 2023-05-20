# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa,disable=protected-access
import copy
import csv
import datetime
import os
import unittest
from stustapay.core.customer_bank_export import CustomerExportCli
from stustapay.core.schema.order import Order, OrderType, PaymentMethod
from stustapay.core.schema.product import NewProduct
from stustapay.core.service.config import ConfigService
from stustapay.core.service.customer import (
    CustomerBankData,
    CustomerService,
    csv_export,
    get_customer_bank_data,
    get_number_of_customers,
    sepa_export,
)
from stustapay.core.service.order.booking import NewLineItem, book_order
from stustapay.core.service.order.order import fetch_order
from stustapay.tests.common import TEST_CONFIG, TerminalTestCase
from stustapay.core.config import CustomerPortalApiConfig
from stustapay.core.schema.customer import CustomerBank
from stustapay.core.service.common.error import InvalidArgument, Unauthorized
from dateutil.parser import parse


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
        self.account_id = 10
        self.balance = 120

        self.bon_path = "test_bon.pdf"
        pc = await self.config_service.get_public_config()
        self.currency_symbol = pc.currency_symbol
        self.currency_identifier = pc.currency_identifier

        await self.db_conn.execute(
            "insert into user_tag (uid, pin) values ($1, $2)",
            self.uid,
            self.pin,
        )

        # usr needed by ordr
        await self.db_conn.execute(
            "insert into usr (login, display_name, user_tag_uid) values ($1, $2, $3)",
            "test login",
            "test display name",
            self.uid,
        )

        await self.db_conn.execute(
            "insert into account (id, user_tag_uid, balance, type) overriding system value values ($1, $2, $3, $4)",
            self.account_id,
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
                "account_name": "Rolf",
                "email": "rolf@lol.de",
            }
            for i in range(10)
        ]

        await self._add_customers(self.customers)

        # first customer with uid 12345 should not be included as he has a balance of 0
        self.customers_to_transfer = self.customers[1:]

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
                "insert into customer_info (customer_account_id, iban, account_name, email) values ($1, $2, $3, $4)",
                idx + 100,
                customer["iban"],
                customer["account_name"],
                customer["email"],
            )

    async def test_get_number_of_customers(self):
        result = await get_number_of_customers(self.db_conn)
        self.assertEqual(result, len(self.customers_to_transfer))

    async def test_get_customer_bank_data(self):
        def check_data(result: list[CustomerBankData], leng: int, ith: int = 0) -> None:
            self.assertEqual(len(result), leng)
            for result_customer, customer in zip(result, self.customers_to_transfer[ith * leng : (ith + 1) * leng]):
                self.assertEqual(result_customer.iban, customer["iban"])
                self.assertEqual(result_customer.account_name, customer["account_name"])
                self.assertEqual(result_customer.email, customer["email"])
                self.assertEqual(result_customer.user_tag_uid, customer["uid"])
                self.assertEqual(result_customer.balance, customer["balance"])

        result = await get_customer_bank_data(self.db_conn, len(self.customers_to_transfer))
        check_data(result, len(self.customers_to_transfer))

        async def test_batches(leng: int):
            for i in range(len(self.customers_to_transfer) // leng):
                result = await get_customer_bank_data(self.db_conn, leng, i)
                check_data(result, leng, i)

        await test_batches(5)
        await test_batches(3)
        await test_batches(1)

    async def test_csv_export(self):
        test_currency = "EUR"
        test_file_name = "test.csv"
        execution_date = datetime.date.today()
        customers_bank_data = await get_customer_bank_data(self.db_conn, len(self.customers_to_transfer))
        csv_export(
            customers_bank_data,
            os.path.join(self.tmp_dir, test_file_name),
            self.test_config,
            test_currency,
            execution_date,
        )

        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, test_file_name)))

        # read the csv back in
        with open(os.path.join(self.tmp_dir, test_file_name)) as csvfile:
            reader = csv.DictReader(csvfile)
            self.assertEqual(len(list(reader)), len(self.customers_to_transfer))
            for row, customer in zip(reader, self.customers_to_transfer):
                self.assertEqual(row["beneficiary_name"], customer["account_name"])
                self.assertEqual(row["iban"], customer["iban"])
                self.assertEqual(float(row["amount"]), round(customer["balance"], 2))
                self.assertEqual(row["currency"], test_currency)
                self.assertEqual(
                    row["reference"],
                    self.test_config.customer_portal.sepa_config.description.format(user_tag_uid=customer["uid"]),
                )
                self.assertEqual(row["execution_date"], execution_date.isoformat())

    async def test_sepa_export(self):
        test_currency = "EUR"
        test_file_name = "test_sepa.xml"
        customers_bank_data = await get_customer_bank_data(self.db_conn, max_export_items_per_batch=1)
        cfg = copy.deepcopy(self.test_config)
        # allowed symbols
        cfg.customer_portal.sepa_config.description += "-.,:()/?'+"
        sepa_export(
            customers_bank_data,
            os.path.join(self.tmp_dir, test_file_name),
            cfg,
            test_currency,
            datetime.date.today(),
        )
        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, test_file_name)))

        test_file_name = "test_sepa_multiple.xml"
        customers_bank_data = await get_customer_bank_data(
            self.db_conn, max_export_items_per_batch=len(self.customers_to_transfer)
        )
        sepa_export(
            customers_bank_data,
            os.path.join(self.tmp_dir, test_file_name),
            self.test_config,
            test_currency,
            datetime.date.today(),
        )
        self.assertTrue(os.path.exists(os.path.join(self.tmp_dir, test_file_name)))

        customers_bank_data = await get_customer_bank_data(self.db_conn, max_export_items_per_batch=1)

        # test invalid iban customer
        invalid_iban = "DE89370400440532013001"
        tmp_bank_data = copy.deepcopy(customers_bank_data)
        tmp_bank_data[0].iban = invalid_iban

        with self.assertRaises(ValueError):
            sepa_export(
                tmp_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                self.test_config,
                test_currency,
                datetime.date.today(),
            )

        # test invalid iban sender
        cfg = copy.deepcopy(self.test_config)
        cfg.customer_portal.sepa_config.sender_iban = invalid_iban
        with self.assertRaises(ValueError):
            sepa_export(
                customers_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                cfg,
                test_currency,
                datetime.date.today(),
            )

        # test invalid execution date
        with self.assertRaises(ValueError):
            sepa_export(
                customers_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                self.test_config,
                test_currency,
                datetime.date.today() - datetime.timedelta(days=1),
            )

        # test invalid amount
        tmp_bank_data = copy.deepcopy(customers_bank_data)
        tmp_bank_data[0].balance = -1
        with self.assertRaises(ValueError):
            sepa_export(
                tmp_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                self.test_config,
                test_currency,
                datetime.date.today(),
            )

        # test invalid description
        cfg = copy.deepcopy(self.test_config)
        cfg.customer_portal.sepa_config.description = "invalid {user_tag_uid}#%^;&*"
        with self.assertRaises(ValueError):
            sepa_export(
                customers_bank_data,
                os.path.join(self.tmp_dir, test_file_name),
                cfg,
                test_currency,
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
        result = await self.customer_service.login_customer(uid=self.uid, pin="wrong")
        self.assertIsNone(result)

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

        customer_bank = CustomerBank(
            iban=valid_IBAN,
            account_name=account_name,
            email=email,
        )

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
        customer_bank = CustomerBank(
            iban=invalid_IBAN,
            account_name=account_name,
            email=email,
        )
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

        # TODO: change when config is refactored
        # test config keys from yaml config
        cpc = CustomerPortalApiConfig.parse_obj(TEST_CONFIG["customer_portal"])
        self.assertEqual(result.data_privacy_url, cpc.data_privacy_url)
        self.assertEqual(result.contact_email, cpc.contact_email)
        self.assertEqual(result.about_page_url, cpc.about_page_url)

    async def test_export_customer_bank_data(self):
        cli = CustomerExportCli(None, config=self.test_config)
        output_path = os.path.join(self.tmp_dir, "test_export")

        await cli._export_customer_bank_data(db_pool=self.db_pool, output_path=output_path)
        self.assertTrue(os.path.exists(output_path + "_1.xml"))

        await cli._export_customer_bank_data(db_pool=self.db_pool, output_path=output_path, data_format="csv")
        self.assertTrue(os.path.exists(output_path + "_1.csv"))

        # test several batches
        await cli._export_customer_bank_data(
            db_pool=self.db_pool, output_path=output_path, max_export_items_per_batch=1
        )
        for i in range(len(self.customers_to_transfer)):
            self.assertTrue(os.path.exists(output_path + f"_{i+1}.xml"))

        await cli._export_customer_bank_data(
            db_pool=self.db_pool, output_path=output_path, data_format="csv", max_export_items_per_batch=1
        )
        for i in range(len(self.customers_to_transfer)):
            self.assertTrue(os.path.exists(output_path + f"_{i+1}.csv"))


if __name__ == "__main__":
    unittest.main()
