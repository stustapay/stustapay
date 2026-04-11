# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa
import pytest

from sftkit.error import AccessDenied, InvalidArgument

from stustapay.core.schema.config import ConfigEntry, GlobalEmailConfig
from stustapay.core.schema.language import Language
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
    assert config.invitation_texts[Language.de_DE]["subject"] is not None

    updated = await config_service.update_global_email_config(
        token=global_admin_token,
        config=GlobalEmailConfig(
            email_enabled=True,
            email_default_sender="noreply@example.test",
            email_smtp_host="smtp.example.test",
            email_smtp_port=587,
            email_smtp_username="mailer",
            email_smtp_password="secret",
            invitation_texts={
                Language.de_DE: {
                    "subject": "Einladung fuer {{ node_name }}",
                    "text_body": "Hallo {{ display_name }}",
                    "html_body": "<p>Hallo {{ display_name }}</p>",
                },
                Language.en_US: {
                    "subject": "Invite {{ node_name }}",
                    "text_body": "Hello {{ display_name }}",
                    "html_body": "<p>Hello {{ display_name }}</p>",
                },
            },
        ),
    )
    assert updated.email_enabled is True
    assert updated.email_default_sender == "noreply@example.test"
    assert updated.invitation_texts[Language.de_DE]["subject"] == "Einladung fuer {{ node_name }}"
    assert updated.invitation_texts[Language.en_US]["subject"] == "Invite {{ node_name }}"

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
            invitation_texts={
                Language.de_DE: {
                    "subject": "Einladung fuer {{ display_name }}",
                    "text_body": "Hallo {{ display_name }} Benutzername {{ username }} {{ invitation_url }}",
                    "html_body": "<p>Hallo {{ display_name }}</p><p>Benutzername {{ login }}</p>",
                },
                Language.en_US: {
                    "subject": "Invite {{ display_name }}",
                    "text_body": "Hello {{ display_name }} Username {{ username }} {{ invitation_url }}",
                    "html_body": "<p>Hello {{ display_name }}</p><p>Username {{ login }}</p>",
                },
            },
        ),
    )

    original_base_url = config_service.config.administration.base_url
    config_service.config.administration.base_url = "https://admin.teamfestlichpay.de/api/admin"
    try:
        result = await config_service.send_global_email_test(token=global_admin_token, mail_service=mail_service)
    finally:
        config_service.config.administration.base_url = original_base_url

    assert result["status"] == "queued"

    mail = await db_connection.fetchrow(
        "select subject, to_addr, text_message, html_message from mails order by id desc limit 1"
    )
    assert mail is not None
    assert str(mail["subject"]).startswith("[Preview] ")
    assert mail["to_addr"] == "global-admin@example.test"
    assert "global-admin" in mail["text_message"]
    assert "https://admin.teamfestlichpay.de/accept-invitation?token=preview-token" in mail["text_message"]
    assert "global-admin" in mail["html_message"]
    assert "teamfestlichPay" in mail["html_message"]
    assert "#176B67" in mail["html_message"]


async def test_global_email_config_uses_builtin_localized_templates_when_entries_are_missing(
    config_service: ConfigService,
    global_admin_token: str,
    db_connection,
):
    for key in (
        "mail.invitation.de-DE.subject",
        "mail.invitation.de-DE.text_body",
        "mail.invitation.de-DE.html_body",
        "mail.invitation.en-US.subject",
        "mail.invitation.en-US.text_body",
        "mail.invitation.en-US.html_body",
    ):
        await db_connection.execute(
            "insert into config (key, value, node_id) values ($1, $2, 0) "
            "on conflict (key) do update set value = excluded.value",
            key,
            None,
        )

    config = await config_service.get_global_email_config(token=global_admin_token)

    assert config.invitation_texts[Language.de_DE]["subject"] == "Einladung zur Verwaltung von {{ node_name }}"
    assert config.invitation_texts[Language.en_US]["subject"] == "Invitation to manage {{ node_name }}"
    assert "teamfestlichPay" in config.invitation_texts[Language.de_DE]["text_body"]
    assert "teamfestlichPay" in config.invitation_texts[Language.en_US]["html_body"]


async def test_global_email_config_treats_blank_templates_as_missing(
    config_service: ConfigService,
    global_admin_token: str,
    db_connection,
):
    updated = await config_service.update_global_email_config(
        token=global_admin_token,
        config=GlobalEmailConfig(
            email_enabled=True,
            email_default_sender="noreply@example.test",
            email_smtp_host="smtp.example.test",
            email_smtp_port=587,
            email_smtp_username="mailer",
            email_smtp_password="secret",
            invitation_texts={
                Language.de_DE: {
                    "subject": "",
                    "text_body": "   ",
                    "html_body": "",
                },
                Language.en_US: {
                    "subject": "",
                    "text_body": "",
                    "html_body": "",
                },
            },
        ),
    )

    assert updated.invitation_texts[Language.de_DE]["subject"] == "Einladung zur Verwaltung von {{ node_name }}"
    assert "teamfestlichPay" in updated.invitation_texts[Language.de_DE]["text_body"]
    assert "teamfestlichPay" in updated.invitation_texts[Language.en_US]["html_body"]

    rows = await db_connection.fetch(
        "select key, value from config where key = any($1) order by key",
        [
            "mail.invitation.de-DE.subject",
            "mail.invitation.de-DE.text_body",
            "mail.invitation.de-DE.html_body",
            "mail.invitation.en-US.subject",
            "mail.invitation.en-US.text_body",
            "mail.invitation.en-US.html_body",
        ],
    )
    assert {row["key"]: row["value"] for row in rows} == {
        "mail.invitation.de-DE.html_body": None,
        "mail.invitation.de-DE.subject": None,
        "mail.invitation.de-DE.text_body": None,
        "mail.invitation.en-US.html_body": None,
        "mail.invitation.en-US.subject": None,
        "mail.invitation.en-US.text_body": None,
    }


async def test_global_email_config_rejects_invalid_template_syntax(
    config_service: ConfigService,
    global_admin_token: str,
):
    with pytest.raises(InvalidArgument, match="Invalid invitation template syntax for 'subject'"):
        await config_service.update_global_email_config(
            token=global_admin_token,
            config=GlobalEmailConfig(
                email_enabled=True,
                email_default_sender="noreply@example.test",
                email_smtp_host="smtp.example.test",
                email_smtp_port=587,
                email_smtp_username="mailer",
                email_smtp_password="secret",
                invitation_texts={
                    Language.de_DE: {
                        "subject": "{{",
                    },
                },
            ),
        )
