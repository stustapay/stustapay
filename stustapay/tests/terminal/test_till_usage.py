# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import pytest

from stustapay.core.schema.till import Till
from stustapay.core.schema.user import ADMIN_ROLE_ID
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.till import TillService
from stustapay.tests.conftest import Cashier, UserTag
from stustapay.tests.terminal.conftest import LoginSupervisedUser


async def test_terminal_registration_flow(till_service: TillService, admin_token: str, terminal_token: str, till: Till):
    terminal_config = await till_service.get_terminal_config(token=terminal_token)
    assert terminal_config is not None
    assert terminal_config.id == till.id

    # logout till from terminal
    await till_service.logout_terminal(token=terminal_token)

    # logout till from admin
    till_info = await till_service.get_till(token=admin_token, till_id=till.id)
    assert till_info is not None
    await till_service.register_terminal(registration_uuid=till_info.registration_uuid)
    logged_out = await till_service.logout_terminal_id(token=admin_token, till_id=till.id)
    assert logged_out


async def test_get_user_info(
    till_service: TillService,
    cashier: Cashier,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    admin_tag: UserTag,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    user_info = await till_service.get_user_info(token=terminal_token, user_tag_uid=cashier.user_tag_uid)
    assert user_info is not None

    with pytest.raises(AccessDenied):
        await till_service.get_user_info(token=terminal_token, user_tag_uid=admin_tag.uid)

    await login_supervised_user(user_tag_uid=admin_tag.uid, user_role_id=ADMIN_ROLE_ID)

    user_info = await till_service.get_user_info(token=terminal_token, user_tag_uid=cashier.user_tag_uid)
    assert user_info is not None

    user_info = await till_service.get_user_info(token=terminal_token, user_tag_uid=admin_tag.uid)
    assert user_info is not None
