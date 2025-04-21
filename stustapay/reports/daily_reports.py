from calendar import day_name
from datetime import datetime, timedelta
from typing import Optional

import numpy as np
import pandas as pd
from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.bon.bon import BonConfig
from stustapay.core.currency import get_currency_symbol
from stustapay.core.schema.media import Blob
from stustapay.core.schema.tree import RestrictedEventSettings
from stustapay.core.service.media import fetch_blob
from stustapay.core.service.tree.common import fetch_event_design, fetch_event_for_node, fetch_node
from stustapay.reports.render import render_report


class DailyRevenueLineBase(BaseModel):
    order_type: str
    payment_method: str
    no_customers: int
    no_products: int
    total_price: float


class DailyRevenueLineLocation(BaseModel):
    order_type: str
    node_name: str
    payment_method: str
    no_customers: int
    no_products: int
    total_price: float


class DailyReportContext(BaseModel):
    event_name: str
    render_logo: bool
    config: BonConfig
    lines_base: list[DailyRevenueLineBase]
    lines_location: list[DailyRevenueLineLocation]
    from_time: datetime
    to_time: datetime
    currency_symbol: str


class OrderDaily(BaseModel):
    order_id: int
    booked_at: datetime
    payment_method: str
    order_type: str
    cancels_order: Optional[int]
    quantity: Optional[int]
    total_price: Optional[float]
    node_name: str
    product_name: Optional[str]


async def prep_all_data(conn: Connection, day_starts_at_7: bool = True) -> pd.DataFrame:
    query_string = """
        select o.id as order_id, booked_at, payment_method, order_type, cancels_order, quantity, total_price, n.name as node_name, p.name as product_name
        from order_items o
        left join till t on o.till_id = t.id
        left join product p on o.product_id = p.id
        left join usr u on o.cashier_id = u.id
        left join node n on t.node_id = n.id
    """
    orders = await conn.fetch_many(OrderDaily, query_string)
    data_all = pd.DataFrame(
        {
            "order_id": [line.order_id for line in orders],
            "booked_at": [pd.to_datetime(line.booked_at) for line in orders],
            "payment_method": [line.payment_method for line in orders],
            "order_type": [line.order_type for line in orders],
            "cancels_order": [line.cancels_order for line in orders],
            "quantity": [line.quantity for line in orders],
            "total_price": [line.total_price for line in orders],
            "node_name": [line.node_name for line in orders],
            "product_name": [line.product_name for line in orders],
        }
    )

    # get weekday (everything before 7AM counts to previous day)
    data_all["weekday"] = data_all["booked_at"].dt.dayofweek
    data_all.loc[data_all["booked_at"].dt.hour < 7, "weekday"] -= 1
    data_all["weekday"] = data_all["weekday"].apply(lambda x: day_name[int(x)])
    data_all["date"] = data_all["booked_at"].dt.normalize()
    # TODO: Get day start/end from tree
    if day_starts_at_7:
        data_all.loc[data_all["booked_at"].dt.hour < 7, "date"] -= timedelta(days=1)
    data_all["date"] = data_all["date"].dt.date

    # remove canceled sales
    canceled_orders = pd.unique(data_all[data_all["order_type"] == "cancel_sale"]["cancels_order"])
    data_all = data_all[~(data_all.index.isin(canceled_orders))]
    data_all = data_all[data_all["order_type"] != "cancel_sale"]

    all_relevant_transactions = data_all[
        data_all["order_type"].isin(["sale", "ticket", "top_up", "pay_out", "money_transfer_imbalance"])
    ].copy()

    # TODO: How to add location categories?
    location_color_palette_internal = {
        "Brotladen": "peru",
        "Cocktailzelt": "darkorchid",
        "Cubalounge": "red",
        "Festzelt": "lightskyblue",
        "Infozelt": "darkgrey",
        "Kade": "gold",
        "Weißbierkarussell": "darkgreen",
        "MKH Ausschank": "darkred",
        "Pfandkasse": "black",
        "Potzelt": "darkorange",
        "Tribühne": "darkred",
        "Turniere": "palegreen",
        "Weinzelt": "pink",
        "Weißbierinsel": "mediumblue",
        # 'StuStaCulum 2024': "orchid",
    }

    external_dict = {
        "Sunny's Churros": "Sunny's Churros",
        "Cheese & Beef": "Cheese & Beef",
        "Mezze Kebap": "Mezze Kebap",
        "Holzofendinnede Abt": "Holzofendinnede",
        "Event Gastronomie Weiß": "Crepes",
        "Kati’s Tolle Knolle": "Kati’s Tolle Knolle",
        "Christian UG": "Fish & Chips",
        "Der Zwerg": "Guaranawein",
        "Ümit Patir": "Kartoffelchips",
        "Ayur Aahar": "Indian Streetfood",
        "Tobias Mörtl": "Kartoffelpuffer",
        "Coni's Schwenkgrill": "Coni's Schwenkgrill",
        "Kreitz": "Pizzabaguette",
    }
    locations_internal = list(location_color_palette_internal.keys())
    locations_external = list(external_dict.keys())

    all_relevant_transactions["sale_type"] = ""
    all_relevant_transactions.loc[all_relevant_transactions["node_name"].isin(locations_internal), "sale_type"] = (
        "Verkauf interne Stände"
    )
    all_relevant_transactions.loc[all_relevant_transactions["node_name"].isin(locations_external), "sale_type"] = (
        "Verkauf externe Stände"
    )
    all_relevant_transactions.loc[all_relevant_transactions["order_type"] == "ticket", "sale_type"] = "Eintrittsticket"
    all_relevant_transactions.loc[all_relevant_transactions["order_type"] == "top_up", "sale_type"] = (
        "Aufladung Guthaben"
    )
    all_relevant_transactions.loc[all_relevant_transactions["order_type"] == "pay_out", "sale_type"] = (
        "Auszahlung Guthaben"
    )
    all_relevant_transactions.loc[
        all_relevant_transactions["order_type"] == "money_transfer_imbalance", "sale_type"
    ] = "Fehlbetrag Barkassen"
    all_relevant_transactions.loc[all_relevant_transactions["sale_type"] == "", "sale_type"] = "Sonstige"

    return all_relevant_transactions


async def make_daily_table(
    all_transactions: pd.DataFrame,
    date: str,
    break_down_locations: bool = False,
    break_down_products: bool = False,
    break_down_payment_methods: bool = False,
) -> (pd.DataFrame, datetime.date):
    date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    day_transactions = all_transactions[all_transactions["date"] == date_obj].reset_index()

    group_by = ["sale_type"]
    if break_down_locations:
        group_by.append("node_name")
    if break_down_products:
        group_by.append("product_name")
    if break_down_payment_methods:
        group_by.append("payment_method")

    daily_table = (
        day_transactions.groupby(group_by)
        .agg({"order_id": pd.Series.nunique, "quantity": lambda x: int(np.sum(x)), "total_price": lambda x: np.sum(x)})
        .reset_index()
    )

    return daily_table, date_obj


async def generate_dummy_daily_report(date: str, event: RestrictedEventSettings, logo: Blob | None) -> bytes:
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
        currency_symbol=get_currency_symbol(event.currency_identifier),
        lines_base=[
            DailyRevenueLineBase(
                order_type="Ticket",
                payment_method="Bar",
                no_customers=100,
                no_products=120,
                total_price=10 * 120,
            ),
            DailyRevenueLineBase(
                order_type="Ticket",
                payment_method="Karte",
                no_customers=200,
                no_products=210,
                total_price=10 * 210,
            ),
            DailyRevenueLineBase(
                order_type="Topup",
                payment_method="Karte",
                no_customers=200,
                no_products=210,
                total_price=17.67 * 210,
            ),
            DailyRevenueLineBase(
                order_type="Sales",
                payment_method="Tag",
                no_customers=320,
                no_products=470,
                total_price=10475.74,
            ),
        ],
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
    )
    files = {}
    if logo:
        files["logo.svg"] = logo
    return await render_report(template="daily_totals", template_context=ctx.model_dump(), files=files)


async def generate_daily_report(conn: Connection, date: str, day_starts_at_7: bool = True) -> bytes:
    node = await fetch_node(conn=conn, node_id=1)
    assert node is not None
    assert node.event_node_id is not None
    event = await fetch_event_for_node(conn=conn, node=node)

    all_relevant_transactions = await prep_all_data(conn=conn, day_starts_at_7=day_starts_at_7)

    daily_base_table, date_obj = await make_daily_table(
        all_relevant_transactions,
        date,
        break_down_locations=False,
        break_down_products=False,
        break_down_payment_methods=True,
    )
    lines_base_table = []
    for line in daily_base_table.itertuples():
        lines_base_table.append(
            DailyRevenueLineBase(
                order_type=line.sale_type,
                payment_method=line.payment_method,
                no_customers=line.order_id,
                no_products=line.quantity,
                total_price=line.total_price,
            )
        )

    daily_location_table, _ = await make_daily_table(
        all_relevant_transactions,
        date,
        break_down_locations=True,
        break_down_products=False,
        break_down_payment_methods=True,
    )
    lines_location_table = []
    for line in daily_location_table.itertuples():
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

    # TODO: Get day start/end from tree
    if day_starts_at_7:
        from_time = datetime.combine(date_obj, datetime.min.time()) + timedelta(hours=7)
        to_time = datetime.combine(date_obj, datetime.min.time()) + timedelta(days=1, hours=7)
    else:
        from_time = date_obj
        to_time = date_obj + timedelta(days=1)

    config = BonConfig(ust_id=event.ust_id, address=event.bon_address, issuer=event.bon_issuer, title=event.bon_title)

    event_design = await fetch_event_design(conn=conn, node_id=node.event_node_id)
    logo = None
    if event_design.bon_logo_blob_id is not None:
        logo = await fetch_blob(conn=conn, blob_id=event_design.bon_logo_blob_id)

    context = DailyReportContext(
        event_name=event.bon_title,
        render_logo=logo is not None,
        config=config,
        lines_base=lines_base_table,
        lines_location=lines_location_table,
        from_time=from_time,
        to_time=to_time,
        currency_symbol=get_currency_symbol(event.currency_identifier),
    )
    files = {}
    if logo:
        files["logo.svg"] = logo

    # TODO: Specify save location
    return await render_report(template="daily_totals", template_context=context.model_dump(), files=files)
