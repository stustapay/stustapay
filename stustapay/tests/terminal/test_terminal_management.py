from collections import namedtuple

from sftkit.database import Connection

from stustapay.core.schema.till import CashRegister, CashRegisterStocking
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import NewUser, NewUserToRoles
from stustapay.core.service.till.till import TillService
from stustapay.core.service.user import UserService
from stustapay.tests.conftest import Cashier, CreateRandomUserTag
from stustapay.tests.terminal.conftest import LoginSupervisedUser

CashRegisterInfo = namedtuple("CashRegisterInfo", ("id", "balance"))


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
    login_supervised_user: LoginSupervisedUser,
    create_random_user_tag: CreateRandomUserTag,
):
    async def get_cash_register_for_cashier(user_id: int) -> CashRegisterInfo | None:
        row = await db_connection.fetchrow(
            "select cr.id, cr.balance from cash_register_with_cashier cr where cr.current_cashier_id = $1",
            user_id,
        )
        if row is None:
            return None
        return CashRegisterInfo(row["id"], row["balance"])

    cashier2_tag = await create_random_user_tag()
    await till_service.register.stock_up_cash_register(
        token=terminal_token,
        cashier_tag_uid=cashier.user_tag_uid,
        stocking_id=cash_register_stocking.id,
        cash_register_id=cash_register.id,
    )
    cr = await get_cash_register_for_cashier(cashier.id)
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

    await till_service.register.transfer_cash_register_terminal(
        token=terminal_token,
        source_cashier_tag_uid=cashier.user_tag_uid,
        target_cashier_tag_uid=cashier2_tag.uid,
    )

    cr = await get_cash_register_for_cashier(cashier2.id)
    assert cr is not None
    assert cash_register_stocking.total == cr.balance
    assert cash_register.id == cr.id

    cr = await get_cash_register_for_cashier(cashier.id)
    assert cr is None

    # we can transfer it back
    await till_service.register.transfer_cash_register_terminal(
        token=terminal_token,
        source_cashier_tag_uid=cashier2_tag.uid,
        target_cashier_tag_uid=cashier.user_tag_uid,
    )

    cr = await get_cash_register_for_cashier(cashier2.id)
    assert cr is None

    cr = await get_cash_register_for_cashier(cashier.id)
    assert cr is not None
    assert cash_register_stocking.total == cr.balance
    assert cash_register.id == cr.id
