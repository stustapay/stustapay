import datetime
import os.path
from pathlib import Path
from tempfile import NamedTemporaryFile

from .common import BaseTestCase
from ..bon.pdflatex import pdflatex
from ..core.schema.order import LineItem, Order
from ..core.schema.product import Product


class BonGeneratorTest(BaseTestCase):
    async def test_pdflatex_bon(self):
        context = {
            "order": Order(
                value_sum=15.9969,
                value_tax=1.7269,
                value_notax=14.27,
                id=1,
                itemcount=3,
                status="done",
                created_at=datetime.datetime(2023, 1, 2, 17, 59, 20, tzinfo=datetime.timezone.utc),
                finished_at=datetime.datetime(2023, 1, 2, 18, 0, 7, tzinfo=datetime.timezone.utc),
                payment_method="token",
                line_items=[
                    LineItem(
                        product_id=0,
                        quantity=2,
                        order_id=1,
                        item_id=0,
                        product=Product(name="Helles 1.0l", price=4.2016806722, tax="ust", id=0),
                        price=4.2016806722,
                        price_brutto=4.999999999918,
                        price_sum=9.999999999836,
                        tax_name="ust",
                        tax_rate=0.19,
                    ),
                    LineItem(
                        product_id=9,
                        quantity=1,
                        order_id=1,
                        item_id=2,
                        product=Product(name="Weißwurst", price=1.8691588785, tax="eust", id=9),
                        price=1.8691588785,
                        price_brutto=1.999999999995,
                        price_sum=1.999999999995,
                        tax_name="eust",
                        tax_rate=0.07,
                    ),
                    LineItem(
                        product_id=10,
                        quantity=2,
                        order_id=1,
                        item_id=1,
                        product=Product(name="Pfand", price=2.00, tax="none", id=10),
                        price=2.00,
                        price_brutto=2.0000,
                        price_sum=4.0000,
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
                    "value_sum": 4.0000,
                    "value_tax": 0.0000,
                    "value_notax": 4.00,
                },
                {
                    "tax_name": "eust",
                    "tax_rate": 0.07,
                    "value_sum": 2.0009,
                    "value_tax": 0.1309,
                    "value_notax": 1.87,
                },
                {
                    "tax_name": "ust",
                    "tax_rate": 0.19,
                    "value_sum": 9.9960,
                    "value_tax": 1.5960,
                    "value_notax": 8.40,
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
