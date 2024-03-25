import enum
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

import asyncpg
from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.product import Product
from stustapay.core.schema.tree import Node, PublicEventSettings
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.tree.common import fetch_event_for_node
from stustapay.framework.database import Connection


class ProductSoldStats(Product):
    quantity_sold: int


class VoucherStats(BaseModel):
    vouchers_issued: int
    vouchers_spent: int


class ProductStats(BaseModel):
    product_quantities: list[ProductSoldStats]
    product_quantities_by_till: dict[int, list[ProductSoldStats]]
    voucher_stats: VoucherStats


class OverviewStats(BaseModel):
    n_transactions: int


class EntryStatInterval(BaseModel):
    from_time: datetime
    to_time: datetime
    n_entries_sold: int


class EntryStats(BaseModel):
    from_time: datetime
    to_time: datetime
    intervals: list[EntryStatInterval]


class IntervalType(enum.Enum):
    daily = "daily"
    hourly = "hourly"


class EntryStatsQuery(BaseModel):
    from_time: Optional[datetime]
    to_time: Optional[datetime]
    interval: IntervalType


async def get_hourly_entry_stats(
    *, conn: Connection, event: PublicEventSettings, node: Node, from_time: datetime | None, to_time: datetime | None
) -> EntryStats:
    from_t = from_time or event.start_date or datetime(year=1970, month=1, day=1)
    to_t = to_time or event.end_date or datetime(year=4000, month=1, day=1)

    res = await conn.fetch(
        "select "
        "   date_trunc('hour', o.booked_at) as interval_start, "
        "   sum(li.quantity) AS value "
        "from ordr o "
        "join till t on o.till_id = t.id "
        "join line_item li on o.id = li.order_id "
        "join product p on li.product_id = p.id "
        "where p.ticket_metadata_id is not null and o.booked_at >= $1 and o.booked_at <= $2 "
        "   and t.node_id = any($3) "
        "group by interval_start "
        "order by interval_start",
        from_t,
        to_t,
        node.ids_to_event_node,
    )
    stats = []
    for row in res:
        stats.append(
            EntryStatInterval(
                from_time=row["interval_start"],
                to_time=row["interval_start"] + timedelta(hours=1),
                n_entries_sold=row["value"],
            )
        )

    return EntryStats(from_time=from_t, to_time=to_t, intervals=stats)


async def get_daily_entry_stats(
    *, conn: Connection, event: PublicEventSettings, node: Node, from_time: datetime | None, to_time: datetime | None
) -> EntryStats:
    if event.daily_end_time is None:
        raise InvalidArgument("daily end time must be set for this event to accurately compute the daily statistics")
    if event.start_date is None or event.end_date is None:
        raise InvalidArgument(
            "event start and end dates must be set for this event to accurately compute the daily statistics"
        )

    hourly_stats = await get_hourly_entry_stats(conn=conn, event=event, node=node, from_time=from_time, to_time=to_time)
    next_day = hourly_stats.from_time.replace(
        day=hourly_stats.from_time.day + 1,
        hour=event.daily_end_time.hour,
        minute=event.daily_end_time.minute,
        second=event.daily_end_time.second,
    )
    stats = []
    current_interval = EntryStatInterval(
        from_time=hourly_stats.from_time,
        to_time=next_day,
        n_entries_sold=0,
    )
    for hourly_stat in hourly_stats.intervals:
        if hourly_stat.from_time > next_day:
            stats.append(current_interval)
            current_interval = EntryStatInterval(
                from_time=next_day,
                to_time=next_day.replace(day=next_day.day + 1),
                n_entries_sold=0,
            )
            next_day = next_day.replace(day=next_day.day + 1)
        current_interval.n_entries_sold += hourly_stat.n_entries_sold
    stats.append(current_interval)
    return EntryStats(from_time=hourly_stats.from_time, to_time=hourly_stats.to_time, intervals=stats)


class OrderStatsService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_overview_stats(
        self, *, conn: Connection, from_timestamp: Optional[datetime], to_timestamp: Optional[datetime]
    ) -> OverviewStats:
        pass

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_entry_stats(self, *, conn: Connection, node: Node, query: EntryStatsQuery) -> EntryStats:
        if node.event_node_id is None:
            raise InvalidArgument("Entry stats can only be computed for nodes within an event")

        if query.from_time is not None and query.to_time is not None and query.from_time > query.to_time:
            raise InvalidArgument("Stats start time must be before end time")

        event = await fetch_event_for_node(conn=conn, node=node)
        if query.interval == IntervalType.hourly:
            return await get_hourly_entry_stats(
                conn=conn, event=event, node=node, from_time=query.from_time, to_time=query.to_time
            )
        elif query.interval == IntervalType.daily:
            return await get_daily_entry_stats(
                conn=conn, event=event, node=node, from_time=query.from_time, to_time=query.to_time
            )
        else:
            raise InvalidArgument("Unknown query interval type")

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_product_stats(
        self, *, conn: Connection, from_timestamp: Optional[datetime], to_timestamp: Optional[datetime]
    ) -> ProductStats:
        stats_by_products = await conn.fetch_many(
            ProductSoldStats,
            "select p.*, coalesce(stats.quantity_sold, 0) as quantity_sold "
            "from product_with_tax_and_restrictions p "
            "join ( "
            "   select s.product_id, sum(s.quantity_sold) as quantity_sold "
            "   from product_stats(from_timestamp => $1, to_timestamp => $2) s"
            "   group by s.product_id "
            ") stats on stats.product_id = p.id "
            "order by stats.quantity_sold desc ",
            from_timestamp,
            to_timestamp,
        )

        stats_by_till = await conn.fetch(
            "select p.*, stats.till_id, stats.quantity_sold "
            "from product_with_tax_and_restrictions p "
            "join product_stats(from_timestamp => $1, to_timestamp => $2) stats on p.id = stats.product_id "
            "order by stats.till_id, stats.quantity_sold desc ",
            from_timestamp,
            to_timestamp,
        )

        voucher_stats_raw = await conn.fetchrow(
            "select * from voucher_stats(from_timestamp => $1, to_timestamp => $2)",
            from_timestamp,
            to_timestamp,
        )

        product_quantities_by_till = defaultdict(list)
        for row in stats_by_till:
            product_quantities_by_till[row["till_id"]].append(ProductSoldStats.model_validate(dict(row)))

        return ProductStats(
            product_quantities=stats_by_products,
            product_quantities_by_till=product_quantities_by_till,
            voucher_stats=VoucherStats(
                vouchers_issued=voucher_stats_raw["vouchers_issued"] or 0,
                vouchers_spent=voucher_stats_raw["vouchers_spent"] or 0,
            ),
        )
