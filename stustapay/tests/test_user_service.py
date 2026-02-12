# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import secrets

import pytest

from sftkit.error import AccessDenied
from sftkit.database import Connection
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import AcceptInvitationPayload, NewUser
from stustapay.core.service.mail import MailService
from stustapay.core.service.user import UserService


async def test_change_password(user_service: UserService, event_admin_user, event_admin_token: str):
    usr, password = event_admin_user
    with pytest.raises(AccessDenied):  # test with invalid password
        await user_service.change_password(token=event_admin_token, old_password="foobar", new_password="rofl")
    await user_service.change_password(token=event_admin_token, old_password=password, new_password="rofl")

    await user_service.login_user(username=usr.login, password="rofl")


async def test_invitation_token_is_stored_hashed_and_raw_token_is_required_for_acceptance(
    user_service: UserService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    mail_service: MailService,
):
    user = await user_service.create_user(
        token=event_admin_token,
        node_id=event_node.id,
        new_user=NewUser(
            login=f"invited-user-{secrets.token_hex(8)}",
            display_name="Invited User",
            email="invited-user@example.test",
            description="",
        ),
    )

    invitation = await user_service.invite_user(
        token=event_admin_token,
        node_id=event_node.id,
        user_id=user.id,
        mail_service=mail_service,
    )

    stored_token = await db_connection.fetchval("select token from user_invitation where id = $1", invitation.id)
    assert stored_token != invitation.token
    assert stored_token.startswith(UserService.INVITATION_TOKEN_HASH_PREFIX)

    with pytest.raises(AccessDenied):
        await user_service.accept_invitation(
            payload=AcceptInvitationPayload(token=stored_token, password="unsafe-token-attempt")
        )

    accepted = await user_service.accept_invitation(
        payload=AcceptInvitationPayload(token=invitation.token, password="safe-password")
    )
    assert accepted["status"] == "success"


@pytest.mark.parametrize(
    ("api_base_url", "expected_invitation_base_url"),
    [
        ("http://localhost:8081/api", "http://localhost:8081"),
        ("http://localhost:8081", "http://localhost:8081"),
        ("https://admin.example.com/api", "https://admin.example.com"),
        ("https://api.example.com/api", "https://api.example.com"),
        ("https://api.example.com/stustapay/api", "https://api.example.com/stustapay"),
    ],
)
def test_invitation_base_url_derivation(api_base_url: str, expected_invitation_base_url: str):
    assert UserService._invitation_base_url(api_base_url) == expected_invitation_base_url
