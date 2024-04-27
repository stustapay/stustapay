# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import pytest

from stustapay.core.service.common.error import AccessDenied
from stustapay.core.service.user import UserService


async def test_change_password(user_service: UserService, event_admin_user, event_admin_token: str):
    usr, password = event_admin_user
    with pytest.raises(AccessDenied):  # test with invalid password
        await user_service.change_password(token=event_admin_token, old_password="foobar", new_password="asdf")
    await user_service.change_password(token=event_admin_token, old_password=password, new_password="asdf")

    await user_service.login_user(username=usr.login, password="asdf")
