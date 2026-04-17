from collections import namedtuple

from sftkit.database import Connection

from stustapay.core.schema.terminal import NewTerminal
from stustapay.core.schema.till import CashRegister, CashRegisterStocking, NewTill, NewTillProfile, Till, TillProfile
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import NewUser, NewUserToRoles
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.till.till import TillService
from stustapay.core.service.user import UserService
from stustapay.tests.conftest import Cashier, CreateRandomUserTag
from stustapay.tests.terminal.conftest import LoginSupervisedUser

CashRegisterInfo = namedtuple("CashRegisterInfo", ("id", "balance"))


async def get_cash_register_for_cashier(db_connection: Connection, user_id: int) -> CashRegisterInfo | None:
    row = await db_connection.fetchrow(
        "select cr.id, cr.balance from cash_register_with_cashier cr where cr.current_cashier_id = $1",
        user_id,
    )
    if row is None:
        return None
    return CashRegisterInfo(row["id"], row["balance"])


async def get_active_till_for_cash_register(db_connection: Connection, cash_register_id: int) -> int | None:
    return await db_connection.fetchval("select id from till where active_cash_register_id = $1", cash_register_id)


async def enable_cash_payments_for_profile(
    till_service: TillService,
    event_admin_token: str,
    event_node: Node,
    till_profile: TillProfile,
):
    updated_profile = await till_service.profile.update_profile(
        token=event_admin_token,
        node_id=event_node.id,
        profile_id=till_profile.id,
        profile=NewTillProfile(
            name=till_profile.name,
            description=till_profile.description,
            layout_id=till_profile.layout_id,
            allow_top_up=till_profile.allow_top_up,
            allow_cash_out=till_profile.allow_cash_out,
            allow_ticket_sale=till_profile.allow_ticket_sale,
            allow_ticket_vouchers=till_profile.allow_ticket_vouchers,
            enable_ssp_payment=till_profile.enable_ssp_payment,
            enable_cash_payment=True,
            enable_card_payment=till_profile.enable_card_payment,
        ),
    )
    assert updated_profile is not None


async def create_registered_terminal_with_till(
    terminal_service: TerminalService,
    till_service: TillService,
    event_admin_token: str,
    event_node: Node,
    till_profile_id: int,
    name: str,
) -> tuple[Till, str]:
    terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name=f"{name}-terminal", description=""),
    )
    till = await till_service.create_till(
        token=event_admin_token,
        node_id=event_node.id,
        till=NewTill(name=f"{name}-till", active_profile_id=till_profile_id, terminal_id=terminal.id),
    )
    registration = await terminal_service.register_terminal(registration_uuid=terminal.registration_uuid)
    return till, registration.token


async def test_transfer_cash_register(
    db_connection: Connection,
    till_service: TillService,
    user_service: UserService,
    cashier: Cashier,
    event_admin_token: str,
    event_node: Node,
    cash_register: CashRegister,
    cash_register_stocking: CashRegisterStocking,
    terminal_token: str,
    till: Till,
    till_profile: TillProfile,
    login_supervised_user: LoginSupervisedUser,
    create_random_user_tag: CreateRandomUserTag,
):
    await enable_cash_payments_for_profile(
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
        till_profile=till_profile,
    )

    cashier2_tag = await create_random_user_tag()
    await till_service.register.stock_up_cash_register(
        token=terminal_token,
        cashier_tag_uid=cashier.user_tag_uid,
        stocking_id=cash_register_stocking.id,
        cash_register_id=cash_register.id,
    )
    cr = await get_cash_register_for_cashier(db_connection, cashier.id)
    assert cr is not None
    assert cash_register_stocking.total == cr.balance
    assert cash_register.id == cr.id

    cashier2 = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login="cashier2", display_name="cashier2", user_tag_uid=cashier2_tag.uid, user_tag_pin=cashier2_tag.pin
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=cashier2.id, role_ids=[cashier.cashier_role.id]),
    )

    await login_supervised_user(cashier.user_tag_uid, cashier.cashier_role.id)
    assert await get_active_till_for_cash_register(db_connection, cash_register.id) == till.id

    await till_service.register.transfer_cash_register_terminal(
        token=terminal_token,
        source_cashier_tag_uid=cashier.user_tag_uid,
        target_cashier_tag_uid=cashier2_tag.uid,
    )

    cr = await get_cash_register_for_cashier(db_connection, cashier2.id)
    assert cr is not None
    assert cash_register_stocking.total == cr.balance
    assert cash_register.id == cr.id
    assert await get_active_till_for_cash_register(db_connection, cash_register.id) is None

    cr = await get_cash_register_for_cashier(db_connection, cashier.id)
    assert cr is None

    # we can transfer it back
    await till_service.register.transfer_cash_register_terminal(
        token=terminal_token,
        source_cashier_tag_uid=cashier2_tag.uid,
        target_cashier_tag_uid=cashier.user_tag_uid,
    )

    cr = await get_cash_register_for_cashier(db_connection, cashier2.id)
    assert cr is None

    cr = await get_cash_register_for_cashier(db_connection, cashier.id)
    assert cr is not None
    assert cash_register_stocking.total == cr.balance
    assert cash_register.id == cr.id
    assert await get_active_till_for_cash_register(db_connection, cash_register.id) == till.id


async def test_transfer_cash_register_moves_to_target_cashier_till(
    db_connection: Connection,
    till_service: TillService,
    terminal_service: TerminalService,
    user_service: UserService,
    cashier: Cashier,
    event_admin_token: str,
    event_node: Node,
    cash_register: CashRegister,
    cash_register_stocking: CashRegisterStocking,
    terminal_token: str,
    till: Till,
    till_profile: TillProfile,
    login_supervised_user: LoginSupervisedUser,
    create_random_user_tag: CreateRandomUserTag,
):
    await enable_cash_payments_for_profile(
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
        till_profile=till_profile,
    )

    cashier2_tag = await create_random_user_tag()
    cashier2 = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login="cashier2-target",
            display_name="cashier2-target",
            user_tag_uid=cashier2_tag.uid,
            user_tag_pin=cashier2_tag.pin,
        ),
    )
    await user_service.update_user_to_roles(
        token=event_admin_token,
        node_id=event_node.id,
        user_to_roles=NewUserToRoles(user_id=cashier2.id, role_ids=[cashier.cashier_role.id]),
    )

    second_till, second_terminal_token = await create_registered_terminal_with_till(
        terminal_service=terminal_service,
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
        till_profile_id=till_profile.id,
        name="transfer-target",
    )

    await till_service.register.stock_up_cash_register(
        token=terminal_token,
        cashier_tag_uid=cashier.user_tag_uid,
        stocking_id=cash_register_stocking.id,
        cash_register_id=cash_register.id,
    )
    await login_supervised_user(cashier.user_tag_uid, cashier.cashier_role.id)
    await login_supervised_user(cashier2_tag.uid, cashier.cashier_role.id, second_terminal_token)

    assert await get_active_till_for_cash_register(db_connection, cash_register.id) == till.id

    await till_service.register.transfer_cash_register_terminal(
        token=terminal_token,
        source_cashier_tag_uid=cashier.user_tag_uid,
        target_cashier_tag_uid=cashier2_tag.uid,
    )

    assert await get_active_till_for_cash_register(db_connection, cash_register.id) == second_till.id
    assert await db_connection.fetchval("select active_cash_register_id from till where id = $1", till.id) is None

    source_cashier_register = await get_cash_register_for_cashier(db_connection, cashier.id)
    assert source_cashier_register is None

    target_cashier_register = await get_cash_register_for_cashier(db_connection, cashier2.id)
    assert target_cashier_register is not None
    assert target_cashier_register.id == cash_register.id
    assert target_cashier_register.balance == cash_register_stocking.total


async def test_terminal_config_repairs_stale_cash_register_assignment(
    db_connection: Connection,
    till_service: TillService,
    terminal_service: TerminalService,
    cashier: Cashier,
    event_admin_token: str,
    event_node: Node,
    cash_register: CashRegister,
    cash_register_stocking: CashRegisterStocking,
    terminal_token: str,
    till: Till,
    till_profile: TillProfile,
    login_supervised_user: LoginSupervisedUser,
):
    await enable_cash_payments_for_profile(
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
        till_profile=till_profile,
    )

    second_till, second_terminal_token = await create_registered_terminal_with_till(
        terminal_service=terminal_service,
        till_service=till_service,
        event_admin_token=event_admin_token,
        event_node=event_node,
        till_profile_id=till_profile.id,
        name="config-repair",
    )

    await till_service.register.stock_up_cash_register(
        token=terminal_token,
        cashier_tag_uid=cashier.user_tag_uid,
        stocking_id=cash_register_stocking.id,
        cash_register_id=cash_register.id,
    )
    await login_supervised_user(cashier.user_tag_uid, cashier.cashier_role.id)
    assert await get_active_till_for_cash_register(db_connection, cash_register.id) == till.id

    await db_connection.execute(
        "update terminal set active_user_id = null, active_user_role_id = null where id = $1",
        till.terminal_id,
    )
    await db_connection.execute(
        "update terminal set active_user_id = $1, active_user_role_id = $2 where id = $3",
        cashier.id,
        cashier.cashier_role.id,
        second_till.terminal_id,
    )

    terminal_config = await terminal_service.get_terminal_config(token=second_terminal_token)

    assert terminal_config is not None
    assert terminal_config.till is not None
    assert terminal_config.till.cash_register_id == cash_register.id
    assert await db_connection.fetchval("select active_cash_register_id from till where id = $1", till.id) is None
    assert await db_connection.fetchval("select active_cash_register_id from till where id = $1", second_till.id) == cash_register.id
