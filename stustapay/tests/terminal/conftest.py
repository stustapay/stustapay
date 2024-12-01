# pylint: disable=redefined-outer-name
import secrets
from dataclasses import dataclass
from typing import Awaitable, Protocol

import pytest
from sftkit.database import Connection

from stustapay.core.schema.account import AccountType
from stustapay.core.schema.terminal import NewTerminal, Terminal
from stustapay.core.schema.till import (
    CashRegister,
    CashRegisterStocking,
    NewCashRegister,
    NewCashRegisterStocking,
    NewTill,
    NewTillLayout,
    NewTillProfile,
    Till,
)
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import (
    ADMIN_ROLE_ID,
    NewUser,
    NewUserRole,
    NewUserToRoles,
    Privilege,
    User,
    UserRole,
    UserTag,
)
from stustapay.core.service.account import AccountService, get_system_account_for_node
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService
from stustapay.core.service.user_tag import get_or_assign_user_tag

from ..conftest import Cashier, CreateRandomUserTag
from ..conftest import UserTag as TestUserTag

START_BALANCE = 100


@pytest.fixture
async def terminal_token(
    terminal_service: TerminalService,
    till_service: TillService,
    till: Till,
    event_admin_token: str,
    event_admin_tag: TestUserTag,
    event_node: Node,
    terminal: Terminal,
) -> str:
    registration = await terminal_service.register_terminal(registration_uuid=terminal.registration_uuid)
    await till_service.update_till(
        token=event_admin_token,
        node_id=event_node.id,
        till_id=till.id,
        till=NewTill(
            name=till.name,
            description=till.description,
            active_shift=till.active_shift,
            active_profile_id=till.active_profile_id,
            terminal_id=terminal.id,
        ),
    )
    await terminal_service.login_user(
        token=registration.token, user_tag=UserTag(uid=event_admin_tag.uid), user_role_id=ADMIN_ROLE_ID
    )
    return registration.token


@pytest.fixture
async def cash_register(till_service: TillService, event_admin_token: str, event_node: Node) -> CashRegister:
    return await till_service.register.create_cash_register(
        node_id=event_node.id, token=event_admin_token, new_register=NewCashRegister(name="Lade")
    )


@pytest.fixture
async def cash_register_stocking(
    till_service: TillService, event_admin_token: str, event_node: Node
) -> CashRegisterStocking:
    return await till_service.register.create_cash_register_stockings(
        node_id=event_node.id,
        token=event_admin_token,
        stocking=NewCashRegisterStocking(name="My fancy stocking"),
    )


class LoginSupervisedUser(Protocol):
    def __call__(self, user_tag_uid: int, user_role_id: int, terminal_token: str = ...) -> Awaitable: ...


@pytest.fixture
async def login_supervised_user(
    terminal_service: TerminalService,
    terminal_token: str,
    event_admin_user,
) -> LoginSupervisedUser:
    async def func(user_tag_uid: int, user_role_id: int, terminal_token: str = terminal_token):
        await terminal_service.logout_user(token=terminal_token)
        await terminal_service.login_user(
            token=terminal_token, user_tag=UserTag(uid=event_admin_user[0].user_tag_uid), user_role_id=ADMIN_ROLE_ID
        )
        await terminal_service.login_user(
            token=terminal_token, user_tag=UserTag(uid=user_tag_uid), user_role_id=user_role_id
        )

    return func


class AssignCashRegister(Protocol):
    def __call__(self, cashier: Cashier) -> Awaitable: ...


@pytest.fixture
async def assign_cash_register(
    cash_register: CashRegister,
    cash_register_stocking: CashRegisterStocking,
    terminal_service: TerminalService,
    till_service: TillService,
    terminal_token: str,
    event_admin_tag: TestUserTag,
) -> AssignCashRegister:
    async def func(cashier: Cashier):
        await terminal_service.login_user(
            token=terminal_token, user_tag=UserTag(uid=event_admin_tag.uid), user_role_id=ADMIN_ROLE_ID
        )
        await till_service.register.stock_up_cash_register(
            token=terminal_token,
            cashier_tag_uid=cashier.user_tag_uid,
            stocking_id=cash_register_stocking.id,
            cash_register_id=cash_register.id,
        )
        return cash_register.account_id

    return func


class GetAccountBalance(Protocol):
    def __call__(self, account_id: int) -> Awaitable[float]: ...


@pytest.fixture
async def get_account_balance(account_service: AccountService, event_node: Node, event_admin_token: str):
    async def func(account_id: int) -> float:
        account = await account_service.get_account(
            token=event_admin_token, node_id=event_node.id, account_id=account_id
        )
        assert account is not None
        return account.balance

    return func


class AssertAccountBalance(Protocol):
    def __call__(self, account_id: int, expected_balance: float) -> Awaitable: ...


@pytest.fixture
async def assert_account_balance(get_account_balance: GetAccountBalance):
    async def func(account_id: int, expected_balance: float):
        balance = await get_account_balance(account_id=account_id)
        assert expected_balance == balance

    return func


class GetSystemAccountBalance(Protocol):
    def __call__(self, account_type: AccountType) -> Awaitable[float]: ...


@pytest.fixture
async def get_system_account_balance(db_connection: Connection, event_node: Node) -> GetSystemAccountBalance:
    async def func(account_type: AccountType):
        account = await get_system_account_for_node(conn=db_connection, node=event_node, account_type=account_type)
        return account.balance

    return func


class AssertSystemAccountBalance(Protocol):
    def __call__(self, account_type: AccountType, expected_balance: float) -> Awaitable: ...


@pytest.fixture
async def assert_system_account_balance(
    get_system_account_balance: GetSystemAccountBalance,
) -> AssertSystemAccountBalance:
    async def func(account_type: AccountType, expected_balance: float):
        balance = await get_system_account_balance(account_type=account_type)
        assert expected_balance == balance

    return func


@dataclass
class Customer:
    tag: TestUserTag
    account_id: int


@pytest.fixture
async def customer(
    create_random_user_tag: CreateRandomUserTag, db_connection: Connection, event_node: Node
) -> Customer:
    customer_tag = await create_random_user_tag()
    user_tag_id = await get_or_assign_user_tag(
        conn=db_connection, node=event_node, uid=customer_tag.uid, pin=customer_tag.pin
    )
    customer_account_id = await db_connection.fetchval(
        "insert into account (node_id, user_tag_id, type, balance) values ($1, $2, 'private', $3) returning id",
        event_node.id,
        user_tag_id,
        START_BALANCE,
    )
    return Customer(tag=customer_tag, account_id=customer_account_id)


class Finanzorga(Cashier):
    transport_account_id: int
    finanzorga_role: UserRole


@pytest.fixture
async def finanzorga(
    user_service: UserService,
    event_node: Node,
    cashier: Cashier,
    event_admin_token: str,
    create_random_user_tag: CreateRandomUserTag,
) -> Finanzorga:
    finanzorga_tag = await create_random_user_tag()
    finanzorga_role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name="finanzorga",
            is_privileged=True,
            privileges=[
                Privilege.node_administration,
                Privilege.terminal_login,
                Privilege.user_management,
                Privilege.grant_free_tickets,
                Privilege.grant_vouchers,
                Privilege.cash_transport,
            ],
        ),
    )
    finanzorga_user: User = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login=f"Finanzorga {secrets.token_hex(16)}",
            description="",
            user_tag_uid=finanzorga_tag.uid,
            user_tag_pin=finanzorga_tag.pin,
            display_name="Finanzorga",
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(
            role_ids=[cashier.cashier_role.id, finanzorga_role.id], user_id=finanzorga_user.id
        ),
    )
    updated_user = await user_service.get_user(
        token=event_admin_token, node_id=event_node.id, user_id=finanzorga_user.id
    )
    assert updated_user is not None
    finanzorga_dump = updated_user.model_dump()
    finanzorga_dump.update(
        {"finanzorga_role": finanzorga_role, "cashier_role": cashier.cashier_role, "token": cashier.token}
    )
    finanzorga = Finanzorga.model_validate(finanzorga_dump)
    return finanzorga


class CreateTerminalToken(Protocol):
    def __call__(self) -> Awaitable[str]: ...


@pytest.fixture
async def create_terminal_token(
    till_service: TillService,
    terminal_service: TerminalService,
    event_admin_tag: TestUserTag,
    event_admin_token: str,
    event_node: Node,
) -> CreateTerminalToken:
    async def func():
        till_layout = await till_service.layout.create_layout(
            token=event_admin_token,
            node_id=event_node.id,
            layout=NewTillLayout(name=secrets.token_hex(16), description="", button_ids=[]),
        )
        till_profile = await till_service.profile.create_profile(
            token=event_admin_token,
            node_id=event_node.id,
            profile=NewTillProfile(
                name=secrets.token_hex(16),
                description="",
                layout_id=till_layout.id,
                allow_top_up=True,
                allow_cash_out=True,
                allow_ticket_sale=True,
                enable_ssp_payment=True,
                enable_cash_payment=False,
                enable_card_payment=False,
            ),
        )
        terminal = await terminal_service.create_terminal(
            token=event_admin_token,
            node_id=event_node.id,
            terminal=NewTerminal(name=secrets.token_hex(16), description=""),
        )
        await till_service.create_till(
            token=event_admin_token,
            node_id=event_node.id,
            till=NewTill(
                name=secrets.token_hex(16),
                active_profile_id=till_profile.id,
                terminal_id=terminal.id,
            ),
        )
        terminal_token = (await terminal_service.register_terminal(registration_uuid=terminal.registration_uuid)).token
        await terminal_service.login_user(
            token=terminal_token, user_tag=UserTag(uid=event_admin_tag.uid), user_role_id=ADMIN_ROLE_ID
        )
        return terminal_token

    return func
