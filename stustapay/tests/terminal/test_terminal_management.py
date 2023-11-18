import pytest

from stustapay.core.schema.till import CashRegister, CashRegisterStocking
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import NewUser
from stustapay.core.service.common.error import InvalidArgument
from stustapay.core.service.till import TillService
from stustapay.core.service.user import UserService
from stustapay.framework.database import Connection
from stustapay.tests.conftest import Cashier, CreateRandomUserTag
from stustapay.tests.terminal.conftest import LoginSupervisedUser


async def test_transfer_cash_register(
    db_connection: Connection,
    till_service: TillService,
    user_service: UserService,
    cashier: Cashier,
    event_node: Node,
    cash_register: CashRegister,
    cash_register_stocking: CashRegisterStocking,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    create_random_user_tag: CreateRandomUserTag,
):
    cashier2_tag = await create_random_user_tag()
    await till_service.register.stock_up_cash_register(
        token=terminal_token,
        cashier_tag_uid=cashier.user_tag_uid,
        stocking_id=cash_register_stocking.id,
        cash_register_id=cash_register.id,
    )
    row = await db_connection.fetchrow(
        "select usr.cash_register_id, a.balance "
        "from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
        cashier.id,
    )
    assert cash_register_stocking.total == row["balance"]
    assert cash_register.id == row["cash_register_id"]

    cashier2 = await user_service.create_user_no_auth(
        node_id=event_node.id,
        new_user=NewUser(
            login="cashier2", display_name="cashier2", role_names=["cashier"], user_tag_uid=cashier2_tag.uid
        ),
    )

    await login_supervised_user(cashier.user_tag_uid, cashier.cashier_role.id)

    with pytest.raises(InvalidArgument):
        # cashier is still logged in
        await till_service.register.transfer_cash_register_terminal(
            token=terminal_token,
            source_cashier_tag_uid=cashier.user_tag_uid,
            target_cashier_tag_uid=cashier2_tag.uid,
        )

    await till_service.logout_user(token=terminal_token)
    await till_service.register.transfer_cash_register_terminal(
        token=terminal_token,
        source_cashier_tag_uid=cashier.user_tag_uid,
        target_cashier_tag_uid=cashier2_tag.uid,
    )

    row = await db_connection.fetchrow(
        "select usr.cash_register_id, a.balance "
        "from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
        cashier2.id,
    )
    assert cash_register_stocking.total == row["balance"]
    assert cash_register.id == row["cash_register_id"]

    row = await db_connection.fetchrow(
        "select usr.cash_register_id, a.balance "
        "from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
        cashier.id,
    )
    assert 0 == row["balance"]
    assert row["cash_register_id"] is None

    # we can transfer it back
    await till_service.register.transfer_cash_register_terminal(
        token=terminal_token,
        source_cashier_tag_uid=cashier2_tag.uid,
        target_cashier_tag_uid=cashier.user_tag_uid,
    )

    row = await db_connection.fetchrow(
        "select usr.cash_register_id, a.balance "
        "from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
        cashier2.id,
    )
    assert 0 == row["balance"]
    assert row["cash_register_id"] is None

    row = await db_connection.fetchrow(
        "select usr.cash_register_id, a.balance "
        "from usr join account a on usr.cashier_account_id = a.id where usr.id = $1",
        cashier.id,
    )
    assert cash_register_stocking.total == row["balance"]
    assert cash_register.id == row["cash_register_id"]
