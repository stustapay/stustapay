from datetime import datetime
from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.bon.bon import BonConfig
from stustapay.core.currency import get_currency_symbol
from stustapay.core.service.media import fetch_blob
from stustapay.core.service.tree.common import fetch_event_design, fetch_event_for_node, fetch_node
from stustapay.reports.render import render_report


class PayoutRunForReport(BaseModel):
    set_done_at: datetime
    n_payouts: int
    total_payout_amount: float
    total_donation_amount: float


class RemainingBalances(BaseModel):
    remaining_balances: float | None = 0.


class PayoutReportContext(BaseModel):
    event_name: str
    render_logo: bool
    config: BonConfig
    date: datetime
    payouts: list[PayoutRunForReport]
    remaining_balances: RemainingBalances
    currency_symbol: str


async def generate_payout_report(conn: Connection, year: int) -> bytes:
    node = await fetch_node(conn=conn, node_id=1)
    assert node is not None
    assert node.event_node_id is not None
    event = await fetch_event_for_node(conn=conn, node=node)

    query_string = f"SELECT set_done_at, n_payouts, total_payout_amount, total_donation_amount FROM payout_run_with_stats WHERE created_at > '{year}-01-01' AND done=TRUE ORDER BY set_done_at"
    payouts = await conn.fetch_many(PayoutRunForReport, query_string)

    #TODO: Is node id 1 always correct?
    remaining_balance_query = "SELECT sum(balance) FROM account WHERE node_id=cast(1000 as bigint) AND type='private'"
    remaining_balances = await conn.fetch_one(RemainingBalances, remaining_balance_query)

    config = BonConfig(ust_id=event.ust_id, address=event.bon_address, issuer=event.bon_issuer, title=event.bon_title)

    event_design = await fetch_event_design(conn=conn, node_id=node.event_node_id)
    logo = None
    if event_design.bon_logo_blob_id is not None:
        logo = await fetch_blob(conn=conn, blob_id=event_design.bon_logo_blob_id)

    context = PayoutReportContext(
        event_name=event.bon_title,
        render_logo=logo is not None,
        config=config,
        date=datetime.today().date(),
        payouts=payouts,
        remaining_balances=remaining_balances,
        currency_symbol=get_currency_symbol(event.currency_identifier),
    )
    files = {}
    if logo:
        files["logo.svg"] = logo

    # TODO: Specify save location
    return await render_report(template="payouts", template_context=context.model_dump(), files=files)