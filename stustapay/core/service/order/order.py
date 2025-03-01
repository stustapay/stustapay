import logging
from collections import defaultdict
from datetime import datetime, timezone
from typing import Dict, Optional, Set
from uuid import UUID

import asyncpg
from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.error import NotFound
from sftkit.service import Service, with_db_transaction

from stustapay.bon.bon import BonJson
from stustapay.core.config import Config
from stustapay.core.schema.account import (
    Account,
    AccountType,
    get_source_account,
    get_target_account,
)
from stustapay.core.schema.order import (
    CompletedPayOut,
    CompletedSale,
    CompletedSaleBase,
    CompletedSaleProducts,
    CompletedTicketSale,
    CompletedTopUp,
    EditSaleProducts,
    NewPayOut,
    NewSale,
    NewSaleProducts,
    NewTicketSale,
    NewTicketScan,
    NewTopUp,
    Order,
    OrderType,
    PaymentMethod,
    PendingLineItem,
    PendingOrderStatus,
    PendingOrderType,
    PendingPayOut,
    PendingSale,
    PendingSaleBase,
    PendingSaleProducts,
    PendingTicketSale,
    PendingTopUp,
    TicketScanResult,
    TicketScanResultEntry,
)
from stustapay.core.schema.product import Product, ProductRestriction, ProductType
from stustapay.core.schema.terminal import CurrentTerminal
from stustapay.core.schema.ticket import Ticket
from stustapay.core.schema.till import Till
from stustapay.core.schema.tree import Node, RestrictedEventSettings
from stustapay.core.schema.user import CurrentUser, Privilege, User, format_user_tag_uid
from stustapay.core.service.account import (
    get_account_by_id,
    get_system_account_for_node,
)
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from stustapay.core.service.common.error import InvalidArgument, ServiceException
from stustapay.core.service.order.pending_order import (
    fetch_pending_order,
    load_pending_ticket_sale,
    load_pending_topup,
    make_ticket_sale_bookings,
    make_topup_bookings,
    save_pending_ticket_sale,
    save_pending_topup,
)
from stustapay.core.service.order.sumup import SumupService
from stustapay.core.service.product import (
    fetch_discount_product,
    fetch_pay_out_product,
    fetch_product,
    fetch_top_up_product,
)
from stustapay.core.service.till.common import fetch_virtual_till
from stustapay.core.service.transaction import book_transaction
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node

from ..till.register import get_cash_register_account_id
from .booking import BookingIdentifier, NewLineItem, book_order
from .stats import OrderStatsService
from .voucher import VoucherService

logger = logging.getLogger(__name__)


class NotEnoughFundsException(ServiceException):
    """
    The customer has not enough funds on his account to complete the order
    """

    id = "NotEnoughFunds"

    def __init__(self, needed_fund: float, available_fund: float):
        self.needed_fund = needed_fund
        self.available_fund = available_fund

    def __str__(self):
        return f"Not enough funds available:\nNeeded: {self.needed_fund}\nAvailable: {self.available_fund}"


class NotEnoughVouchersException(ServiceException):
    id = "NotEnoughVouchers"
    """
    The customer has not enough vouchers on his account to complete the order
    """

    def __init__(self, used_vouchers: int, available_vouchers: int):
        self.used_vouchers = used_vouchers
        self.available_vouchers = available_vouchers

    def __str__(self):
        return f"Not enough vouchers. Available: {self.available_vouchers}"


class AgeRestrictionException(ServiceException):
    """
    The customer is too young the buy the respective products
    """

    id = "AgeRestriction"

    def __init__(self, product_names: Set[str]):
        self.product_names = product_names

    def __str__(self):
        return f"Too young for product: {', '.join(self.product_names)}"


class TillPermissionException(ServiceException):
    """
    The assigned till profile does not allow this operation
    """

    id = "TillPermission"

    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return self.msg


class InvalidSaleException(ServiceException):
    """
    The sale is invalid
    """

    id = "InvalidSale"

    def __init__(self, msg):
        self.msg = msg

    def __str__(self):
        return self.msg


class CustomerNotFound(ServiceException):
    """
    This customer was not found
    """

    id = "CustomerNotFound"

    def __init__(self, uid: int):
        self.uid = uid

    def __str__(self):
        return f"Customer not found: {format_user_tag_uid(self.uid)}"


class AlreadyProcessedException(ServiceException):
    """
    The order was already processed, since the UUID is booked.
    """

    id = "AlreadyProcessed"

    def __init__(self, msg: str):
        self.msg = msg

    def __str__(self):
        return self.msg


class BookedButton(BaseModel):
    id: int
    quantity: Optional[int] = None
    price: Optional[float] = None
    is_product: bool


class BookedProduct(BaseModel):
    product: Product
    quantity: Optional[int] = None
    price: Optional[float] = None


class InternalNewSale(BaseModel):
    uuid: UUID
    buttons: list[BookedButton]

    customer_tag_uid: Optional[int]
    payment_method: PaymentMethod

    used_vouchers: Optional[int] = None


class InternalPendingSale(PendingSaleBase):
    buttons: list[BookedButton]


class InternalCompletedSale(CompletedSaleBase, PendingSaleBase):
    buttons: list[BookedButton]


async def fetch_order(*, conn: Connection, order_id: int) -> Optional[Order]:
    """
    get all info about an order.
    """
    return await conn.fetch_maybe_one(Order, "select * from order_value where id = $1", order_id)


class OrderService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.voucher_service = VoucherService(db_pool=db_pool, config=config, auth_service=auth_service)
        self.stats = OrderStatsService(db_pool=db_pool, config=config, auth_service=auth_service)
        self.sumup = SumupService(db_pool=db_pool, config=config, auth_service=auth_service)

    @staticmethod
    async def _get_products_from_buttons(
        *,
        conn: Connection,
        till_profile_id: int,
        buttons: list[BookedButton],
    ) -> list[BookedProduct]:
        # TODO: check if the till making this sale has these buttons as part of its layout
        booked_products = []
        for button in buttons:
            if not button.is_product:
                products = await conn.fetch_many(
                    Product,
                    "select p.* from till_button_product tbp "
                    "join product_with_tax_and_restrictions p on tbp.product_id = p.id "
                    "join till_layout_to_button tltp on tltp.button_id = tbp.button_id "
                    "join till_profile tp on tp.layout_id = tltp.layout_id "
                    "where tbp.button_id = $1 and tp.id = $2",
                    button.id,
                    till_profile_id,
                )
            else:
                products = await conn.fetch_many(
                    Product, "select p.* from product_with_tax_and_restrictions p where p.id = $1", button.id
                )
            if len(products) == 0:
                raise InvalidArgument("this till profile is not allowed to use these buttons")

            for product in products:
                if (button.price is None) != product.fixed_price:
                    raise InvalidArgument("cannot book a fixed price product with a variable price")
                if button.quantity is not None and button.quantity < 0 and not product.is_returnable:
                    raise InvalidSaleException(f"Cannot return a non returnable product {product.name}")
                booked_products.append(BookedProduct(product=product, quantity=button.quantity, price=button.price))
        return booked_products

    @staticmethod
    async def _preprocess_order_positions(
        *,
        customer_restrictions: Optional[ProductRestriction],
        booked_products: list[BookedProduct],
    ) -> list[PendingLineItem]:
        # we preprocess positions in a new order to group the resulting line items
        # by product and aggregate their quantity
        line_items_by_product: dict[int, PendingLineItem] = {}
        restricted_product_names: set[str] = set()
        for booked_product in booked_products:
            product = booked_product.product

            if product.id in line_items_by_product:
                current_line_item = line_items_by_product[product.id]
                if current_line_item.product.fixed_price:
                    if booked_product.quantity is None:
                        raise RuntimeError("make the typechecker happy")
                    current_line_item.quantity += booked_product.quantity
                else:
                    if booked_product.price is None:
                        raise RuntimeError("make the typechecker happy")
                    current_line_item.product_price += booked_product.price
            else:
                # check product cost
                if product.fixed_price and booked_product.price:
                    raise InvalidArgument("The line item price was set for a fixed price item")
                # other case (not fixed_price and not item_price) is implicitly checked with the database constraints,
                # pydantic constraints and previous test
                price: float | None = product.price
                if not product.fixed_price:
                    price = booked_product.price
                    booked_product.quantity = 1

                if price is None or booked_product.quantity is None:
                    raise RuntimeError("invalid internal price state, should not happen")

                # check age restriction
                if customer_restrictions is not None and customer_restrictions in product.restrictions:
                    restricted_product_names.add(product.name)

                line_items_by_product[product.id] = PendingLineItem(
                    quantity=booked_product.quantity,
                    product_price=price,
                    tax_rate_id=product.tax_rate_id,
                    tax_rate=product.tax_rate,
                    tax_name=product.tax_name,
                    product=product,
                )

        if len(restricted_product_names) > 0:
            raise AgeRestrictionException(restricted_product_names)

        line_items = list()
        for line_item in line_items_by_product.values():
            if line_item.quantity == 0:
                # quantity_not_zero constraint - skip empty items!
                continue
            line_items.append(line_item)

        return line_items

    @staticmethod
    async def _fetch_customer_by_user_tag(*, conn: Connection, node: Node, customer_tag_uid: int) -> Account:
        customer = await conn.fetch_maybe_one(
            Account,
            "select a.*, t.restriction "
            "from user_tag t join account_with_history a on t.id = a.user_tag_id "
            "where t.uid = $1 and a.type = 'private' and a.node_id = any($2)",
            customer_tag_uid,
            node.ids_to_root,
        )
        if customer is None:
            raise CustomerNotFound(uid=customer_tag_uid)
        return customer

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_topup(
        self,
        *,
        conn: Connection,
        node: Node,
        current_till: Till,
        new_topup: NewTopUp,
    ) -> PendingTopUp:
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=current_till.node_id)
        if new_topup.amount <= 0.0:
            raise InvalidArgument("Only topups with a positive amount are allowed")

        if new_topup.payment_method == PaymentMethod.tag:
            raise InvalidArgument("Cannot pay with tag for top ups")

        can_top_up = await conn.fetchval(
            "select allow_top_up from till_profile where id = $1",
            current_till.active_profile_id,
        )
        if not can_top_up:
            raise TillPermissionException("This terminal is not allowed to top up customers")

        # amount enforcement
        if new_topup.amount < 1.00:
            raise InvalidArgument("Minimum TopUp is 1.00€")

        uuid_exists = await conn.fetchval("select exists(select from ordr where uuid = $1)", new_topup.uuid)
        if uuid_exists:
            # raise AlreadyProcessedException("This order has already been booked (duplicate order uuid)")
            raise AlreadyProcessedException("Successfully booked order")

        customer_account = await self._fetch_customer_by_user_tag(
            conn=conn, node=node, customer_tag_uid=new_topup.customer_tag_uid
        )

        max_limit = event_settings.max_account_balance
        new_balance = customer_account.balance + new_topup.amount
        if new_balance > max_limit:
            too_much = new_balance - max_limit
            raise InvalidArgument(
                f"More than {max_limit:.02f}€ on accounts is disallowed! "
                f"New balance would be {new_balance:.02f}€, which is {too_much:.02f}€ too much."
            )

        return PendingTopUp(
            amount=new_topup.amount,
            customer_tag_uid=new_topup.customer_tag_uid,
            payment_method=new_topup.payment_method,
            uuid=new_topup.uuid,
            customer_account_id=customer_account.id,
            old_balance=customer_account.balance,
            new_balance=new_balance,
        )

    @with_db_transaction(read_only=False)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_topup(
        self,
        *,
        conn: Connection,
        current_terminal: CurrentTerminal,
        current_till: Till,
        node: Node,
        current_user: CurrentUser,
        new_topup: NewTopUp,
        pending: bool = False,
    ) -> CompletedTopUp:
        pending_top_up: PendingTopUp = await self.check_topup(  # pylint: disable=unexpected-keyword-arg,missing-kwoa
            conn=conn,
            node=node,
            current_terminal=current_terminal,
            current_user=current_user,
            new_topup=new_topup,
        )
        if pending and not pending_top_up.payment_method == PaymentMethod.sumup:
            raise InvalidArgument("Only sumup payments can be marked as pending")

        booked_at = datetime.now(tz=timezone.utc)

        if not pending:
            await make_topup_bookings(
                conn=conn,
                current_till=current_till,
                node=node,
                current_user_id=current_user.id,
                top_up=pending_top_up,
                booked_at=booked_at,
            )

        completed_top_up = CompletedTopUp(
            amount=pending_top_up.amount,
            customer_tag_uid=pending_top_up.customer_tag_uid,
            customer_account_id=pending_top_up.customer_account_id,
            payment_method=pending_top_up.payment_method,
            old_balance=pending_top_up.old_balance,
            new_balance=pending_top_up.new_balance,
            uuid=pending_top_up.uuid,
            booked_at=booked_at,
            cashier_id=current_user.id,
            till_id=current_till.id,
        )

        if pending:
            await save_pending_topup(
                conn=conn, node_id=node.id, till_id=current_till.id, cashier_id=current_user.id, topup=completed_top_up
            )

        return completed_top_up

    @with_db_transaction(read_only=False)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_pending_topup(
        self,
        *,
        conn: Connection,
        current_till: Till,
        order_uuid: UUID,
    ) -> CompletedTopUp | None:
        pending_order = await fetch_pending_order(conn=conn, uuid=order_uuid)
        if pending_order.till_id != current_till.id:
            raise InvalidArgument("Cannot check an order for a different till")
        if pending_order.order_type != PendingOrderType.topup:
            raise InvalidArgument("Invalid order uuid")
        if pending_order.status == PendingOrderStatus.booked:
            return load_pending_topup(pending_order)

        topup = await self.sumup.process_pending_order(conn=conn, pending_order=pending_order)
        if topup is None:
            return None
        if isinstance(topup, CompletedTopUp):
            return topup

        logger.warning(
            f"Weird order state for uuid = {order_uuid}. Sumup order was accepted but we have the wrong order type"
        )
        return None

    async def _check_sale(
        self,
        *,
        conn: Connection,
        node: Node,
        event_settings: RestrictedEventSettings,
        till: Till,
        new_sale: InternalNewSale,
    ) -> InternalPendingSale:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        if new_sale.payment_method == PaymentMethod.sumup_online:
            raise InvalidArgument("Cannot pay sales online")

        if new_sale.payment_method == PaymentMethod.tag and new_sale.customer_tag_uid is None:
            raise InvalidArgument("Tag UID required for tag payment")

        if new_sale.payment_method != PaymentMethod.tag and new_sale.customer_tag_uid is not None:
            raise InvalidArgument("Tag UID given for cash or card payment")

        tag_payment = new_sale.payment_method == PaymentMethod.tag

        uuid_exists = await conn.fetchval("select exists(select from ordr where uuid = $1)", new_sale.uuid)
        if uuid_exists:
            # raise AlreadyProcessedException("This order has already been booked (duplicate order uuid)")
            raise AlreadyProcessedException("Successfully booked order")

        customer_account = None
        if tag_payment:
            assert new_sale.customer_tag_uid is not None
            customer_account = await self._fetch_customer_by_user_tag(
                conn=conn, node=node, customer_tag_uid=new_sale.customer_tag_uid
            )

        booked_products = await self._get_products_from_buttons(
            conn=conn, till_profile_id=till.active_profile_id, buttons=new_sale.buttons
        )
        line_items = await self._preprocess_order_positions(
            customer_restrictions=(
                customer_account.restriction if tag_payment and customer_account is not None else None
            ),
            booked_products=booked_products,
        )

        order = InternalPendingSale(
            uuid=new_sale.uuid,
            buttons=new_sale.buttons,
            old_balance=(customer_account.balance if tag_payment and customer_account is not None else 0.0),
            new_balance=(
                customer_account.balance if tag_payment and customer_account is not None else 0.0
            ),  # will be overwritten later on
            old_voucher_balance=(customer_account.vouchers if tag_payment and customer_account is not None else 0),
            new_voucher_balance=(
                customer_account.vouchers if tag_payment and customer_account is not None else 0
            ),  # will be overwritten later on
            line_items=line_items,
            customer_account_id=(customer_account.id if tag_payment and customer_account is not None else None),
            payment_method=new_sale.payment_method,
        )

        if tag_payment:
            assert customer_account is not None
            # if an explicit voucher amount was requested - use that as the maximum.
            vouchers_to_use = customer_account.vouchers
            if new_sale.used_vouchers is not None:
                if new_sale.used_vouchers > customer_account.vouchers:
                    raise NotEnoughVouchersException(
                        used_vouchers=new_sale.used_vouchers, available_vouchers=customer_account.vouchers
                    )
                vouchers_to_use = new_sale.used_vouchers
            discount_product = await fetch_discount_product(conn=conn, node=node)
            voucher_usage = self.voucher_service.compute_optimal_voucher_usage(
                max_vouchers=vouchers_to_use, line_items=order.line_items, discount_product=discount_product
            )

            order.new_voucher_balance = customer_account.vouchers - voucher_usage.used_vouchers
            order.line_items.extend(voucher_usage.additional_line_items)

            if customer_account.balance < order.total_price:
                raise NotEnoughFundsException(needed_fund=order.total_price, available_fund=customer_account.balance)
            order.new_balance = customer_account.balance - order.total_price

            max_limit = event_settings.max_account_balance
            if order.new_balance > max_limit:
                too_much = order.new_balance - max_limit
                raise InvalidArgument(
                    f"More than {max_limit:.02f}€ on accounts is disallowed! "
                    f"New balance would be {order.new_balance:.02f}€, which is {too_much:.02f}€ too much."
                )

            if order.new_balance < 0:
                raise InvalidArgument(
                    f"Account balance would be less than 0€. New balance would be {order.new_balance:.02f}€"
                )

        return order

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_sale(self, *, conn: Connection, current_till: Till, node: Node, new_sale: NewSale) -> PendingSale:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        internal_new_sale = InternalNewSale(
            uuid=new_sale.uuid,
            customer_tag_uid=new_sale.customer_tag_uid,
            payment_method=new_sale.payment_method,
            used_vouchers=new_sale.used_vouchers,
            buttons=[
                BookedButton(
                    id=b.till_button_id,
                    is_product=False,
                    quantity=b.quantity,
                    price=b.price,
                )
                for b in new_sale.buttons
            ],
        )
        pending_sale = await self._check_sale(
            conn=conn, event_settings=event_settings, node=node, till=current_till, new_sale=internal_new_sale
        )
        return PendingSale(
            uuid=pending_sale.uuid,
            old_balance=pending_sale.old_balance,
            new_balance=pending_sale.new_balance,
            old_voucher_balance=pending_sale.old_voucher_balance,
            new_voucher_balance=pending_sale.new_voucher_balance,
            customer_account_id=pending_sale.customer_account_id,
            payment_method=pending_sale.payment_method,
            line_items=pending_sale.line_items,
            buttons=new_sale.buttons,
        )

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_sale_products(
        self,
        *,
        conn: Connection,
        current_till: Till,
        node: Node,
        new_sale: NewSaleProducts,
    ) -> PendingSaleProducts:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        internal_new_sale = InternalNewSale(
            uuid=new_sale.uuid,
            customer_tag_uid=new_sale.customer_tag_uid,
            used_vouchers=new_sale.used_vouchers,
            buttons=[
                BookedButton(
                    id=b.product_id,
                    is_product=True,
                    quantity=b.quantity,
                    price=b.price,
                )
                for b in new_sale.products
            ],
            payment_method=new_sale.payment_method,
        )
        pending_sale = await self._check_sale(
            conn=conn, event_settings=event_settings, node=node, till=current_till, new_sale=internal_new_sale
        )
        return PendingSaleProducts(
            uuid=pending_sale.uuid,
            old_balance=pending_sale.old_balance,
            new_balance=pending_sale.new_balance,
            old_voucher_balance=pending_sale.old_voucher_balance,
            new_voucher_balance=pending_sale.new_voucher_balance,
            customer_account_id=pending_sale.customer_account_id,
            payment_method=pending_sale.payment_method,
            line_items=pending_sale.line_items,
            products=new_sale.products,
        )

    async def _book_sale(
        self,
        *,
        conn: Connection,
        node: Node,
        event_settings: RestrictedEventSettings,
        till: Till,
        current_user: CurrentUser,
        new_sale: InternalNewSale,
    ) -> InternalCompletedSale:
        """
        apply the order after all payment has been settled.
        """
        pending_sale = await self._check_sale(
            conn=conn,
            node=node,
            event_settings=event_settings,
            till=till,
            new_sale=new_sale,
        )

        line_items = [
            NewLineItem(
                quantity=line_item.quantity,
                product_id=line_item.product.id,
                product_price=line_item.product_price,
                tax_rate_id=line_item.tax_rate_id,
            )
            for line_item in pending_sale.line_items
        ]

        cash_entry_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_entry)
        cash_topup_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.cash_topup_source
        )
        sumup_entry_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.sumup_entry)
        sale_exit_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.sale_exit)

        # combine booking based on (source, target) -> amount
        bookings: Dict[BookingIdentifier, float] = defaultdict(lambda: 0.0)
        for line_item in pending_sale.line_items:
            product = line_item.product

            source_acc_id = None
            target_acc_id = None
            if pending_sale.payment_method == PaymentMethod.tag:
                assert pending_sale.customer_account_id is not None
                source_acc_id = get_source_account(OrderType.sale, pending_sale.customer_account_id)
                target_acc_id = get_target_account(OrderType.sale, product, sale_exit_acc.id)
            elif pending_sale.payment_method == PaymentMethod.cash:
                if till.active_cash_register_id is None:
                    raise InvalidArgument("Cash payments require a cash register")
                cash_register_account_id = await get_cash_register_account_id(
                    conn=conn, cash_register_id=till.active_cash_register_id
                )
                bookings[
                    BookingIdentifier(source_account_id=cash_entry_acc.id, target_account_id=cash_register_account_id)
                ] += float(line_item.total_price)
                source_acc_id = get_source_account(OrderType.sale, cash_topup_acc.id)
                target_acc_id = get_target_account(OrderType.sale, product, sale_exit_acc.id)
            elif pending_sale.payment_method == PaymentMethod.sumup:
                source_acc_id = get_source_account(OrderType.sale, sumup_entry_acc.id)
                target_acc_id = get_target_account(OrderType.sale, product, sale_exit_acc.id)

            assert source_acc_id is not None
            assert target_acc_id is not None

            bookings[BookingIdentifier(source_account_id=source_acc_id, target_account_id=target_acc_id)] += float(
                line_item.total_price
            )

        order_info = await book_order(
            conn=conn,
            order_type=OrderType.sale,
            uuid=pending_sale.uuid,
            payment_method=pending_sale.payment_method,
            customer_account_id=pending_sale.customer_account_id,
            cashier_id=current_user.id,
            cash_register_id=current_user.cash_register_id,
            line_items=line_items,
            bookings=bookings,
            till_id=till.id,
        )

        if pending_sale.used_vouchers > 0:
            assert pending_sale.customer_account_id is not None
            await book_transaction(
                conn=conn,
                order_id=order_info.id,
                source_account_id=pending_sale.customer_account_id,
                target_account_id=sale_exit_acc.id,
                voucher_amount=pending_sale.used_vouchers,
            )

        completed_order = InternalCompletedSale(
            buttons=pending_sale.buttons,
            id=order_info.id,
            uuid=order_info.uuid,
            old_balance=pending_sale.old_balance,
            new_balance=pending_sale.new_balance,
            old_voucher_balance=pending_sale.old_voucher_balance,
            new_voucher_balance=pending_sale.new_voucher_balance,
            customer_account_id=pending_sale.customer_account_id,
            payment_method=pending_sale.payment_method,
            line_items=pending_sale.line_items,
            booked_at=order_info.booked_at,
            till_id=till.id,
            cashier_id=current_user.id,
        )

        if completed_order.payment_method == PaymentMethod.tag:
            assert completed_order.customer_account_id is not None
            customer_account_after_booking = await get_account_by_id(
                conn=conn, node=node, account_id=completed_order.customer_account_id
            )
            assert customer_account_after_booking is not None

            # adjust completed order values after real booking in database
            completed_order.new_balance = customer_account_after_booking.balance
            completed_order.new_voucher_balance = customer_account_after_booking.vouchers

        return completed_order

    @with_db_transaction(read_only=False)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_sale(
        self,
        *,
        conn: Connection,
        current_till: Till,
        node: Node,
        current_user: CurrentUser,
        new_sale: NewSale,
    ) -> CompletedSale:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        internal_new_sale = InternalNewSale(
            uuid=new_sale.uuid,
            customer_tag_uid=new_sale.customer_tag_uid,
            payment_method=new_sale.payment_method,
            used_vouchers=new_sale.used_vouchers,
            buttons=[
                BookedButton(
                    id=b.till_button_id,
                    is_product=False,
                    quantity=b.quantity,
                    price=b.price,
                )
                for b in new_sale.buttons
            ],
        )
        completed_sale = await self._book_sale(
            conn=conn,
            event_settings=event_settings,
            node=node,
            till=current_till,
            new_sale=internal_new_sale,
            current_user=current_user,
        )
        bon_url = event_settings.customer_portal_url + "/bon/" + str(completed_sale.uuid)
        return CompletedSale(
            id=completed_sale.id,
            booked_at=completed_sale.booked_at,
            cashier_id=completed_sale.cashier_id,
            till_id=completed_sale.till_id,
            uuid=completed_sale.uuid,
            old_balance=completed_sale.old_balance,
            new_balance=completed_sale.new_balance,
            old_voucher_balance=completed_sale.old_voucher_balance,
            new_voucher_balance=completed_sale.new_voucher_balance,
            customer_account_id=completed_sale.customer_account_id,
            payment_method=completed_sale.payment_method,
            line_items=completed_sale.line_items,
            buttons=new_sale.buttons,
            bon_url=bon_url,
        )

    @with_db_transaction(read_only=False)
    @requires_node()
    @requires_user([Privilege.can_book_orders])
    async def book_sale_products(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        new_sale: NewSaleProducts,
    ) -> CompletedSaleProducts:
        """
        prepare the given order: checks all requirements.
        To finish the order, book_order is used.
        """
        event_settings = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        internal_new_sale = InternalNewSale(
            uuid=new_sale.uuid,
            customer_tag_uid=new_sale.customer_tag_uid,
            used_vouchers=new_sale.used_vouchers,
            buttons=[
                BookedButton(
                    id=b.product_id,
                    is_product=True,
                    quantity=b.quantity,
                    price=b.price,
                )
                for b in new_sale.products
            ],
            payment_method=new_sale.payment_method,
        )
        virtual_till = await fetch_virtual_till(conn=conn, node=node)
        completed_sale = await self._book_sale(
            conn=conn,
            event_settings=event_settings,
            node=node,
            till=virtual_till,
            current_user=current_user,
            new_sale=internal_new_sale,
        )
        return CompletedSaleProducts(
            id=completed_sale.id,
            booked_at=completed_sale.booked_at,
            cashier_id=completed_sale.cashier_id,
            till_id=completed_sale.till_id,
            uuid=completed_sale.uuid,
            old_balance=completed_sale.old_balance,
            new_balance=completed_sale.new_balance,
            old_voucher_balance=completed_sale.old_voucher_balance,
            new_voucher_balance=completed_sale.new_voucher_balance,
            customer_account_id=completed_sale.customer_account_id,
            payment_method=completed_sale.payment_method,
            line_items=completed_sale.line_items,
            products=new_sale.products,
        )

    @with_db_transaction(read_only=False)
    @requires_node()
    @requires_user([Privilege.can_book_orders])
    async def edit_sale_products(
        self,
        *,
        conn: Connection,
        current_user: CurrentUser,
        node: Node,
        order_id: int,
        edit_sale: EditSaleProducts,
    ) -> CompletedSaleProducts:
        order = await fetch_order(conn=conn, order_id=order_id)
        if order is None:
            raise InvalidArgument("Order does not exist")
        virtual_till = await fetch_virtual_till(conn=conn, node=node)
        await self._cancel_sale(conn=conn, current_user=current_user, order_id=order_id, till_id=virtual_till.id)

        assert order.customer_tag_uid is not None

        new_sale = NewSaleProducts(
            products=edit_sale.products,
            uuid=edit_sale.uuid,
            used_vouchers=edit_sale.used_vouchers,
            customer_tag_uid=order.customer_tag_uid,
            payment_method=order.payment_method,
        )

        return await self.book_sale_products(  # pylint: disable=missing-kwoa,unexpected-keyword-arg
            conn=conn,
            node_id=node.id,
            current_user=current_user,
            new_sale=new_sale,
        )

    @staticmethod
    async def _cancel_sale(
        *,
        conn: Connection,
        current_user: CurrentUser,
        till_id: int,
        order_id: int,
    ):
        is_order_cancelled = await conn.fetchval("select true from ordr where cancels_order = $1", order_id)
        if is_order_cancelled:
            raise InvalidArgument("Order has already been cancelled")

        order = await fetch_order(conn=conn, order_id=order_id)
        if order is None:
            raise InvalidArgument("Order does not exist")
        if order.order_type != OrderType.sale:
            raise InvalidArgument("Can only cancel sales")
        if order.payment_method != PaymentMethod.tag:
            raise InvalidArgument("Can only cancel orders payed with a tag")

        line_items = []
        for line_item in order.line_items:
            line_items.append(
                NewLineItem(
                    quantity=-line_item.quantity,
                    product_id=line_item.product.id,
                    tax_rate_id=line_item.tax_rate_id,
                    product_price=line_item.product_price,
                )
            )

        order_info = await book_order(
            conn=conn,
            order_type=OrderType.cancel_sale,
            cashier_id=current_user.id,
            till_id=till_id,
            customer_account_id=order.customer_account_id,
            cancels_order=order.id,
            payment_method=order.payment_method,
            line_items=line_items,
            bookings={},
        )

        transactions = await conn.fetch("select * from transaction where order_id = $1", order.id)
        for transaction in transactions:
            await conn.fetchval(
                "select * from book_transaction("
                "   order_id => $1,"
                "   description => $2,"
                "   source_account_id => $3,"
                "   target_account_id => $4,"
                "   amount => $5,"
                "   vouchers_amount => $6)",
                order_info.id,
                transaction["description"],
                transaction["target_account"],
                transaction["source_account"],
                transaction["amount"],
                transaction["vouchers"],
            )

    @with_db_transaction(read_only=False)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def cancel_sale(self, *, conn: Connection, current_till: Till, current_user: CurrentUser, order_id: int):
        await self._cancel_sale(conn=conn, till_id=current_till.id, current_user=current_user, order_id=order_id)

    @with_db_transaction(read_only=False)
    @requires_node()
    @requires_user([Privilege.can_book_orders])
    async def cancel_sale_admin(self, *, conn: Connection, node: Node, current_user: CurrentUser, order_id: int):
        virtual_till = await fetch_virtual_till(conn=conn, node=node)
        await self._cancel_sale(conn=conn, till_id=virtual_till.id, current_user=current_user, order_id=order_id)

    @with_db_transaction(read_only=False)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_pay_out(
        self, *, conn: Connection, node: Node, current_till: Till, new_pay_out: NewPayOut
    ) -> PendingPayOut:
        if new_pay_out.amount is not None and new_pay_out.amount > 0.0:
            raise InvalidArgument("Only payouts with a negative amount are allowed")

        uuid_exists = await conn.fetchval("select exists(select from ordr where uuid = $1)", new_pay_out.uuid)
        if uuid_exists:
            # raise AlreadyProcessedException("This order has already been booked (duplicate order uuid)")
            raise AlreadyProcessedException("Successfully booked order")

        can_pay_out = await conn.fetchval(
            "select allow_cash_out from till_profile where id = $1", current_till.active_profile_id
        )
        if not can_pay_out:
            raise TillPermissionException("This terminal is not allowed to pay out customers")

        if current_till.active_cash_register_id is None:
            raise InvalidArgument("Cash pay out requires a cash register")

        customer_account = await self._fetch_customer_by_user_tag(
            conn=conn, node=node, customer_tag_uid=new_pay_out.customer_tag_uid
        )

        if new_pay_out.amount is None:
            new_pay_out.amount = -customer_account.balance

        new_balance = customer_account.balance + new_pay_out.amount

        if new_balance < 0:
            raise NotEnoughFundsException(needed_fund=abs(new_pay_out.amount), available_fund=customer_account.balance)

        return PendingPayOut(
            uuid=new_pay_out.uuid,
            amount=new_pay_out.amount,
            customer_tag_uid=new_pay_out.customer_tag_uid,
            customer_account_id=customer_account.id,
            old_balance=customer_account.balance,
            new_balance=new_balance,
        )

    @with_db_transaction(read_only=False)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_pay_out(
        self,
        *,
        conn: Connection,
        current_terminal: CurrentTerminal,
        current_till: Till,
        node: Node,
        current_user: CurrentUser,
        new_pay_out: NewPayOut,
    ) -> CompletedPayOut:
        pending_pay_out: PendingPayOut = await self.check_pay_out(  # pylint: disable=unexpected-keyword-arg,missing-kwoa
            conn=conn,
            node=node,
            current_terminal=current_terminal,
            current_user=current_user,
            new_pay_out=new_pay_out,
        )
        assert current_till.active_cash_register_id is not None
        pay_out_product = await fetch_pay_out_product(conn=conn, node=node)

        line_items = [
            NewLineItem(
                quantity=1,
                product_id=pay_out_product.id,
                product_price=pending_pay_out.amount,
                tax_rate_id=pay_out_product.tax_rate_id,
            )
        ]

        cash_topup_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.cash_topup_source
        )
        cash_exit_acc = await get_system_account_for_node(conn=conn, node=node, account_type=AccountType.cash_exit)

        cash_register_account_id = await get_cash_register_account_id(
            conn=conn, cash_register_id=current_till.active_cash_register_id
        )
        prepared_bookings: Dict[BookingIdentifier, float] = {
            BookingIdentifier(
                source_account_id=pending_pay_out.customer_account_id, target_account_id=cash_topup_acc.id
            ): -pending_pay_out.amount,
            BookingIdentifier(
                source_account_id=cash_register_account_id, target_account_id=cash_exit_acc.id
            ): -pending_pay_out.amount,
        }

        order_info = await book_order(
            conn=conn,
            uuid=pending_pay_out.uuid,
            order_type=OrderType.pay_out,
            cashier_id=current_user.id,
            till_id=current_till.id,
            customer_account_id=pending_pay_out.customer_account_id,
            payment_method=PaymentMethod.cash,
            cash_register_id=current_user.cash_register_id,
            line_items=line_items,
            bookings=prepared_bookings,
        )

        return CompletedPayOut(
            amount=pending_pay_out.amount,
            customer_tag_uid=pending_pay_out.customer_tag_uid,
            customer_account_id=pending_pay_out.customer_account_id,
            old_balance=pending_pay_out.old_balance,
            new_balance=pending_pay_out.new_balance,
            uuid=order_info.uuid,
            booked_at=order_info.booked_at,
            cashier_id=current_user.id,
            till_id=current_till.id,
        )

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_ticket_scan(
        self, *, conn: Connection, node: Node, current_till: Till, new_ticket_scan: NewTicketScan
    ) -> TicketScanResult:
        can_sell_tickets = await conn.fetchval(
            "select allow_ticket_sale from till_profile where id = $1", current_till.active_profile_id
        )
        if not can_sell_tickets:
            raise TillPermissionException("This terminal is not allowed to sell tickets")

        layout_id = await conn.fetchval(
            "select layout_id from till_profile tp where id = $1", current_till.active_profile_id
        )
        customer_pins = list(map(lambda x: x.tag_pin, new_ticket_scan.customer_tags))

        known_tag_ids = await conn.fetch(
            "select u.pin as user_tag_pin "
            "from account a join user_tag u on a.user_tag_id = u.id "
            "where u.pin = any($1) and u.node_id = any($2)",
            customer_pins,
            node.ids_to_root,
        )

        if len(known_tag_ids) > 0:
            formatted_pins = ", ".join(a["user_tag_pin"] for a in known_tag_ids)
            raise InvalidArgument(f"Ticket already has account: {formatted_pins}")

        known_pins = await conn.fetch(
            "select pin from user_tag where pin = any($1)",
            customer_pins,
        )
        if len(known_pins) != len(new_ticket_scan.customer_tags):
            unknown_ids = set(customer_pins) - set(i["pin"] for i in known_pins)
            raise InvalidArgument(f"Unknown Ticket ID: {', '.join(unknown_ids)}")

        scanned_tickets = []
        for customer_tag in new_ticket_scan.customer_tags:
            ticket = await conn.fetch_maybe_one(
                Ticket,
                "select t.* "
                "from ticket t "
                "join till_layout_to_ticket tltt on tltt.ticket_id = t.id "
                "join user_tag ut "
                "   on (ut.restriction = any(t.restrictions) "
                "       or t.restrictions = '{}'::text array and ut.restriction is null) "
                "where tltt.layout_id = $1 and ut.pin = $2",
                layout_id,
                customer_tag.tag_pin,
            )
            if ticket is None:
                raise InvalidArgument("This terminal is not allowed to sell this ticket")
            scanned_tickets.append(
                TicketScanResultEntry(
                    customer_tag_uid=customer_tag.tag_uid, customer_tag_pin=customer_tag.tag_pin, ticket=ticket
                )
            )

        return TicketScanResult(scanned_tickets=scanned_tickets)

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_ticket_sale(
        self,
        *,
        conn: Connection,
        current_terminal: CurrentTerminal,
        current_till: Till,
        node: Node,
        current_user: CurrentUser,
        new_ticket_sale: NewTicketSale,
    ) -> PendingTicketSale:
        uuid_exists = await conn.fetchval("select exists(select from ordr where uuid = $1)", new_ticket_sale.uuid)
        if uuid_exists:
            # raise AlreadyProcessedException("This order has already been booked (duplicate order uuid)")
            raise AlreadyProcessedException("Successfully booked order")

        if new_ticket_sale.payment_method is not None:
            if new_ticket_sale.payment_method == PaymentMethod.tag:
                raise InvalidArgument("Cannot pay with tag for a ticket")

            if new_ticket_sale.payment_method == PaymentMethod.cash:
                cash_register_id = await conn.fetchval(
                    "select t.active_cash_register_id from till t where id = $1", current_till.id
                )
                if cash_register_id is None:
                    raise InvalidArgument("This till needs a cash register for cash payments")

        ticket_scan_result: TicketScanResult = await self.check_ticket_scan(  # pylint: disable=unexpected-keyword-arg,missing-kwoa
            conn=conn,
            node=node,
            current_terminal=current_terminal,
            current_user=current_user,
            new_ticket_scan=NewTicketScan(customer_tags=new_ticket_sale.customer_tags),
        )

        # mapping of product id to pending line item
        ticket_line_items: dict[int, PendingLineItem] = {}

        top_up_product = await fetch_top_up_product(conn=conn, node=node)
        top_up_line_item = PendingLineItem(
            quantity=1,
            product=top_up_product,
            product_price=0,
            tax_name=top_up_product.tax_name,
            tax_rate=top_up_product.tax_rate,
            tax_rate_id=top_up_product.tax_rate_id,
        )

        for ticket_scan in ticket_scan_result.scanned_tickets:
            ticket = ticket_scan.ticket

            # TODO: this should not be necessary, tickets are products but for compatibility
            #  with other code we fetch it again
            ticket_product = await fetch_product(
                conn=conn, node=node, product_id=ticket.id, product_type=ProductType.ticket
            )
            assert ticket_product is not None
            assert ticket_product.price is not None

            if ticket.id in ticket_line_items:
                ticket_line_items[ticket.id].quantity += 1
            else:
                ticket_line_items[ticket.id] = PendingLineItem(
                    quantity=1,
                    product=ticket_product,
                    product_price=ticket.price,
                    tax_name=ticket.tax_name,
                    tax_rate=ticket.tax_rate,
                    tax_rate_id=ticket.tax_rate_id,
                )
            if ticket.initial_top_up_amount > 0:
                # wtf, pylint does not recognise this member
                top_up_line_item.product_price += ticket.initial_top_up_amount  # pylint: disable=no-member

        line_items = list(ticket_line_items.values())
        if top_up_line_item.product_price > 0:  # pylint: disable=no-member
            line_items.append(top_up_line_item)

        return PendingTicketSale(
            uuid=new_ticket_sale.uuid,
            payment_method=new_ticket_sale.payment_method,
            line_items=line_items,
            scanned_tickets=ticket_scan_result.scanned_tickets,
        )

    @with_db_transaction(read_only=False)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def book_ticket_sale(
        self,
        *,
        conn: Connection,
        current_terminal: CurrentTerminal,
        current_till: Till,
        node: Node,
        current_user: CurrentUser,
        new_ticket_sale: NewTicketSale,
        pending: bool = False,
    ) -> CompletedTicketSale:
        if new_ticket_sale.payment_method is None:
            raise InvalidArgument("No payment method provided")

        pending_ticket_sale: PendingTicketSale = await self.check_ticket_sale(  # pylint: disable=unexpected-keyword-arg,missing-kwoa
            conn=conn,
            current_terminal=current_terminal,
            node=node,
            current_user=current_user,
            new_ticket_sale=new_ticket_sale,
        )
        if pending and new_ticket_sale.payment_method != PaymentMethod.sumup:
            raise InvalidArgument("Only sumup payments can be marked as pending")

        booked_at = datetime.now(tz=timezone.utc)
        customer_account_id = None
        if not pending:
            customer_account_id = await make_ticket_sale_bookings(
                conn=conn,
                ticket_sale=pending_ticket_sale,
                booked_at=booked_at,
                current_till=current_till,
                node=node,
                current_user_id=current_user.id,
            )

        completed_ticket_sale = CompletedTicketSale(
            payment_method=pending_ticket_sale.payment_method,
            customer_account_id=customer_account_id,
            line_items=pending_ticket_sale.line_items,
            uuid=pending_ticket_sale.uuid,
            booked_at=booked_at,
            cashier_id=current_user.id,
            scanned_tickets=pending_ticket_sale.scanned_tickets,
            till_id=current_till.id,
        )
        if pending:
            await save_pending_ticket_sale(
                conn=conn,
                node_id=node.id,
                till_id=current_till.id,
                cashier_id=current_user.id,
                ticket_sale=completed_ticket_sale,
            )

        return completed_ticket_sale

    @with_db_transaction(read_only=False)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def check_pending_ticket_sale(
        self,
        *,
        conn: Connection,
        current_till: Till,
        order_uuid: UUID,
    ) -> CompletedTicketSale | None:
        pending_order = await fetch_pending_order(conn=conn, uuid=order_uuid)
        if pending_order.till_id != current_till.id:
            raise InvalidArgument("Cannot check an order for a different till")
        if pending_order.order_type != PendingOrderType.ticket:
            raise InvalidArgument("Invalid order uuid")
        if pending_order.status == PendingOrderStatus.booked:
            return load_pending_ticket_sale(pending_order)
        if pending_order.status == PendingOrderStatus.cancelled:
            return None

        ticket_sale = await self.sumup.process_pending_order(conn=conn, pending_order=pending_order)
        if ticket_sale is None:
            return None
        if isinstance(ticket_sale, CompletedTicketSale):
            return ticket_sale

        logger.warning(
            f"Weird order state for uuid = {order_uuid}. Sumup order was accepted but we have the wrong order type"
        )
        return None

    @with_db_transaction(read_only=True)
    @requires_terminal(user_privileges=[Privilege.can_book_orders])
    async def show_order(self, *, conn: Connection, current_user: User, order_id: int) -> Optional[Order]:
        order = await fetch_order(conn=conn, order_id=order_id)
        if order is not None and order.cashier_id == current_user.id:
            return order
        return None

    @with_db_transaction(read_only=True)
    @requires_terminal([Privilege.can_book_orders])
    async def list_orders_terminal(
        self, *, conn: Connection, current_user: User, current_terminal: CurrentTerminal
    ) -> list[Order]:
        assert current_terminal.till is not None
        return await conn.fetch_many(
            Order,
            "select * from order_value_prefiltered((select array_agg(o.id) from ordr o where o.cashier_id = $1 and o.till_id = $2))",
            current_user.id,
            current_terminal.till.id,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def list_orders(self, *, conn: Connection, customer_account_id: Optional[int] = None) -> list[Order]:
        if customer_account_id is not None:
            return await conn.fetch_many(
                Order,
                "select * from order_value_prefiltered((select array_agg(o.id) from ordr o where customer_account_id = $1))",
                customer_account_id,
            )
        else:
            return await conn.fetch_many(Order, "select * from order_value")

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def list_orders_by_till(self, *, conn: Connection, till_id: int) -> list[Order]:
        return await conn.fetch_many(
            Order,
            "select * from order_value_prefiltered((select array_agg(o.id) from ordr o where till_id = $1))",
            till_id,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_order(self, *, conn: Connection, order_id: int) -> Optional[Order]:
        return await fetch_order(conn=conn, order_id=order_id)

    @with_db_transaction
    async def get_bon_by_uuid(self, *, conn: Connection, order_uuid: str) -> BonJson:
        row = await conn.fetchrow(
            "select b.bon_json from bon b join ordr o on b.id = o.id where o.uuid = $1",
            order_uuid,
        )
        if not row or row["bon_json"] is None:
            raise NotFound(element_type="bon", element_id=order_uuid)

        return BonJson.model_validate_json(row["bon_json"])

    @with_db_transaction
    async def get_bon_by_id(self, *, conn: Connection, order_id: int) -> BonJson:
        row = await conn.fetchrow(
            "select b.bon_json from bon b where b.id = $1",
            order_id,
        )
        if not row or row["bon_json"] is None:
            raise NotFound(element_type="bon", element_id=order_id)

        return BonJson.model_validate_json(row["bon_json"])
