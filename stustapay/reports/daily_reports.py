import warnings
from datetime import date, datetime, time, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.bon.bon import BonConfig
from stustapay.core.currency import get_currency_symbol
from stustapay.core.schema.media import Blob
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.media import fetch_blob
from stustapay.core.service.tree.common import fetch_event_design, fetch_event_for_node
from stustapay.reports.render import render_report


class DailyRevenueLineLocation(BaseModel):
    order_type: str
    node_name: str
    payment_method: str
    no_customers: int
    no_products: int
    total_price: float


class TaxLineLocation(BaseModel):
    node_name: str
    tax_rate: float | str
    no_customers: int
    no_products: int
    total_price: float
    total_tax: float
    total_notax: float
    no_cancels: int
    total_cancels: float


class ProductLineLocation(BaseModel):
    node_name: str
    product_name: str
    no_products: int | float
    total_price: float
    tax_rate: float | str
    no_discounted: float
    total_discounted: float


class DailyReportContext(BaseModel):
    event_name: str
    render_logo: bool
    config: BonConfig
    lines_location: list[DailyRevenueLineLocation]
    location_tables: list[tuple[list[TaxLineLocation], list[ProductLineLocation]]]
    from_time: datetime
    to_time: datetime
    min_order_id: int | None
    max_order_id: int | None
    currency_symbol: str


class OrderDaily(BaseModel):
    order_id: int
    booked_at: datetime
    payment_method: str
    order_type: str
    cancels_order: Optional[int]
    quantity: Optional[int]
    total_price: Optional[float]
    tax_rate: Optional[float]
    tax_rate_id: Optional[int]
    total_tax: Optional[float]
    price_in_vouchers: Optional[float]
    product_price: Optional[float]
    node_name: str
    product_name: Optional[str]
    product_type: Optional[str]
    is_cancelled: bool


async def prep_all_data(
    conn: Connection, daily_end_time: time, relevant_node_id: int, relevant_date: date
) -> pd.DataFrame:
    orders = await conn.fetch_many(
        OrderDaily,
        "select o.id as order_id, o.booked_at, o.payment_method, o.order_type, o.cancels_order, o.quantity, "
        "o.total_price, o.tax_rate, o.tax_rate_id, o.total_tax, p.price_in_vouchers, o.product_price, "
        "n.name as node_name, p.name as product_name, p.type as product_type, (oo.id is not null) as is_cancelled "
        "from order_items o "
        "left join till t on o.till_id = t.id "
        "left join product p on o.product_id = p.id "
        "join node n on t.node_id = n.id "
        "left join order_items oo on (o.id = oo.cancels_order) and (o.product_id = oo.product_id) "
        "where ($1=any(n.parents_until_event_node) or n.id=$1) and o.order_type!='cancel_sale'",
        relevant_node_id,
    )

    data_all = pd.DataFrame(
        {
            "order_id": [line.order_id for line in orders],
            "booked_at": [pd.to_datetime(line.booked_at) for line in orders],
            "payment_method": [line.payment_method for line in orders],
            "order_type": [line.order_type for line in orders],
            "cancels_order": [line.cancels_order for line in orders],
            "quantity": [line.quantity for line in orders],
            "total_price": [line.total_price for line in orders],
            "tax_rate": [line.tax_rate for line in orders],
            "tax_rate_id": [line.tax_rate_id for line in orders],
            "total_tax": [line.total_tax for line in orders],
            "price_in_vouchers": [line.price_in_vouchers for line in orders],
            "product_price": [line.product_price for line in orders],
            "node_name": [line.node_name for line in orders],
            "product_name": [line.product_name for line in orders],
            "product_type": [line.product_type for line in orders],
            "is_cancelled": [line.is_cancelled for line in orders],
        }
    )
    data_all["total_notax"] = data_all["total_price"] - data_all["total_tax"]

    # Adjust days based on daily end time
    data_all["date"] = data_all["booked_at"].dt.normalize()
    data_all.loc[data_all["booked_at"].dt.time < daily_end_time, "date"] -= timedelta(days=1)
    data_all["date"] = data_all["date"].dt.date

    all_relevant_transactions = data_all[
        data_all["order_type"].isin(["sale", "ticket", "top_up", "pay_out", "money_transfer_imbalance"])
    ].copy()
    all_relevant_transactions = all_relevant_transactions[
        all_relevant_transactions["date"] == relevant_date
    ].reset_index()

    all_relevant_transactions["sale_type"] = "Sonstige"
    all_relevant_transactions.loc[all_relevant_transactions["product_type"] == "ticket", "sale_type"] = (
        "Eintrittsticket"
    )
    all_relevant_transactions.loc[all_relevant_transactions["product_type"] == "topup", "sale_type"] = (
        "Aufladung Guthaben"
    )
    all_relevant_transactions.loc[all_relevant_transactions["product_type"] == "payout", "sale_type"] = (
        "Auszahlung Guthaben"
    )
    all_relevant_transactions.loc[
        all_relevant_transactions["order_type"] == "money_transfer_imbalance", "sale_type"
    ] = "Fehlbetrag Barkassen"
    all_relevant_transactions.loc[all_relevant_transactions["order_type"] == "sale", "sale_type"] = "Verkauf"

    return all_relevant_transactions


async def make_daily_table(
    all_transactions: pd.DataFrame,
    break_down_products: bool = False,
    break_down_payment_methods: bool = False,
) -> pd.DataFrame:
    group_by = ["sale_type", "node_name"]
    if break_down_products:
        group_by.append("product_name")
    if break_down_payment_methods:
        group_by.append("payment_method")

    daily_table = (
        all_transactions[~all_transactions["is_cancelled"]]
        .groupby(group_by)
        .agg({"order_id": pd.Series.nunique, "quantity": lambda x: int(np.sum(x)), "total_price": "sum"})
        .reset_index()
    )

    return daily_table


async def make_tax_table(
    all_transactions: pd.DataFrame,
) -> pd.DataFrame:
    tax_table = (
        all_transactions[
            (~all_transactions["is_cancelled"]) & (all_transactions["sale_type"].isin(["Verkauf", "Eintrittsticket"]))
        ]
        .groupby("tax_rate_id")
        .agg(
            {
                "tax_rate": "first",
                "order_id": pd.Series.nunique,
                "quantity": lambda x: int(np.sum(x)),
                "total_price": "sum",
                "total_tax": "sum",
                "total_notax": "sum",
            }
        )
        .reset_index()
    )

    cancel_table = (
        all_transactions[
            (all_transactions["is_cancelled"]) & (all_transactions["sale_type"].isin(["Verkauf", "Eintrittsticket"]))
        ]
        .groupby("tax_rate_id")
        .agg({"tax_rate": "first", "order_id": pd.Series.nunique, "total_price": "sum"})
        .reset_index()
    )

    tax_table["no_cancels"] = cancel_table["order_id"]
    tax_table["total_cancels"] = cancel_table["total_price"]
    tax_table["no_cancels"] = tax_table["no_cancels"].fillna(0)
    tax_table["total_cancels"] = tax_table["total_cancels"].fillna(0.0)
    return tax_table


async def make_product_table(
    all_transactions: pd.DataFrame,
) -> pd.DataFrame:
    product_table = (
        all_transactions[
            (~all_transactions["is_cancelled"]) & (all_transactions["sale_type"].isin(["Verkauf", "Eintrittsticket"]))
        ]
        .groupby("product_name")
        .agg(
            {
                "quantity": lambda x: float(np.sum(x)),
                "total_price": "sum",
                "tax_rate": "first",
            }
        )
        .reset_index()
    )
    product_table["total_discounted"] = 0.0
    product_table["no_discounted"] = 0.0

    # remove vouchers from sales statistics
    orders_with_discounts = all_transactions[
        (all_transactions["order_id"].isin(all_transactions[all_transactions["product_name"] == "Rabatt"]["order_id"]))
        & (~all_transactions["is_cancelled"])
    ].copy()
    orders_with_discounts.loc[:, "price_per_voucher"] = (
        orders_with_discounts.loc[:, "product_price"] / orders_with_discounts.loc[:, "price_in_vouchers"]
    )
    for oid in orders_with_discounts.order_id.unique():
        ordr = orders_with_discounts.loc[orders_with_discounts.order_id == oid]
        ordr = ordr.sort_values(by="price_per_voucher", ascending=False).reset_index()

        order_voucher_value = -1 * np.sum(ordr[ordr["product_name"] == "Rabatt"]["total_price"])
        for n in range(len(ordr) - 1):
            current_product_name = ordr.loc[n, "product_name"]
            product_price_per_voucher = ordr.loc[n, "price_per_voucher"]
            if not np.isnan(product_price_per_voucher):
                vouchers_for_product = np.floor(order_voucher_value / product_price_per_voucher)
                discounted_amount_for_product = product_price_per_voucher * vouchers_for_product
                no_products_discounted = discounted_amount_for_product / ordr.loc[n, "product_price"]
                if no_products_discounted > ordr.loc[n, "quantity"]:
                    no_products_discounted = ordr.loc[n, "quantity"]
                    vouchers_for_product = no_products_discounted * ordr.loc[n, "price_in_vouchers"]
                    discounted_amount_for_product = product_price_per_voucher * vouchers_for_product
                order_voucher_value -= discounted_amount_for_product
            else:
                no_products_discounted = 0
                discounted_amount_for_product = 0

            product_table.loc[(product_table["product_name"] == current_product_name), "quantity"] -= (
                no_products_discounted
            )
            product_table.loc[(product_table["product_name"] == current_product_name), "no_discounted"] += (
                no_products_discounted
            )
            product_table.loc[(product_table["product_name"] == current_product_name), "total_price"] -= (
                discounted_amount_for_product
            )
            product_table.loc[(product_table["product_name"] == current_product_name), "total_discounted"] += (
                discounted_amount_for_product
            )

        if order_voucher_value != 0:
            warnings.warn(f"Remaining voucher value not 0! Order_id: {oid}; Remaining balance: {order_voucher_value}")
    product_table = product_table[product_table["product_name"] != "Rabatt"]

    return product_table


async def generate_dummy_daily_report(event: RestrictedEventSettings, logo: Blob | None) -> bytes:
    """Generate a dummy bon for the given event and return the pdf as bytes"""
    ctx = DailyReportContext(
        event_name=event.bon_title,
        render_logo=logo is not None,
        config=BonConfig(
            title=event.bon_title,
            issuer=event.bon_issuer,
            address=event.bon_address,
            ust_id=event.ust_id,
        ),
        from_time=datetime.now() - timedelta(days=3),
        to_time=datetime.now(),
        min_order_id=1,
        max_order_id=9999,
        currency_symbol=get_currency_symbol(event.currency_identifier),
        lines_location=[
            DailyRevenueLineLocation(
                order_type="Ticket",
                node_name="EntryTopup",
                payment_method="Bar",
                no_customers=100,
                no_products=120,
                total_price=10 * 120,
            ),
            DailyRevenueLineLocation(
                order_type="Ticket",
                node_name="EntryTopup",
                payment_method="Karte",
                no_customers=200,
                no_products=210,
                total_price=10 * 210,
            ),
            DailyRevenueLineLocation(
                order_type="Topup",
                node_name="EntryTopup",
                payment_method="Karte",
                no_customers=200,
                no_products=210,
                total_price=17.67 * 210,
            ),
            DailyRevenueLineLocation(
                order_type="Sales",
                node_name="Festzelt",
                payment_method="Tag",
                no_customers=200,
                no_products=350,
                total_price=10475.74 * 2 / 3,
            ),
            DailyRevenueLineLocation(
                order_type="Sales",
                node_name="WBI",
                payment_method="Tag",
                no_customers=120,
                no_products=470,
                total_price=10475.74 * 1 / 3,
            ),
        ],
        location_tables=[],
    )
    files = {}
    if logo:
        files["logo.svg"] = logo
    return await render_report(template="daily_totals", template_context=ctx.model_dump(), files=files)


async def generate_daily_report(conn: Connection, node: Node, report_date: date, relevant_nodes: list[Node]) -> bytes:
    event = await fetch_event_for_node(conn=conn, node=node)
    assert event.daily_end_time is not None
    assert node.event_node_id is not None

    lines_location_table = []
    location_tables = []
    min_order_id = None
    max_order_id = None

    for relevant_node in relevant_nodes:
        lines_tax_table = []
        lines_product_table = []
        all_relevant_transactions = await prep_all_data(
            conn=conn, daily_end_time=event.daily_end_time, relevant_node_id=relevant_node.id, relevant_date=report_date
        )
        daily_location_table = await make_daily_table(
            all_relevant_transactions,
            break_down_products=False,
            break_down_payment_methods=True,
        )

        # Aggregate all sales lines
        agg_location_table = (
            daily_location_table.groupby(["sale_type", "payment_method"])
            .agg(
                {
                    "node_name": "first",
                    "order_id": "sum",
                    "quantity": "sum",
                    "total_price": "sum",
                }
            )
            .reset_index()
        )
        agg_location_table.loc[agg_location_table["sale_type"] == "Verkauf", "node_name"] = relevant_node.name

        for line in agg_location_table.itertuples():
            lines_location_table.append(
                DailyRevenueLineLocation(
                    order_type=line.sale_type,
                    node_name=line.node_name,
                    payment_method=line.payment_method,
                    no_customers=line.order_id,
                    no_products=line.quantity,
                    total_price=line.total_price,
                )
            )

        min_id = min(all_relevant_transactions["order_id"]) if not all_relevant_transactions["order_id"].empty else None
        max_id = max(all_relevant_transactions["order_id"]) if not all_relevant_transactions["order_id"].empty else None
        if min_order_id is None or min_order_id > min_id:
            min_order_id = min_id
        if max_order_id is None or max_order_id < max_id:
            max_order_id = max_id

        tax_table = await make_tax_table(all_relevant_transactions)
        for line in tax_table.itertuples():
            lines_tax_table.append(
                TaxLineLocation(
                    node_name=relevant_node.name,
                    tax_rate=line.tax_rate,
                    no_customers=line.order_id,
                    no_products=line.quantity,
                    total_price=line.total_price,
                    total_tax=line.total_tax,
                    total_notax=line.total_notax,
                    no_cancels=line.no_cancels,
                    total_cancels=line.total_cancels,
                )
            )

        product_table = await make_product_table(all_relevant_transactions)
        for line in product_table.itertuples():
            lines_product_table.append(
                ProductLineLocation(
                    node_name=relevant_node.name,
                    product_name=line.product_name,
                    no_products=line.quantity,
                    total_price=line.total_price,
                    tax_rate=line.tax_rate,
                    no_discounted=line.no_discounted,
                    total_discounted=line.total_discounted,
                )
            )

        lines_tax_table.append(
            TaxLineLocation(
                node_name=relevant_node.name,
                tax_rate="Gesamt",
                no_customers=np.sum(tax_table["order_id"]),
                no_products=np.sum(tax_table["quantity"]),
                total_price=np.sum(tax_table["total_price"]),
                total_tax=np.sum(tax_table["total_tax"]),
                total_notax=np.sum(tax_table["total_notax"]),
                no_cancels=np.sum(tax_table["no_cancels"]),
                total_cancels=np.sum(tax_table["total_cancels"]),
            )
        )
        location_tables.append((lines_tax_table, lines_product_table))

    from_time = datetime.combine(report_date, datetime.min.time()) + (
        datetime.combine(date.min, event.daily_end_time) - datetime.min
    )
    to_time = from_time + timedelta(days=1)

    config = BonConfig(ust_id=event.ust_id, address=event.bon_address, issuer=event.bon_issuer, title=event.bon_title)

    event_design = await fetch_event_design(conn=conn, node_id=node.event_node_id)
    logo = None
    if event_design.bon_logo_blob_id is not None:
        logo = await fetch_blob(conn=conn, blob_id=event_design.bon_logo_blob_id)

    context = DailyReportContext(
        event_name=event.bon_title,
        render_logo=logo is not None,
        config=config,
        lines_location=lines_location_table,
        location_tables=location_tables,
        from_time=from_time,
        to_time=to_time,
        min_order_id=min_order_id,
        max_order_id=max_order_id,
        currency_symbol=get_currency_symbol(event.currency_identifier),
    )
    files = {}
    if logo:
        files["logo.svg"] = logo

    return await render_report(template="daily_totals", template_context=context.model_dump(), files=files)
