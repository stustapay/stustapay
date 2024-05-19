import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, computed_field

from stustapay.bon.pdflatex import PdfRenderResult, pdflatex, render_template
from stustapay.core.currency import get_currency_symbol
from stustapay.core.schema.order import LineItem, Order, OrderType, PaymentMethod
from stustapay.core.schema.product import Product, ProductType
from stustapay.core.schema.tree import RestrictedEventSettings
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node
from stustapay.framework.database import Connection


class BonConfig(BaseModel):
    title: str
    issuer: str
    address: str
    ust_id: str


class TaxRateAggregation(BaseModel):
    tax_name: str
    tax_rate: float
    total_price: float
    total_tax: float
    total_no_tax: float


class OrderWithTse(Order):
    signature_status: str  # new | pending | done | failure
    transaction_process_type: Optional[str] = None
    transaction_process_data: Optional[str] = None
    tse_transaction: Optional[str] = None
    tse_signaturenr: Optional[str] = None
    tse_start: Optional[str] = None
    tse_end: Optional[str] = None
    tse_hashalgo: Optional[str] = None
    tse_time_format: Optional[str] = None
    tse_signature: Optional[str] = None
    tse_public_key: Optional[str] = None
    node_id: int

    @computed_field  # type: ignore[misc]
    @property
    def tse_qr_code_text(self) -> str:
        return (
            f"V0;{self.till_id};{self.transaction_process_type};{self.transaction_process_data};"
            f"{self.tse_transaction};{self.tse_signaturenr};{self.tse_start};{self.tse_end};{self.tse_hashalgo};"
            f"{self.tse_time_format};{self.tse_signature};{self.tse_public_key}"
        )


class BonTemplateContext(BaseModel):
    order: OrderWithTse

    tax_rate_aggregations: list[TaxRateAggregation]

    config: BonConfig
    currency_symbol: str


async def render_receipt(context: BonTemplateContext):
    rendered = await render_template("bon.tex", context, context.currency_symbol)
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


def gen_dummy_order(node_id: int):
    return OrderWithTse(
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
    )


async def generate_dummy_bon(node_id: int, event: RestrictedEventSettings) -> PdfRenderResult:
    """Generate a dummy bon for the given event and return the pdf as bytes"""
    ctx = BonTemplateContext(
        order=gen_dummy_order(node_id),
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
        currency_symbol=get_currency_symbol(event.currency_identifier),
    )
    return await render_receipt(context=ctx)


async def generate_bon(conn: Connection, order_id: int) -> PdfRenderResult:
    order = await fetch_order(conn=conn, order_id=order_id)
    if order is None:
        return PdfRenderResult(success=False, msg="could not fetch order")

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
        return PdfRenderResult(success=False, msg="could not fetch aggregated tax rates")

    context = BonTemplateContext(
        order=order,
        config=config,
        tax_rate_aggregations=aggregations,
        currency_symbol=get_currency_symbol(event.currency_identifier),
    )
    return await render_receipt(context=context)
