# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import secrets
from typing import Any

import pytest

from sftkit.error import AccessDenied, InvalidArgument
from sftkit.database import Connection
from stustapay.core.schema.tree import ROOT_NODE_ID, Node
from stustapay.core.schema.config import GlobalEmailConfig
from stustapay.core.schema.user import AcceptInvitationPayload, NewUser, NewUserRole, Privilege, UpdateCurrentUserProfilePayload, User
from stustapay.core.service.config import ConfigService
from stustapay.core.service.mail import MailService
from stustapay.core.service.user import UserService


async def test_change_password(user_service: UserService, event_admin_user, event_admin_token: str):
    usr, password = event_admin_user
    with pytest.raises(AccessDenied):  # test with invalid password
        await user_service.change_password(token=event_admin_token, old_password="foobar", new_password="rofl")
    await user_service.change_password(token=event_admin_token, old_password=password, new_password="rofl")

    await user_service.login_user(username=usr.login, password="rofl")


async def test_get_current_user_profile_returns_fresh_email(
    user_service: UserService,
    event_admin_token: str,
):
    await user_service.update_current_user_profile(
        token=event_admin_token,
        profile=UpdateCurrentUserProfilePayload(email="fresh-profile@example.com"),
    )

    current_user = await user_service.get_current_user_profile(token=event_admin_token)

    assert current_user.email == "fresh-profile@example.com"


async def test_update_current_user_profile_updates_email(
    user_service: UserService,
    event_admin_token: str,
    event_admin_user: tuple[User, str],
    event_node: Node,
):
    user, _ = event_admin_user

    updated_user = await user_service.update_current_user_profile(
        token=event_admin_token,
        profile=UpdateCurrentUserProfilePayload(email="admin-updated@example.com"),
    )

    assert updated_user.email == "admin-updated@example.com"

    fetched_user = await user_service.get_user(token=event_admin_token, node_id=event_node.id, user_id=user.id)
    assert fetched_user is not None
    assert fetched_user.email == "admin-updated@example.com"


async def test_update_current_user_profile_works_without_user_management(
    user_service: UserService,
    cashier: Any,
    event_admin_token: str,
    event_node: Node,
):
    updated_user = await user_service.update_current_user_profile(
        token=cashier.token,
        profile=UpdateCurrentUserProfilePayload(email="cashier@example.com"),
    )

    assert updated_user.email == "cashier@example.com"

    fetched_user = await user_service.get_user(token=event_admin_token, node_id=event_node.id, user_id=cashier.id)
    assert fetched_user is not None
    assert fetched_user.email == "cashier@example.com"


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


async def test_invitation_uses_global_email_templates(
    user_service: UserService,
    config_service: ConfigService,
    event_admin_token: str,
    global_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    mail_service: MailService,
):
    user = await user_service.create_user(
        token=event_admin_token,
        node_id=event_node.id,
        new_user=NewUser(
            login=f"templated-user-{secrets.token_hex(8)}",
            display_name="Templated User",
            email="templated-user@example.test",
            description="",
        ),
    )

    await config_service.update_global_email_config(
        token=global_admin_token,
        config=GlobalEmailConfig(
            email_enabled=True,
            email_default_sender="noreply@example.test",
            email_smtp_host="smtp.example.test",
            email_smtp_port=587,
            email_smtp_username="mailer",
            email_smtp_password="secret",
            invitation_subject="Invitation for {{ display_name }} to {{ node_name }}",
            invitation_text_body="Visit {{ invitation_url }} before {{ expires_at }}.",
            invitation_html_body="<p>Hello {{ display_name }}</p><p><a href='{{ invitation_url }}'>Invite</a></p>",
        ),
    )

    await user_service.invite_user(
        token=event_admin_token,
        node_id=event_node.id,
        user_id=user.id,
        mail_service=mail_service,
    )

    mail = await db_connection.fetchrow(
        "select node_id, from_addr, subject, text_message, html_message from mails order by id desc limit 1"
    )
    assert mail is not None
    assert mail["node_id"] == ROOT_NODE_ID
    assert mail["from_addr"] == "noreply@example.test"
    assert "Templated User" in mail["subject"]
    assert "accept-invitation?token=" in mail["text_message"]
    assert "<html" in mail["html_message"]
    assert "Templated User" in mail["html_message"]


async def test_invitation_falls_back_to_builtin_text_when_template_is_missing(
    user_service: UserService,
    config_service: ConfigService,
    event_admin_token: str,
    global_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    mail_service: MailService,
):
    user = await user_service.create_user(
        token=event_admin_token,
        node_id=event_node.id,
        new_user=NewUser(
            login=f"fallback-user-{secrets.token_hex(8)}",
            display_name="Fallback User",
            email="fallback-user@example.test",
            description="",
        ),
    )

    await config_service.update_global_email_config(
        token=global_admin_token,
        config=GlobalEmailConfig(
            email_enabled=True,
            email_default_sender="noreply@example.test",
            email_smtp_host="smtp.example.test",
            email_smtp_port=587,
            email_smtp_username="mailer",
            email_smtp_password="secret",
            invitation_subject=None,
            invitation_text_body=None,
            invitation_html_body="<p>ignored</p>",
        ),
    )

    await user_service.invite_user(
        token=event_admin_token,
        node_id=event_node.id,
        user_id=user.id,
        mail_service=mail_service,
    )

    mail = await db_connection.fetchrow(
        "select node_id, from_addr, subject, text_message, html_message from mails order by id desc limit 1"
    )
    assert mail is not None
    assert mail["node_id"] == ROOT_NODE_ID
    assert mail["from_addr"] == "noreply@example.test"
    assert mail["subject"] == f"Invitation to manage {event_node.name}"
    assert "Fallback User" in mail["text_message"]
    assert "ignored" in mail["html_message"]


async def test_invitation_uses_partial_template_overrides(
    user_service: UserService,
    config_service: ConfigService,
    event_admin_token: str,
    global_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    mail_service: MailService,
):
    user = await user_service.create_user(
        token=event_admin_token,
        node_id=event_node.id,
        new_user=NewUser(
            login=f"partial-template-user-{secrets.token_hex(8)}",
            display_name="Partial Template User",
            email="partial-template-user@example.test",
            description="",
        ),
    )

    await config_service.update_global_email_config(
        token=global_admin_token,
        config=GlobalEmailConfig(
            email_enabled=True,
            email_default_sender="noreply@example.test",
            email_smtp_host="smtp.example.test",
            email_smtp_port=587,
            email_smtp_username="mailer",
            email_smtp_password="secret",
            invitation_subject="Custom subject for {{ display_name }}",
            invitation_text_body=None,
            invitation_html_body="<p>Custom HTML for {{ display_name }}</p>",
        ),
    )

    await user_service.invite_user(
        token=event_admin_token,
        node_id=event_node.id,
        user_id=user.id,
        mail_service=mail_service,
    )

    mail = await db_connection.fetchrow(
        "select node_id, from_addr, subject, text_message, html_message from mails order by id desc limit 1"
    )
    assert mail is not None
    assert mail["node_id"] == ROOT_NODE_ID
    assert mail["from_addr"] == "noreply@example.test"
    assert mail["subject"] == "Custom subject for Partial Template User"
    assert "accept-invitation?token=" in mail["text_message"]
    assert "Custom HTML for Partial Template User" in mail["html_message"]


async def test_global_email_management_privilege_is_root_only_for_role_definitions(
    user_service: UserService,
    event_admin_token: str,
    event_node: Node,
):
    with pytest.raises(InvalidArgument):
        await user_service.create_user_role(
            token=event_admin_token,
            node_id=event_node.id,
            new_role=NewUserRole(
                name=f"mail-manager-{secrets.token_hex(4)}",
                is_privileged=False,
                privileges=[Privilege.global_email_management],
            ),
        )

    role = await user_service.create_user_role(
        token=event_admin_token,
        node_id=event_node.id,
        new_role=NewUserRole(
            name=f"regular-role-{secrets.token_hex(4)}",
            is_privileged=False,
            privileges=[],
        ),
    )

    with pytest.raises(InvalidArgument):
        await user_service.update_user_role_privileges(
            token=event_admin_token,
            node_id=event_node.id,
            role_id=role.id,
            is_privileged=False,
            privileges=[Privilege.global_email_management],
        )


async def test_update_user_rejects_blocked_tag_assignment(
    user_service: UserService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
    create_random_user_tag,
):
    blocked_tag = await create_random_user_tag()
    await db_connection.execute("update user_tag set account_creation_blocked = true where id = $1", blocked_tag.id)

    user = await user_service.create_user(
        token=event_admin_token,
        node_id=event_node.id,
        new_user=NewUser(
            login=f"blocked-tag-user-{secrets.token_hex(4)}",
            display_name="Blocked Tag User",
            description="",
        ),
    )

    with pytest.raises(InvalidArgument, match="Tag is blocked from account creation"):
        await user_service.update_user(
            token=event_admin_token,
            node_id=event_node.id,
            user_id=user.id,
            user=NewUser(
                login=user.login,
                display_name=user.display_name,
                description=user.description,
                user_tag_pin=blocked_tag.pin,
                user_tag_uid=blocked_tag.uid,
                email=user.email,
            ),
        )
