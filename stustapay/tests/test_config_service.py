# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import pytest

from sftkit.error import AccessDenied

from stustapay.core.schema.config import ConfigEntry, GlobalEmailConfig
from stustapay.core.service.config import ConfigService


async def test_get_public_config(config_service: ConfigService):
    public_config = await config_service.get_public_config()
    assert public_config is not None


async def test_generic_config_requires_root_node_administration(
    config_service: ConfigService,
    global_admin_token: str,
    event_admin_token: str,
):
    entries = await config_service.list_config_entries(token=global_admin_token)
    assert len(entries) > 0

    updated = await config_service.set_config_entry(
        token=global_admin_token,
        entry=ConfigEntry(key="mail.enabled", value="true"),
    )
    assert updated.value == "true"

    with pytest.raises(AccessDenied):
        await config_service.list_config_entries(token=event_admin_token)

    with pytest.raises(AccessDenied):
        await config_service.set_config_entry(
            token=event_admin_token,
            entry=ConfigEntry(key="mail.enabled", value="false"),
        )


async def test_global_email_config_requires_root_global_email_management(
    config_service: ConfigService,
    global_admin_token: str,
    event_admin_token: str,
):
    config = await config_service.get_global_email_config(token=global_admin_token)
    assert config.invitation_subject is not None

    updated = await config_service.update_global_email_config(
        token=global_admin_token,
        config=GlobalEmailConfig(
            email_enabled=True,
            email_default_sender="noreply@example.test",
            email_smtp_host="smtp.example.test",
            email_smtp_port=587,
            email_smtp_username="mailer",
            email_smtp_password="secret",
            invitation_subject="Invite {{ node_name }}",
            invitation_text_body="Hello {{ display_name }}",
            invitation_html_body="<p>Hello {{ display_name }}</p>",
        ),
    )
    assert updated.email_enabled is True
    assert updated.email_default_sender == "noreply@example.test"

    with pytest.raises(AccessDenied):
        await config_service.get_global_email_config(token=event_admin_token)

    with pytest.raises(AccessDenied):
        await config_service.update_global_email_config(
            token=event_admin_token,
            config=updated,
        )


async def test_global_email_test_queues_preview_mail(
    config_service: ConfigService,
    global_admin_token: str,
    global_admin_user,
    mail_service,
    db_connection,
):
    user, _ = global_admin_user
    await db_connection.execute("update usr set email = $1 where id = $2", "global-admin@example.test", user.id)

    await config_service.update_global_email_config(
        token=global_admin_token,
        config=GlobalEmailConfig(
            email_enabled=True,
            email_default_sender="noreply@example.test",
            email_smtp_host="smtp.example.test",
            email_smtp_port=587,
            email_smtp_username="mailer",
            email_smtp_password="secret",
            invitation_subject="Invite {{ display_name }}",
            invitation_text_body="Hello {{ display_name }}",
            invitation_html_body="<p>Hello {{ display_name }}</p>",
        ),
    )

    result = await config_service.send_global_email_test(token=global_admin_token, mail_service=mail_service)
    assert result["status"] == "queued"

    mail = await db_connection.fetchrow("select subject, to_addr from mails order by id desc limit 1")
    assert mail is not None
    assert str(mail["subject"]).startswith("[Preview] ")
    assert mail["to_addr"] == "global-admin@example.test"
