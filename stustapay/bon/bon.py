import json
import random
from pathlib import Path

import asyncpg

from stustapay.bon.pdflatex import render_template, pdflatex
from stustapay.core.schema.order import Order
from stustapay.core.service.order.order import fetch_order
from stustapay.core.util import BaseModel


class BonConfig(BaseModel):
    title: str
    issuer: str
    address: str
    ust_id: str
    closing_texts: list[str]


class TaxRateAggregation(BaseModel):
    tax_name: str
    tax_rate: float
    total_price: float
    total_tax: float
    total_no_tax: float


class BonTemplateContext(BaseModel):
    order: Order

    tax_rate_aggregations: list[TaxRateAggregation]

    closing_text: str
    config: BonConfig


async def fetch_base_config(conn: asyncpg.Connection) -> BonConfig:
    title = await conn.fetchval("select value from config where key = 'bon.title'")
    issuer = await conn.fetchval("select value from config where key = 'bon.issuer'")
    address = await conn.fetchval("select value from config where key = 'bon.addr'")
    ust_id = await conn.fetchval("select value from config where key = 'ust_id'")
    closing_texts = json.loads(await conn.fetchval("select value from config where key = 'bon.closing_texts'"))
    return BonConfig(title=title, issuer=issuer, address=address, ust_id=ust_id, closing_texts=closing_texts)


async def render_receipt(context: BonTemplateContext, out_file: Path) -> tuple[bool, str]:
    rendered = await render_template("bon.tex", context=context.dict())
    return await pdflatex(file_content=rendered, out_file=out_file)


async def generate_bon(conn: asyncpg.Connection, config: BonConfig, order_id: int, out_file: Path) -> tuple[bool, str]:
    order = await fetch_order(conn=conn, order_id=order_id)
    if order is None:
        return False, "could not fetch order"

    tax_rate_rows = await conn.fetch(
        "select tax_name, tax_rate, total_price, total_tax, total_no_tax "
        "from order_tax_rates "
        "where id = $1 "
        "order by tax_rate",
        order_id,
    )
    if tax_rate_rows is None or len(tax_rate_rows) == 0:
        return False, "could not fetch aggregated tax rates"

    aggregations = [TaxRateAggregation.parse_obj(row) for row in tax_rate_rows]

    context = BonTemplateContext(
        order=order, config=config, tax_rate_aggregations=aggregations, closing_text=random.choice(config.closing_texts)
    )
    return await render_receipt(context=context, out_file=out_file)
