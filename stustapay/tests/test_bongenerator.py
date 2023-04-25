# pylint: disable=attribute-defined-outside-init
import datetime
import os.path
import uuid
from pathlib import Path
from tempfile import NamedTemporaryFile

from stustapay.bon.pdflatex import pdflatex
from stustapay.core.schema.order import LineItem, Order, OrderType
from stustapay.core.schema.product import Product
from .common import BaseTestCase


class BonGeneratorTest(BaseTestCase):
    async def test_pdflatex_bon(self):
        context = {
            "order": Order(
                id=1,
                uuid=uuid.uuid4(),
                total_price=16.00,
                total_tax=1.23,
                total_no_tax=14.77,
                booked_at=datetime.datetime.fromisoformat("2023-04-24T14:46:54.550316"),
                payment_method="nfc tag",
                order_type=OrderType.sale,
                cashier_id=0,
                till_id=0,
                customer_account_id=0,
                line_items=[
                    LineItem(
                        product_id=0,
                        quantity=2,
                        order_id=1,
                        item_id=0,
                        product=Product(
                            name="Helles 1.0l",
                            price=5.00,
                            tax_name="ust",
                            tax_rate=0.19,
                            id=0,
                            fixed_price=True,
                        ),
                        product_price=5.00,
                        total_tax=1.90,
                        total_price=10.0,
                        tax_name="ust",
                        tax_rate=0.19,
                    ),
                    LineItem(
                        product_id=9,
                        quantity=1,
                        order_id=1,
                        item_id=2,
                        product=Product(
                            name="Weißwurst", price=2.0, tax_name="eust", tax_rate=0.07, id=9, fixed_price=True
                        ),
                        product_price=2.0,
                        total_tax=0.14,
                        total_price=2.00,
                        tax_name="eust",
                        tax_rate=0.07,
                    ),
                    LineItem(
                        product_id=10,
                        quantity=2,
                        order_id=1,
                        item_id=1,
                        product=Product(
                            name="Pfand", price=2.00, tax_name="none", tax_rate=0.0, id=10, fixed_price=True
                        ),
                        product_price=2.00,
                        total_tax=0.00,
                        total_price=4.00,
                        tax_name="none",
                        tax_rate=0.00,
                    ),
                ],
            ),
            "tax_rates": [  # The commented lines are returned from the database but are ignored in the bon
                {
                    # "id": 1,
                    # "itemcount": 3,
                    # "status": "done",
                    # "created_at": datetime.datetime(2023, 1, 2, 17, 59, 20, tzinfo=datetime.timezone.utc),
                    # "finished_at": datetime.datetime(2023, 1, 2, 18, 0, 7, tzinfo=datetime.timezone.utc),
                    # "payment_method": "token",
                    # "order_type": None,
                    # "cashier_id": 0,
                    # "terminal_id": 0,
                    # "customer_account_id": 11,
                    "tax_name": "none",
                    "tax_rate": 0.00,
                    "total_price": 4.0000,
                    "total_tax": 0.0000,
                    "total_no_tax": 4.00,
                },
                {
                    "tax_name": "eust",
                    "tax_rate": 0.07,
                    "total_price": 2.00,
                    "total_tax": 0.14,
                    "total_no_tax": 1.86,
                },
                {
                    "tax_name": "ust",
                    "tax_rate": 0.19,
                    "total_price": 10.00,
                    "total_tax": 1.90,
                    "total_no_tax": 8.10,
                },
            ],
            "title": "StuStaPay 学生城 Test Überschrift 2023",
            "issuer": "!§$%&//()=?/*-+#'@€_-µ<>|^¬°²³[\"üäö;,:.",
            "address": "\\Musterstraße\t66\n12345 Musterstädt\n\n\nSTUSTA",
            "ust_id": "DE123456789",
            "funny_text": "\0🍕",
        }

        with NamedTemporaryFile() as file:
            out_file = Path(file.name)
            success, msg = await pdflatex("bon.tex", context, out_file)
            self.assertTrue(success, msg=f"failed to generate pdf with error: {msg}")
            self.assertTrue(os.path.exists(out_file))
