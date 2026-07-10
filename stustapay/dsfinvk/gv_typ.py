from decimal import Decimal

from stustapay.core.schema.order import OrderType
from stustapay.core.schema.product import ProductType

ORDERTYPE_TO_KUNDETYP: dict[OrderType, str] = {
    OrderType.top_up: "Kunde",
    OrderType.sale: "Kunde",
    OrderType.cancel_sale: "Kunde",
    OrderType.pay_out: "Kunde",
    OrderType.ticket: "Kunde",
    OrderType.money_transfer: "intern",
    OrderType.money_transfer_imbalance: "intern",
    OrderType.cashier_shift_start: "intern",
    OrderType.cashier_shift_end: "intern",
}


def kundetyp_for_order_type(order_type: str) -> str:
    try:
        return ORDERTYPE_TO_KUNDETYP[OrderType(order_type)]
    except KeyError as exc:
        raise RuntimeError(f"unmapped order type for DSFinV-K KUNDE_TYP: {order_type!r}") from exc


def gv_typ_for_line_item(
    *,
    order_type: str,
    product_type: str,
    is_returnable: bool,
    total_price: Decimal | float,
) -> str:
    if order_type in (OrderType.top_up.value, OrderType.pay_out.value):
        return "MehrzweckgutscheinKauf"
    if order_type == OrderType.money_transfer.value:
        return "Geldtransit"
    if order_type == OrderType.money_transfer_imbalance.value:
        return "DifferenzSollIst"
    if order_type == OrderType.sale.value:
        if is_returnable and total_price > 0:
            return "Pfand"
        if is_returnable and total_price < 0:
            return "PfandRueckzahlung"
        return "MehrzweckgutscheinEinloesung"
    if order_type == OrderType.ticket.value:
        if product_type == ProductType.ticket.value:
            return "Umsatz"
        if product_type == ProductType.topup.value:
            return "MehrzweckgutscheinKauf"
        return "Umsatz"
    raise RuntimeError(f"unmapped order type for DSFinV-K GV_TYP: {order_type!r}")
