# pylint: disable=attribute-defined-outside-init
import datetime
import uuid

from stustapay.bon.bon import (
    BonConfig,
    BonTemplateContext,
    OrderWithTse,
    TaxRateAggregation,
)
from stustapay.bon.pdflatex import render_template
from stustapay.core.schema.order import LineItem, OrderType, PaymentMethod
from stustapay.core.schema.product import Product, ProductType
from stustapay.core.schema.tree import Node


async def test_pdflatex_bon(event_node: Node):
    context = BonTemplateContext(
        currency_symbol="€",
        order=OrderWithTse(
            id=1,
            node_id=event_node.id,
            uuid=uuid.uuid4(),
            total_price=16.00,
            total_tax=1.23,
            total_no_tax=14.77,
            booked_at=datetime.datetime.fromisoformat("2023-04-24T14:46:54.550316"),
            payment_method=PaymentMethod.tag,
            order_type=OrderType.sale,
            cashier_id=0,
            till_id=0,
            cancels_order=None,
            customer_tag_uid=None,
            customer_tag_id=1032,
            customer_account_id=0,
            signature_status="done",
            line_items=[
                LineItem(
                    quantity=2,
                    item_id=0,
                    product=Product(
                        node_id=event_node.id,
                        name="Helles 1.0l",
                        price=5.00,
                        tax_rate_id=1,
                        tax_name="ust",
                        tax_rate=0.19,
                        id=0,
                        type=ProductType.user_defined,
                        fixed_price=True,
                        is_locked=True,
                        is_returnable=False,
                        restrictions=[],
                    ),
                    product_price=5.00,
                    total_tax=1.90,
                    tax_rate_id=1,
                    tax_name="ust",
                    tax_rate=0.19,
                ),
                LineItem(
                    quantity=1,
                    item_id=2,
                    product=Product(
                        node_id=event_node.id,
                        name="Weißwurst",
                        price=2.0,
                        tax_rate_id=1,
                        tax_name="eust",
                        tax_rate=0.07,
                        id=9,
                        type=ProductType.user_defined,
                        fixed_price=True,
                        is_locked=True,
                        is_returnable=False,
                        restrictions=[],
                    ),
                    product_price=2.0,
                    tax_rate_id=1,
                    total_tax=0.14,
                    tax_name="eust",
                    tax_rate=0.07,
                ),
                LineItem(
                    quantity=2,
                    item_id=1,
                    product=Product(
                        node_id=event_node.id,
                        name="Pfand",
                        price=2.00,
                        tax_rate_id=1,
                        tax_name="none",
                        tax_rate=0.0,
                        id=10,
                        type=ProductType.user_defined,
                        fixed_price=True,
                        is_returnable=False,
                        is_locked=True,
                        restrictions=[],
                    ),
                    product_price=2.00,
                    total_tax=0.00,
                    tax_rate_id=1,
                    tax_name="none",
                    tax_rate=0.00,
                ),
            ],
        ),
        tax_rate_aggregations=[  # The commented lines are returned from the database but are ignored in the bon
            TaxRateAggregation(
                tax_name="none",
                tax_rate=0.00,
                total_price=4.0000,
                total_tax=0.0000,
                total_no_tax=4.00,
            ),
            TaxRateAggregation(
                tax_name="eust",
                tax_rate=0.07,
                total_price=2.00,
                total_tax=0.14,
                total_no_tax=1.86,
            ),
            TaxRateAggregation(
                tax_name="ust",
                tax_rate=0.19,
                total_price=10.00,
                total_tax=1.90,
                total_no_tax=8.10,
            ),
        ],
        config=BonConfig(
            title="StuStaPay 学生城 Test Überschrift 2023",
            issuer="!§$%&//()=?/*-+#'@€_-µ<>|^¬°²³[\"üäö;,:.",
            address="\\Musterstraße\t66\n12345 Musterstädt\n\n\nSTUSTA",
            ust_id="DE123456789",
        ),
    )

    rendered = await render_template("bon.tex", context=context, currency_symbol=context.currency_symbol)
    assert rendered is not None
