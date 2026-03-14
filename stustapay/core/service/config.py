import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.config import ConfigEntry, GlobalEmailConfig, PublicConfig
from stustapay.core.schema.tree import ROOT_NODE_ID
from stustapay.core.schema.user import CurrentUser, Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_root_user
from stustapay.core.service.email_templates import (
    DEFAULT_INVITATION_SUBJECT,
    DEFAULT_INVITATION_TEXT_BODY,
    render_invitation_html,
    render_template_string,
    validate_template_string,
)
from sftkit.error import InvalidArgument, NotFound

GLOBAL_EMAIL_ENABLED_KEY = "mail.enabled"
GLOBAL_EMAIL_DEFAULT_SENDER_KEY = "mail.default_sender"
GLOBAL_EMAIL_SMTP_HOST_KEY = "mail.smtp_host"
GLOBAL_EMAIL_SMTP_PORT_KEY = "mail.smtp_port"
GLOBAL_EMAIL_SMTP_USERNAME_KEY = "mail.smtp_username"
GLOBAL_EMAIL_SMTP_PASSWORD_KEY = "mail.smtp_password"
GLOBAL_EMAIL_INVITATION_SUBJECT_KEY = "mail.invitation.subject"
GLOBAL_EMAIL_INVITATION_TEXT_BODY_KEY = "mail.invitation.text_body"
GLOBAL_EMAIL_INVITATION_HTML_BODY_KEY = "mail.invitation.html_body"

GLOBAL_EMAIL_CONFIG_KEYS = [
    GLOBAL_EMAIL_ENABLED_KEY,
    GLOBAL_EMAIL_DEFAULT_SENDER_KEY,
    GLOBAL_EMAIL_SMTP_HOST_KEY,
    GLOBAL_EMAIL_SMTP_PORT_KEY,
    GLOBAL_EMAIL_SMTP_USERNAME_KEY,
    GLOBAL_EMAIL_SMTP_PASSWORD_KEY,
    GLOBAL_EMAIL_INVITATION_SUBJECT_KEY,
    GLOBAL_EMAIL_INVITATION_TEXT_BODY_KEY,
    GLOBAL_EMAIL_INVITATION_HTML_BODY_KEY,
]


def _parse_config_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _parse_config_int(value: str | None) -> int | None:
    if value is None or value.strip() == "":
        return None
    try:
        return int(value)
    except ValueError:
        return None


async def fetch_config_entries_by_keys(*, conn: Connection, keys: list[str]) -> dict[str, str | None]:
    rows = await conn.fetch("select key, value from config where key = any($1)", keys)
    return {str(row["key"]): row["value"] for row in rows}


async def fetch_global_email_config(*, conn: Connection) -> GlobalEmailConfig:
    config = await fetch_config_entries_by_keys(conn=conn, keys=GLOBAL_EMAIL_CONFIG_KEYS)
    return GlobalEmailConfig(
        email_enabled=_parse_config_bool(config.get(GLOBAL_EMAIL_ENABLED_KEY), default=False),
        email_default_sender=config.get(GLOBAL_EMAIL_DEFAULT_SENDER_KEY),
        email_smtp_host=config.get(GLOBAL_EMAIL_SMTP_HOST_KEY),
        email_smtp_port=_parse_config_int(config.get(GLOBAL_EMAIL_SMTP_PORT_KEY)),
        email_smtp_username=config.get(GLOBAL_EMAIL_SMTP_USERNAME_KEY),
        email_smtp_password=config.get(GLOBAL_EMAIL_SMTP_PASSWORD_KEY),
        invitation_subject=config.get(GLOBAL_EMAIL_INVITATION_SUBJECT_KEY),
        invitation_text_body=config.get(GLOBAL_EMAIL_INVITATION_TEXT_BODY_KEY),
        invitation_html_body=config.get(GLOBAL_EMAIL_INVITATION_HTML_BODY_KEY),
    )


class ConfigService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    async def get_public_config(self) -> PublicConfig:
        return PublicConfig(
            test_mode=self.config.core.test_mode,
            test_mode_message=self.config.core.test_mode_message,
            sumup_topup_enabled_globally=self.config.core.sumup_enabled,
        )

    @with_db_transaction(read_only=True)
    @requires_root_user(privileges=[Privilege.node_administration])
    async def list_config_entries(self, *, conn: Connection) -> list[ConfigEntry]:
        return await conn.fetch_many(ConfigEntry, "select * from config")

    @with_db_transaction
    @requires_root_user(privileges=[Privilege.node_administration])
    async def set_config_entry(self, *, conn: Connection, entry: ConfigEntry) -> ConfigEntry:
        fetched_entry = await conn.fetch_maybe_one(
            ConfigEntry, "update config set value = $2 where key = $1 returning key, value", entry.key, entry.value
        )
        if fetched_entry is None:
            raise NotFound("config", entry.key)
        return fetched_entry

    @staticmethod
    def _validate_global_email_config(config: GlobalEmailConfig) -> None:
        if config.email_enabled:
            if not config.email_default_sender:
                raise InvalidArgument("Default sender is required when email is enabled")
            if not config.email_smtp_host:
                raise InvalidArgument("SMTP host is required when email is enabled")
            if config.email_smtp_port is None:
                raise InvalidArgument("SMTP port is required when email is enabled")

        for template in (config.invitation_subject, config.invitation_text_body, config.invitation_html_body):
            if template:
                validate_template_string(template)

    @with_db_transaction(read_only=True)
    @requires_root_user(privileges=[Privilege.global_email_management])
    async def get_global_email_config(self, *, conn: Connection) -> GlobalEmailConfig:
        return await fetch_global_email_config(conn=conn)

    @with_db_transaction
    @requires_root_user(privileges=[Privilege.global_email_management])
    async def update_global_email_config(self, *, conn: Connection, config: GlobalEmailConfig) -> GlobalEmailConfig:
        self._validate_global_email_config(config)
        values = {
            GLOBAL_EMAIL_ENABLED_KEY: "true" if config.email_enabled else "false",
            GLOBAL_EMAIL_DEFAULT_SENDER_KEY: config.email_default_sender,
            GLOBAL_EMAIL_SMTP_HOST_KEY: config.email_smtp_host,
            GLOBAL_EMAIL_SMTP_PORT_KEY: str(config.email_smtp_port) if config.email_smtp_port is not None else None,
            GLOBAL_EMAIL_SMTP_USERNAME_KEY: config.email_smtp_username,
            GLOBAL_EMAIL_SMTP_PASSWORD_KEY: config.email_smtp_password,
            GLOBAL_EMAIL_INVITATION_SUBJECT_KEY: config.invitation_subject,
            GLOBAL_EMAIL_INVITATION_TEXT_BODY_KEY: config.invitation_text_body,
            GLOBAL_EMAIL_INVITATION_HTML_BODY_KEY: config.invitation_html_body,
        }

        for key, value in values.items():
            await conn.execute(
                "insert into config (key, value, node_id) values ($1, $2, $3) "
                "on conflict (key) do update set value = excluded.value",
                key,
                value,
                ROOT_NODE_ID,
            )

        return await fetch_global_email_config(conn=conn)

    @with_db_transaction
    @requires_root_user(privileges=[Privilege.global_email_management])
    async def send_global_email_test(
        self,
        *,
        conn: Connection,
        current_user: CurrentUser,
        mail_service,
    ) -> dict[str, str]:
        if not current_user.email:
            raise InvalidArgument("The current user does not have an email address configured")

        config = await fetch_global_email_config(conn=conn)
        self._validate_global_email_config(config)
        if not config.email_enabled:
            raise InvalidArgument("Email sending is disabled")

        context = {
            "display_name": current_user.display_name,
            "node_name": "StuStaPay Administration",
            "invitation_url": f"{self.config.administration.base_url.rstrip('/')}/accept-invitation?token=preview-token",
            "expires_at": "2099-12-31 23:59",
        }

        subject = render_template_string(config.invitation_subject or DEFAULT_INVITATION_SUBJECT, context)
        text_message = render_template_string(config.invitation_text_body or DEFAULT_INVITATION_TEXT_BODY, context)
        html_message = (
            render_invitation_html(config.invitation_html_body, context, subject) if config.invitation_html_body else None
        )

        await mail_service.send_mail(
            conn=conn,
            node_id=ROOT_NODE_ID,
            subject=f"[Preview] {subject}",
            text_message=text_message,
            html_message=html_message,
            to_addr=current_user.email,
        )
        return {"status": "queued", "message": f"Preview email queued for {current_user.email}"}
