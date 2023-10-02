import json
import random
from pathlib import Path
from typing import Optional

from stustapay.bon.pdflatex import (
    BonConfig,
    BonTemplateContext,
    OrderWithTse,
    TaxRateAggregation,
    pdflatex,
    render_template,
)
from stustapay.framework.database import Connection


async def fetch_base_config(conn: Connection) -> BonConfig:
    title = await conn.fetchval("select value from config where key = 'bon.title'")
    issuer = await conn.fetchval("select value from config where key = 'bon.issuer'")
    address = await conn.fetchval("select value from config where key = 'bon.addr'")
    ust_id = await conn.fetchval("select value from config where key = 'ust_id'")
    closing_texts = json.loads(await conn.fetchval("select value from config where key = 'bon.closing_texts'"))
    return BonConfig(title=title, issuer=issuer, address=address, ust_id=ust_id, closing_texts=closing_texts)


async def render_receipt(context: BonTemplateContext, out_file: Path) -> tuple[bool, str]:
    rendered = await render_template("bon.tex", context)
    return await pdflatex(file_content=rendered, out_file=out_file)


async def fetch_order(*, conn: Connection, order_id: int) -> Optional[OrderWithTse]:
    return await conn.fetch_maybe_one(
        OrderWithTse,
        "select "
        "   o.*, "
        "   sig.*, "
        "   tse.hashalgo as tse_hashalgo, "
        "   tse.time_format as tse_time_format, "
        "   tse.public_key as tse_public_key "
        "from order_value o "
        "join tse_signature sig on sig.id = o.id "
        "join till t on o.till_id = t.id "
        "join tse on tse.id = sig.tse_id "
        "where o.id = $1",
        order_id,
    )


async def generate_bon(conn: Connection, config: BonConfig, order_id: int, out_file: Path) -> tuple[bool, str]:
    order = await fetch_order(conn=conn, order_id=order_id)
    if order is None:
        return False, "could not fetch order"

    aggregations = await conn.fetch_many(
        TaxRateAggregation,
        "select tax_name, tax_rate, total_price, total_tax, total_no_tax "
        "from order_tax_rates "
        "where id = $1 "
        "order by tax_rate",
        order_id,
    )
    if len(aggregations) == 0:
        return False, "could not fetch aggregated tax rates"

    context = BonTemplateContext(
        order=order, config=config, tax_rate_aggregations=aggregations, closing_text=random.choice(config.closing_texts)
    )
    return await render_receipt(context=context, out_file=out_file)
