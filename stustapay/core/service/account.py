from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.account import Account, AccountType
from stustapay.core.schema.order import OrderType, PaymentMethod
from stustapay.core.schema.customer import Customer
from stustapay.core.schema.order import NewFreeTicketGrant
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user_tag import SwapCustomerTagResponse
from stustapay.core.schema.user import Privilege, User, format_user_tag_uid
from stustapay.core.schema.user_tag_models import UserTagSwapCandidate
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from sftkit.error import InvalidArgument, NotFound
from stustapay.core.service.customer.common import fetch_customer
from stustapay.core.service.transaction import book_transaction
from stustapay.core.service.user_tag import ensure_private_account_creation_allowed


def _get_search_patterns(search_term: str) -> list[str]:
    patterns = []
    for token in search_term.strip().split():
        normalized_token = token.lower()
        if normalized_token.startswith("0x") and len(normalized_token) > 2:
            normalized_token = normalized_token[2:]
        patterns.append(f"%{normalized_token}%")
    return patterns


def _parse_search_uid(search_term: str) -> int | None:
    try:
        return int(search_term.strip())
    except ValueError:
        try:
            return int(search_term.strip().replace("0x", "").replace("0X", ""), 16)
        except ValueError:
            return None


async def _tag_has_previous_association(conn: Connection, user_tag_id: int) -> bool:
    return bool(
        await conn.fetchval(
            "select exists(select from account_tag_association_history where user_tag_id = $1)",
            user_tag_id,
        )
    )


async def _is_reusable_stub_account(conn: Connection, account_id: int) -> bool:
    result = await conn.fetchval(
        """
        select
            a.type = 'private'
            and round(a.balance, 2) = 0
            and a.vouchers = 0
            and not exists(select from ordr where customer_account_id = a.id)
            and not exists(select from payout where customer_account_id = a.id)
            and not exists(select from ticket_voucher where customer_account_id = a.id)
            and not exists(select from customer_session where customer = a.id)
            and not exists(select from usr where customer_account_id = a.id)
            and not exists(select from account_tag_association_history where account_id = a.id)
            and not exists(
                select
                from customer_info ci
                where ci.customer_account_id = a.id
                  and (
                      coalesce(ci.iban, '') != ''
                      or coalesce(ci.account_name, '') != ''
                      or coalesce(ci.email, '') != ''
                      or coalesce(ci.donation, 0) != 0
                      or ci.donate_all
                      or ci.has_entered_info
                      or ci.payout_export = false
                  )
            )
        from account a
        where a.id = $1
        """,
        account_id,
    )
    return bool(result)


async def _move_customer_account_references(
    *,
    conn: Connection,
    source_account_id: int,
    target_account_id: int,
    target_user_tag_id: int,
):
    await conn.execute("delete from customer_info where customer_account_id = $1", target_account_id)
    await conn.execute(
        "update customer_info set customer_account_id = $2 where customer_account_id = $1",
        source_account_id,
        target_account_id,
    )
    await conn.execute(
        "update payout set customer_account_id = $2 where customer_account_id = $1",
        source_account_id,
        target_account_id,
    )
    await conn.execute(
        "update ordr set customer_account_id = $2 where customer_account_id = $1",
        source_account_id,
        target_account_id,
    )
    await conn.execute(
        "update ticket_voucher set customer_account_id = $2 where customer_account_id = $1",
        source_account_id,
        target_account_id,
    )
    await conn.execute(
        "update customer_session set customer = $2 where customer = $1",
        source_account_id,
        target_account_id,
    )
    await conn.execute(
        "update usr set customer_account_id = $2, user_tag_id = $3 where customer_account_id = $1",
        source_account_id,
        target_account_id,
        target_user_tag_id,
    )


async def _search_user_tag_rows(conn: Connection, node: Node, search_term: str):
    search_patterns = _get_search_patterns(search_term)
    search_uid = _parse_search_uid(search_term)

    if search_uid is not None:
        return await conn.fetch(
            """
            select
                ut.id,
                ut.uid,
                ut.pin,
                ut.comment,
                coalesce(ut.account_creation_blocked, false) as account_creation_blocked,
                a.id as account_id,
                a.type as account_type,
                u.id as user_id
            from user_tag ut
            left join account a on a.user_tag_id = ut.id and a.node_id = any($2)
            left join usr u on u.user_tag_id = ut.id
            where ut.node_id = any($2)
              and (
                  ut.uid = $1
                  or not exists (
                      select 1
                      from unnest($3::text[]) as token(pattern)
                      where not (
                          coalesce(ut.pin, '') ilike token.pattern
                          or coalesce(ut.comment, '') ilike token.pattern
                          or coalesce(ut.group_tag, '') ilike token.pattern
                          or (ut.uid is not null and to_hex(ut.uid::bigint) ilike token.pattern)
                      )
                  )
              )
            order by ut.pin asc
            """,
            search_uid,
            node.ids_to_event_node,
            search_patterns,
        )

    return await conn.fetch(
        """
        select
            ut.id,
            ut.uid,
            ut.pin,
            ut.comment,
            coalesce(ut.account_creation_blocked, false) as account_creation_blocked,
            a.id as account_id,
            a.type as account_type,
            u.id as user_id
        from user_tag ut
        left join account a on a.user_tag_id = ut.id and a.node_id = any($1)
        left join usr u on u.user_tag_id = ut.id
        where ut.node_id = any($1)
          and not exists (
              select 1
              from unnest($2::text[]) as token(pattern)
              where not (
                  coalesce(ut.pin, '') ilike token.pattern
                  or coalesce(ut.comment, '') ilike token.pattern
                  or coalesce(ut.group_tag, '') ilike token.pattern
                  or (ut.uid is not null and to_hex(ut.uid::bigint) ilike token.pattern)
              )
          )
        order by ut.pin asc
        """,
        node.ids_to_event_node,
        search_patterns,
    )


async def get_system_account_for_node(*, conn: Connection, node: Node, account_type: AccountType) -> Account:
    return await conn.fetch_one(
        Account,
        "select * from account_with_history where type = $1 and node_id = any($2)",
        account_type.value,
        node.ids_to_event_node,
    )


async def get_account_by_id(*, conn: Connection, node: Node, account_id: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select * from account_with_history where id = $1 and node_id = any($2)",
        account_id,
        node.ids_to_event_node,
    )


async def get_account_by_tag_uid(*, conn: Connection, node: Node, tag_uid: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select * from account_with_history a where user_tag_uid = $1 and node_id = any($2)",
        tag_uid,
        node.ids_to_event_node,
    )


async def get_account_by_tag_id(*, conn: Connection, node: Node, tag_id: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select * from account_with_history a where a.user_tag_id = $1 and node_id = any($2)",
        tag_id,
        node.ids_to_event_node,
    )


async def get_transport_account_by_tag_uid(*, conn: Connection, node: Node, orga_tag_uid: int) -> Optional[Account]:
    return await conn.fetch_maybe_one(
        Account,
        "select a.* "
        "from usr "
        "   join account_with_history a on a.id = usr.transport_account_id "
        "   join user_tag t on usr.user_tag_id = t.id "
        "where t.uid = $1 and usr.node_id = any($2)",
        orga_tag_uid,
        node.ids_to_event_node,
    )


class AccountService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.customer_management])
    async def get_customer(self, *, conn: Connection, node: Node, customer_id: int) -> Customer:
        return await fetch_customer(conn=conn, node=node, customer_id=customer_id)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration, Privilege.customer_management])
    async def find_customers(self, *, conn: Connection, node: Node, search_term: str) -> list[Customer]:
        search_patterns = _get_search_patterns(search_term)
        return await conn.fetch_many(
            Customer,
            "select c.* from customer c "
            "where c.node_id = any($1) and not exists ("
            "   select 1 from unnest($2::text[]) as token(pattern) "
            "   where not ("
            "       coalesce(c.name, '') ilike token.pattern "
            "       or coalesce(c.comment, '') ilike token.pattern "
            "       or coalesce(c.user_tag_pin, '') ilike token.pattern "
            "       or (c.user_tag_uid is not null and to_hex(c.user_tag_uid::bigint) ilike token.pattern) "
            "       or coalesce(c.email, '') ilike token.pattern "
            "       or coalesce(c.account_name, '') ilike token.pattern "
            "       or coalesce(c.iban, '') ilike token.pattern"
            "   )"
            ")",
            node.ids_to_root,
            search_patterns,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def list_system_accounts(self, *, conn: Connection, node: Node) -> list[Account]:
        return await conn.fetch_many(
            Account,
            "select * from account_with_history where type != 'private' and node_id = any($1)",
            node.ids_to_event_node,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_account(self, *, conn: Connection, node: Node, account_id: int) -> Account:
        account = await get_account_by_id(conn=conn, node=node, account_id=account_id)
        if account is None:
            raise NotFound(element_type="account", element_id=str(account_id))
        return account

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def get_account_by_tag_id(self, *, conn: Connection, node: Node, user_tag_id: int) -> Optional[Account]:
        return await get_account_by_tag_id(conn=conn, node=node, tag_id=user_tag_id)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def find_accounts(self, *, conn: Connection, node: Node, search_term: str) -> list[Account]:
        search_patterns = _get_search_patterns(search_term)
        return await conn.fetch_many(
            Account,
            "select * from account_with_history a "
            "where a.node_id = any($1) and not exists ("
            "   select 1 from unnest($2::text[]) as token(pattern) "
            "   where not ("
            "       coalesce(a.name, '') ilike token.pattern "
            "       or coalesce(a.comment, '') ilike token.pattern "
            "       or coalesce(a.user_tag_pin, '') ilike token.pattern "
            "       or (a.user_tag_uid is not null and to_hex(a.user_tag_uid::bigint) ilike token.pattern)"
            "   )"
            ")",
            node.ids_to_root,
            search_patterns,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def find_customer_tag_swap_candidates(
        self, *, conn: Connection, node: Node, search_term: str, mode: str
    ) -> list[UserTagSwapCandidate]:
        if mode not in {"source", "target"}:
            raise InvalidArgument("Invalid tag swap search mode")

        rows = await _search_user_tag_rows(conn=conn, node=node, search_term=search_term)
        candidates: list[UserTagSwapCandidate] = []

        for row in rows:
            account_id = row["account_id"]
            account_type = row["account_type"]
            user_tag_id = row["id"]
            account_creation_blocked = bool(row["account_creation_blocked"])
            user_id = row["user_id"]

            if mode == "source":
                if account_id is None or account_type != AccountType.private.value or user_id is not None:
                    continue
                candidates.append(
                    UserTagSwapCandidate(
                        user_tag_id=user_tag_id,
                        uid=row["uid"],
                        pin=row["pin"],
                        comment=row["comment"],
                        account_id=account_id,
                        account_creation_blocked=account_creation_blocked,
                        target_mode="source",
                    )
                )
                continue

            target_mode = "direct"
            target_reason: str | None = None

            if account_creation_blocked:
                target_mode = "unavailable"
                target_reason = "blocked_from_account_creation"
            elif user_id is not None:
                target_mode = "unavailable"
                target_reason = "tag_assigned_to_user"
            elif await _tag_has_previous_association(conn=conn, user_tag_id=user_tag_id):
                target_mode = "unavailable"
                target_reason = "tag_has_previous_association"
            elif account_id is None:
                target_mode = "direct"
            elif account_type != AccountType.private.value:
                target_mode = "unavailable"
                target_reason = "target_account_is_not_private"
            elif await _is_reusable_stub_account(conn=conn, account_id=account_id):
                target_mode = "reuse_stub"
            else:
                target_mode = "unavailable"
                target_reason = "target_account_in_use"

            candidates.append(
                UserTagSwapCandidate(
                    user_tag_id=user_tag_id,
                    uid=row["uid"],
                    pin=row["pin"],
                    comment=row["comment"],
                    account_id=account_id,
                    account_creation_blocked=account_creation_blocked,
                    target_mode=target_mode,
                    target_reason=target_reason,
                )
            )

        return candidates

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def swap_customer_tag(
        self,
        *,
        conn: Connection,
        current_user: User,
        node: Node,
        source_user_tag_id: int,
        target_user_tag_id: int,
        comment: str,
        block_source_tag: bool,
    ) -> SwapCustomerTagResponse:
        if source_user_tag_id == target_user_tag_id:
            raise InvalidArgument("Source and target tag must differ")

        source_account = await get_account_by_tag_id(conn=conn, node=node, tag_id=source_user_tag_id)
        if source_account is None or source_account.type != AccountType.private:
            raise InvalidArgument("Source tag is not assigned to a private customer account")
        if await conn.fetchval("select exists(select from usr where user_tag_id = $1)", source_user_tag_id):
            raise InvalidArgument("Source tag is assigned to a user")

        target_row = await conn.fetchrow(
            """
            select
                ut.id,
                ut.node_id,
                coalesce(ut.account_creation_blocked, false) as account_creation_blocked,
                a.id as account_id,
                a.type as account_type,
                u.id as user_id
            from user_tag ut
            left join account a on a.user_tag_id = ut.id and a.node_id = any($2)
            left join usr u on u.user_tag_id = ut.id
            where ut.id = $1 and ut.node_id = any($2)
            """,
            target_user_tag_id,
            node.ids_to_event_node,
        )
        if target_row is None:
            raise NotFound(element_type="user_tag", element_id=str(target_user_tag_id))
        if target_row["account_creation_blocked"]:
            raise InvalidArgument("Target tag is blocked from account creation")
        if target_row["user_id"] is not None:
            raise InvalidArgument("Target tag is already assigned to a user")
        if await _tag_has_previous_association(conn=conn, user_tag_id=target_user_tag_id):
            raise InvalidArgument("Target tag has been previously associated with an account")

        target_account_id = target_row["account_id"]
        used_existing_target_account = False

        if target_account_id is None:
            await conn.execute(
                "update account set user_tag_id = $2 where id = $1",
                source_account.id,
                target_user_tag_id,
            )
            active_account_id = source_account.id
        else:
            if target_row["account_type"] != AccountType.private.value:
                raise InvalidArgument("Target tag is assigned to a non-private account")
            if not await _is_reusable_stub_account(conn=conn, account_id=target_account_id):
                raise InvalidArgument("Target tag is already assigned to an in-use account")

            used_existing_target_account = True

            if round(source_account.balance, 2) != 0 or source_account.vouchers != 0:
                await book_transaction(
                    conn=conn,
                    source_account_id=source_account.id,
                    target_account_id=target_account_id,
                    conducting_user_id=current_user.id,
                    amount=source_account.balance,
                    voucher_amount=source_account.vouchers,
                    description="Admin tag swap account migration",
                )

            await _move_customer_account_references(
                conn=conn,
                source_account_id=source_account.id,
                target_account_id=target_account_id,
                target_user_tag_id=target_user_tag_id,
            )
            await conn.execute("update account set user_tag_id = null where id = $1", source_account.id)
            await conn.execute(
                "update account_tag_association_history set account_id = $2 where account_id = $1",
                source_account.id,
                target_account_id,
            )
            active_account_id = target_account_id

        await conn.execute("update user_tag set comment = $2 where id = $1", source_user_tag_id, comment or None)
        if block_source_tag:
            await conn.execute(
                "update user_tag set account_creation_blocked = true where id = $1",
                source_user_tag_id,
            )

        active_customer = await fetch_customer(conn=conn, node=node, customer_id=active_account_id)
        return SwapCustomerTagResponse(
            customer_account_id=active_customer.id,
            used_existing_target_account=used_existing_target_account,
        )

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def disable_account(self, *, conn: Connection, node: Node, account_id: int):
        row = await conn.fetchval(
            "update account set user_tag_id = null where id = $1 and node_id = any($2) returning id",
            account_id,
            node.ids_to_event_node,
        )
        if row is None:
            raise NotFound(element_type="account", element_id=str(account_id))

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def update_account_balance(
        self, *, conn: Connection, current_user: User, account_id: int, new_balance: float
    ) -> bool:
        raise RuntimeError("currently disallowed")

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def update_account_vouchers(
        self, *, conn: Connection, current_user: User, node: Node, account_id: int, new_voucher_amount: int
    ) -> bool:
        account = await self.get_account(  # pylint: disable=unexpected-keyword-arg, missing-kwoa
            conn=conn, node_id=node.id, current_user=current_user, account_id=account_id
        )
        if account is None:
            return False

        voucher_create_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.voucher_create
        )

        imbalance = new_voucher_amount - account.vouchers
        await book_transaction(
            conn=conn,
            description="Admin override for account voucher amount",
            source_account_id=voucher_create_acc.id,
            target_account_id=account.id,
            voucher_amount=imbalance,
            conducting_user_id=current_user.id,
        )
        return True

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def transfer_account_balance(
        self,
        *,
        conn: Connection,
        current_user: User,
        node: Node,
        source_account_id: int,
        target_account_id: int,
        amount: float,
    ) -> bool:
        if source_account_id == target_account_id:
            raise InvalidArgument("Source and target account must differ")
        if amount <= 0:
            raise InvalidArgument("Transfer amount must be positive")

        source_account = await get_account_by_id(conn=conn, node=node, account_id=source_account_id)
        if source_account is None:
            raise NotFound(element_type="account", element_id=str(source_account_id))

        target_account = await get_account_by_id(conn=conn, node=node, account_id=target_account_id)
        if target_account is None:
            raise NotFound(element_type="account", element_id=str(target_account_id))

        if source_account.balance < amount:
            raise InvalidArgument(
                f"Insufficient source account balance. Current balance is {source_account.balance:.2f}."
            )

        from stustapay.core.service.order.booking import BookingIdentifier, NewLineItem, book_order
        from stustapay.core.service.product import fetch_money_transfer_product
        from stustapay.core.service.till.common import fetch_virtual_till

        transfer_product = await fetch_money_transfer_product(conn=conn, node=node)
        virtual_till = await fetch_virtual_till(conn=conn, node=node)

        # Customer detail pages render orders by customer_account_id.
        # Use the private account (source preferred) so the transfer is visible there.
        customer_account_id: int | None = None
        if source_account.type == AccountType.private:
            customer_account_id = source_account.id
        elif target_account.type == AccountType.private:
            customer_account_id = target_account.id

        await book_order(
            conn=conn,
            order_type=OrderType.money_transfer,
            payment_method=PaymentMethod.tag,
            cashier_id=current_user.id,
            till_id=virtual_till.id,
            customer_account_id=customer_account_id,
            line_items=[
                NewLineItem(
                    quantity=1,
                    product_id=transfer_product.id,
                    product_price=amount,
                    tax_rate_id=transfer_product.tax_rate_id,
                )
            ],
            bookings={
                BookingIdentifier(source_account_id=source_account_id, target_account_id=target_account_id): amount
            },
        )
        return True

    @with_db_transaction
    @requires_terminal([Privilege.grant_vouchers])
    async def grant_vouchers(
        self,
        *,
        conn: Connection,
        current_user: User,
        node: Node,
        user_tag_uid: int,
        vouchers: int,
    ) -> Account:
        if vouchers <= 0:
            raise InvalidArgument("voucher amount must be positive")

        account = await get_account_by_tag_uid(conn=conn, node=node, tag_uid=user_tag_uid)
        if account is None:
            raise InvalidArgument(f"Tag {format_user_tag_uid(user_tag_uid)} is not registered")

        voucher_create_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.voucher_create
        )

        try:
            await book_transaction(
                conn=conn,
                description="voucher grant",
                source_account_id=voucher_create_acc.id,
                target_account_id=account.id,
                voucher_amount=vouchers,
                conducting_user_id=current_user.id,
            )
        except Exception as e:  # pylint: disable=bare-except
            raise InvalidArgument(f"Error while granting vouchers {str(e)}") from e

        account = await get_account_by_tag_uid(conn=conn, node=node, tag_uid=user_tag_uid)
        assert account is not None
        return account

    @with_db_transaction
    @requires_terminal([Privilege.grant_free_tickets])
    async def grant_free_tickets(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: User,
        new_free_ticket_grant: NewFreeTicketGrant,
    ) -> Account:
        user_tag = await conn.fetchrow(
            "select true as found, u.id as user_tag_id, a.id as account_id "
            "from user_tag u left join account a on a.user_tag_id = u.id where u.pin = $1 and u.node_id = any($2)",
            new_free_ticket_grant.user_tag_pin,
            node.ids_to_event_node,
        )
        if user_tag is None:
            raise InvalidArgument(f"Tag does not exist {new_free_ticket_grant.user_tag_pin}")

        if user_tag["account_id"] is not None:
            raise InvalidArgument("Tag is already registered")

        # create a new customer account for the given tag
        await ensure_private_account_creation_allowed(conn=conn, user_tag_id=user_tag["user_tag_id"])
        account_id = await conn.fetchval(
            "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private') returning id",
            node.event_node_id,
            user_tag["user_tag_id"],
        )
        await conn.execute(
            "update user_tag set uid = $1 where id = $2", new_free_ticket_grant.user_tag_uid, user_tag["user_tag_id"]
        )

        voucher_create_acc = await get_system_account_for_node(
            conn=conn, node=node, account_type=AccountType.voucher_create
        )

        if new_free_ticket_grant.initial_voucher_amount > 0:
            await book_transaction(
                conn=conn,
                description="Initial voucher amount for volunteer ticket",
                source_account_id=voucher_create_acc.id,
                target_account_id=account_id,
                voucher_amount=new_free_ticket_grant.initial_voucher_amount,
                conducting_user_id=current_user.id,
            )

        account = await get_account_by_id(conn=conn, node=node, account_id=account_id)
        assert account is not None
        return account

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def update_account_comment(self, *, conn: Connection, node: Node, account_id: int, comment: str) -> Account:
        ret = await conn.fetchval(
            "update account set comment = $1 where id = $2 and node_id = any($3) returning id",
            comment,
            account_id,
            node.ids_to_root,
        )
        if ret is None:
            raise NotFound(element_type="account", element_id=account_id)

        acc = await get_account_by_id(conn=conn, node=node, account_id=account_id)
        assert acc is not None
        return acc

    @staticmethod
    async def _switch_account_tag_uid(
        *,
        conn: Connection,
        node: Node,
        old_user_tag_pin: str,
        new_user_tag_pin: str,
        new_user_tag_uid: int,
        comment: Optional[str],
    ):
        row = await conn.fetchrow(
            "select a.id as account_id, u.id as user_tag_id "
            "from account a join user_tag u on a.user_tag_id = u.id "
            "where u.pin = $1 and a.node_id = any($2)",
            old_user_tag_pin,
            node.ids_to_event_node,
        )
        if not row:
            raise NotFound(element_type="user_tag", element_id=old_user_tag_pin)
        account_id, old_user_tag_id = row

        new_user_tag_id = await conn.fetchval(
            "select id from user_tag where pin = $1 and node_id = any($2)", new_user_tag_pin, node.ids_to_root
        )
        if new_user_tag_id is None:
            raise NotFound(element_type="user_tag", element_id=new_user_tag_pin)
        await ensure_private_account_creation_allowed(conn=conn, user_tag_id=new_user_tag_id)

        new_tag_is_registered = await conn.fetchval(
            "select exists(select from account where user_tag_id = $1)", new_user_tag_id
        )
        if new_tag_is_registered:
            raise InvalidArgument("New tag is already activated in the system")

        new_tag_was_used = await conn.fetchval(
            "select exists(select from account_tag_association_history where user_tag_id = $1)", new_user_tag_id
        )
        if new_tag_was_used:
            raise InvalidArgument("New tag has been previously associated with an account")

        await conn.fetchval(
            "update account set user_tag_id = $2 where id = $1 returning id", account_id, new_user_tag_id
        )
        await conn.execute("update user_tag set uid = $2 where id = $1", new_user_tag_id, new_user_tag_uid)
        await conn.execute("update user_tag set comment = $2 where id = $1", old_user_tag_id, comment)

    @with_db_transaction
    @requires_terminal([Privilege.customer_management])
    async def switch_account_tag_uid_terminal(
        self,
        *,
        conn: Connection,
        node: Node,
        old_user_tag_pin: str,
        new_user_tag_pin: str,
        new_user_tag_uid: int,
        comment: Optional[str],
    ):
        await self._switch_account_tag_uid(
            conn=conn,
            node=node,
            old_user_tag_pin=old_user_tag_pin,
            new_user_tag_pin=new_user_tag_pin,
            new_user_tag_uid=new_user_tag_uid,
            comment=comment,
        )

    @staticmethod
    async def _switch_account_tag_uid_by_uid(
        *,
        conn: Connection,
        node: Node,
        old_user_tag_uid: int,
        new_user_tag_uid: int,
        comment: Optional[str],
    ):
        row = await conn.fetchrow(
            "select a.id as account_id, u.id as user_tag_id "
            "from account a join user_tag u on a.user_tag_id = u.id "
            "where u.uid = $1 and a.node_id = any($2)",
            old_user_tag_uid,
            node.ids_to_event_node,
        )
        if not row:
            raise NotFound(element_type="user_tag", element_id=str(old_user_tag_uid))
        account_id, old_user_tag_id = row

        new_user_tag_id = await conn.fetchval(
            "select id from user_tag where uid = $1 and node_id = any($2)", new_user_tag_uid, node.ids_to_root
        )
        if new_user_tag_id is None:
            raise NotFound(element_type="user_tag", element_id=str(new_user_tag_uid))
        await ensure_private_account_creation_allowed(conn=conn, user_tag_id=new_user_tag_id)

        new_tag_is_registered = await conn.fetchval(
            "select exists(select from account where user_tag_id = $1)", new_user_tag_id
        )
        if new_tag_is_registered:
            raise InvalidArgument("New tag is already activated in the system")

        new_tag_was_used = await conn.fetchval(
            "select exists(select from account_tag_association_history where user_tag_id = $1)", new_user_tag_id
        )
        if new_tag_was_used:
            raise InvalidArgument("New tag has been previously associated with an account")

        await conn.fetchval(
            "update account set user_tag_id = $2 where id = $1 returning id", account_id, new_user_tag_id
        )
        await conn.execute("update user_tag set uid = $2 where id = $1", new_user_tag_id, new_user_tag_uid)
        await conn.execute("update user_tag set comment = $2 where id = $1", old_user_tag_id, comment)

    @with_db_transaction
    @requires_terminal([Privilege.customer_management])
    async def switch_account_tag_uid_by_uid(
        self,
        *,
        conn: Connection,
        node: Node,
        old_user_tag_uid: int,
        new_user_tag_uid: int,
        comment: Optional[str],
    ):
        await self._switch_account_tag_uid_by_uid(
            conn=conn,
            node=node,
            old_user_tag_uid=old_user_tag_uid,
            new_user_tag_uid=new_user_tag_uid,
            comment=comment,
        )
