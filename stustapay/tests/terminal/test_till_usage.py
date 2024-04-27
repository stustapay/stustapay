# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import pytest

from stustapay.core.schema.user import ADMIN_ROLE_ID
from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.till import TillService
from stustapay.tests.conftest import Cashier, UserTag
from stustapay.tests.terminal.conftest import LoginSupervisedUser


async def test_get_user_info(
    till_service: TillService,
    cashier: Cashier,
    terminal_token: str,
    login_supervised_user: LoginSupervisedUser,
    event_admin_tag: UserTag,
):
    await login_supervised_user(user_tag_uid=cashier.user_tag_uid, user_role_id=cashier.cashier_role.id)
    user_info = await till_service.get_user_info(token=terminal_token, user_tag_uid=cashier.user_tag_uid)
    assert user_info is not None

    with pytest.raises(AccessDenied):
        await till_service.get_user_info(token=terminal_token, user_tag_uid=event_admin_tag.uid)

    await login_supervised_user(user_tag_uid=event_admin_tag.uid, user_role_id=ADMIN_ROLE_ID)

    user_info = await till_service.get_user_info(token=terminal_token, user_tag_uid=cashier.user_tag_uid)
    assert user_info is not None

    user_info = await till_service.get_user_info(token=terminal_token, user_tag_uid=event_admin_tag.uid)
    assert user_info is not None
