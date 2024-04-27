import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from stustapay.bon.pdflatex import (
    BonConfig,
    BonRenderResult,
    BonTemplateContext,
    OrderWithTse,
    TaxRateAggregation,
    pdflatex,
    render_template,
)
from stustapay.core.schema.order import LineItem, OrderType, PaymentMethod
from stustapay.core.schema.product import Product, ProductType
from stustapay.core.schema.tree import RestrictedEventSettings
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node
from stustapay.framework.database import Connection


async def render_receipt(context: BonTemplateContext):
    rendered = await render_template("bon.tex", context)
    return await pdflatex(file_content=rendered)


async def fetch_order(*, conn: Connection, order_id: int) -> Optional[OrderWithTse]:
    return await conn.fetch_maybe_one(
        OrderWithTse,
        "select "
        "   o.*, "
        "   sig.*, "
        "   tse.hashalgo as tse_hashalgo, "
        "   tse.time_format as tse_time_format, "
        "   tse.public_key as tse_public_key, "
        "   t.node_id as node_id "
        "from order_value o "
        "join tse_signature sig on sig.id = o.id "
        "join till t on o.till_id = t.id "
        "join tse on tse.id = sig.tse_id "
        "where o.id = $1",
        order_id,
    )


@dataclass
class DummyBon:
    pdf: bytes | None
    error: str | None


async def generate_dummy_bon(node_id: int, event: RestrictedEventSettings) -> BonRenderResult:
    """Generate a dummy bon for the given event and return the pdf as bytes"""
    ctx = BonTemplateContext(
        order=OrderWithTse(
            id=1,
            node_id=node_id,
            uuid=uuid.uuid4(),
            total_price=16.00,
            total_tax=1.23,
            total_no_tax=14.77,
            booked_at=datetime.fromisoformat("2023-04-24T14:46:54.550316"),
            payment_method=PaymentMethod.tag,
            order_type=OrderType.sale,
            cashier_id=0,
            till_id=0,
            cancels_order=None,
            customer_tag_id=None,
            customer_tag_uid=None,
            customer_account_id=0,
            signature_status="done",
            line_items=[
                LineItem(
                    quantity=2,
                    item_id=0,
                    product=Product(
                        node_id=node_id,
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
                        node_id=node_id,
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
                        node_id=node_id,
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
        tax_rate_aggregations=[
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
            title=event.bon_title,
            issuer=event.bon_issuer,
            address=event.bon_address,
            ust_id=event.ust_id,
        ),
    )
    return await render_receipt(context=ctx)


async def generate_bon(conn: Connection, order_id: int) -> BonRenderResult:
    order = await fetch_order(conn=conn, order_id=order_id)
    if order is None:
        return BonRenderResult(success=False, msg="could not fetch order")

    event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=order.node_id)
    config = BonConfig(ust_id=event.ust_id, address=event.bon_address, issuer=event.bon_issuer, title=event.bon_title)

    aggregations = await conn.fetch_many(
        TaxRateAggregation,
        "select tax_name, tax_rate, total_price, total_tax, total_no_tax "
        "from order_tax_rates "
        "where id = $1 "
        "order by tax_rate",
        order_id,
    )
    if len(aggregations) == 0:
        return BonRenderResult(success=False, msg="could not fetch aggregated tax rates")

    context = BonTemplateContext(order=order, config=config, tax_rate_aggregations=aggregations)
    return await render_receipt(context=context)
