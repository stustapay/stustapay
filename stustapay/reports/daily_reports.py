from datetime import datetime, timedelta
import pandas as pd
import psycopg2 as psy
from calendar import day_name

from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.bon.bon import BonConfig, gen_dummy_order
from stustapay.core.currency import get_currency_symbol
from stustapay.core.schema.media import Blob
from stustapay.core.schema.order import Order
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.service.media import fetch_blob
from stustapay.core.service.order.stats import (
    Timeseries,
    TimeseriesStatsQuery,
    get_daily_stats,
    get_event_time_bounds,
    get_hourly_sales_stats,
)
from stustapay.core.service.tree.common import fetch_event_design, fetch_event_for_node, fetch_node
from stustapay.reports.render import render_report


class DailyRevenueLineBase(BaseModel):
    order_type: str
    payment_method: str
    no_customers: float
    no_products: float
    total_price: float


class DailyRevenueLineLocation(BaseModel):
    order_type: str
    node_name: str
    payment_method: str
    no_customers: float
    no_products: float
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


async def prep_all_data(conn: Connection, day_starts_at_7: bool = True) -> pd.DataFrame:

    #TODO: Make query work
    query_string = """
            select o.id as order_id, uuid, item_count, booked_at, payment_method, o.z_nr, order_type, cancels_order, cashier_id, o.cash_register_id, till_id, o.customer_account_id, item_id, product_id, product_price, quantity, tax_name, tax_rate, total_price, total_tax, t.name as till_name, t.node_id as till_node_id, p.name as product_name, price_in_vouchers, u.login as cashier_login, u.display_name as cashier_name
            from order_items o
            left join till t on o.till_id = t.id
            left join product p on o.product_id = p.id
            left join usr u on o.cashier_id = u.id
        """
    conn_ = psy.connect(**conn)
    data_all = pd.read_sql_query(query_string, conn_)

    # get weekday (everything before 7AM counts to previous day)
    data_all["weekday"] = data_all["booked_at_cest"].dt.dayofweek
    data_all.loc[data_all["booked_at_cest"].dt.hour < 7, "weekday"] -= 1
    data_all["weekday"] = data_all["weekday"].apply(lambda x: day_name[int(x)])
    data_all["date"] = data_all["booked_at_cest"].dt.normalize()
    if day_starts_at_7:
        data_all.loc[data_all["booked_at_cest"].dt.hour < 7, "date"] -= timedelta(days=1)
    data_all["date"] = data_all["date"].dt.date

    # remove canceled sales
    canceled_orders = pd.unique(data_all[data_all["order_type"] == "cancel_sale"]["cancels_order"])
    data_all = data_all[~(data_all.index.isin(canceled_orders))]
    data_all = data_all[data_all["order_type"] != "cancel_sale"]

    all_relevant_transactions = data_all[
        data_all["order_type"].isin(["sale", "ticket", "top_up", "pay_out", "money_transfer_imbalance"])].copy()

    #TODO: How to add location categories?
    locations_internal = list(ut.location_color_palette_internal.keys())
    locations_external = list(ut.external_dict.keys())

    all_relevant_transactions["sale_type"] = ""
    all_relevant_transactions.loc[
        all_relevant_transactions["node_name"].isin(locations_internal), "sale_type"] = "Verkauf interne Stände"
    all_relevant_transactions.loc[
        all_relevant_transactions["node_name"].isin(locations_external), "sale_type"] = "Verkauf externe Stände"
    all_relevant_transactions.loc[all_relevant_transactions["order_type"] == "ticket", "sale_type"] = "Eintrittsticket"
    all_relevant_transactions.loc[
        all_relevant_transactions["order_type"] == "top_up", "sale_type"] = "Aufladung Guthaben"
    all_relevant_transactions.loc[
        all_relevant_transactions["order_type"] == "pay_out", "sale_type"] = "Auszahlung Guthaben"
    all_relevant_transactions.loc[
        all_relevant_transactions["order_type"] == "money_transfer_imbalance", "sale_type"] = "Fehlbetrag Barkassen"
    all_relevant_transactions.loc[all_relevant_transactions["sale_type"] == "", "sale_type"] = "Verkauf interne Stände"

    return all_relevant_transactions


async def make_daily_table(all_transactions: pd.DataFrame, date: str, break_down_locations: bool = False, break_down_products: bool = False,
                     break_down_payment_methods: bool = False) -> (pd.DataFrame, datetime.date):
    date_obj = datetime.strptime(date, "%Y-%m-%d").date()
    day_transactions = all_transactions[all_transactions["date"] == date_obj].reset_index()

    group_by = ["sale_type"]
    index_names = ["Art"]
    if break_down_locations:
        group_by.append("node_name")
        index_names.append("Stand/Ort")
    if break_down_products:
        group_by.append("product_name")
        index_names.append("Produkt")
    if break_down_payment_methods:
        group_by.append("payment_method")
        index_names.append("Zahlung")

    daily_table = day_transactions.groupby(group_by).agg({
        "order_id": pd.Series.nunique,
        "quantity": lambda x: int(sum(x)),
        "total_price": lambda x: sum(x)
    })
    daily_table.columns = ["Kunden", "Produkte", "Summe"]
    daily_table.index.set_names(index_names, inplace=True)

    return daily_table, date_obj


async def generate_dummy_daily_report(day: str, event: RestrictedEventSettings, logo: Blob | None) -> bytes:
    """Generate a dummy bon for the given event and return the pdf as bytes"""
    fee = 0.01

    ctx = DailyReportContext(
        event_name=event.name,
        render_logo=logo is not None,
        config=BonConfig(
            title=event.bon_title,
            issuer=event.bon_issuer,
            address=event.bon_address,
            ust_id=event.ust_id,
        ),
        orders=[
            OrderWithFees(
                **dummy_order.model_dump(),
                fees=dummy_order.total_price * fee,
                total_price_minus_fees=dummy_order.total_price - dummy_order.total_price * fee,
            )
            for dummy_order in dummy_orders
        ],
        daily_revenue_stats=[
            DailyRevenue(
                day="Monday 2024-10-10",
                revenue=10212,
                fees=10212 * fee,
                revenue_minus_fees=10212 - 10212 * fee,
            ),
            DailyRevenue(
                day="Tuesday 2024-10-11",
                revenue=3000.23,
                fees=3000.23 * fee,
                revenue_minus_fees=3000.23 - 3000.23 * fee,
            ),
        ],
        from_time=datetime.now() - timedelta(days=3),
        to_time=datetime.now(),
        total_revenue=13212.23,
        fees=13212.23 * fee,
        fees_percent=fee,
        revenue_minus_fees=13212.23 - 13212.23 * fee,
        currency_symbol=get_currency_symbol(event.currency_identifier),
    )
    files = {}
    if logo:
        files["logo.svg"] = logo
    return await render_report(template="report", template_context=ctx.model_dump(), files=files)


async def generate_daily_report(conn: Connection, date: str, save_location: str = "", day_starts_at_7: bool = True):
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
        break_down_payment_methods=True
    )

    daily_location_table, _ = await make_daily_table(
        all_relevant_transactions,
        date,
        break_down_locations=True,
        break_down_products=False,
        break_down_payment_methods=True
    )

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
        event_name=event.node_name,
        render_logo=logo is not None,
        config=config,
        lines_base=None,
        lines_location=None,
        from_time=from_time,
        to_time=to_time,
        currency_symbol=get_currency_symbol(event.currency_identifier),
    )
    files = {}
    if logo:
        files["logo.svg"] = logo

    #TODO: Specify save location
    return await render_report(template="daily_totals", template_context=context.model_dump(), files=files)
