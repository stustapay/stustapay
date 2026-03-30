import asyncpg
from jinja2 import TemplateSyntaxError
from sftkit.database import Connection
from sftkit.error import InvalidArgument, NotFound
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.config import ConfigEntry, GlobalEmailConfig, PublicConfig
from stustapay.core.schema.language import Language
from stustapay.core.schema.tree import ROOT_NODE_ID
from stustapay.core.schema.user import CurrentUser, Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_root_user
from stustapay.core.service.email_templates import (
    INVITATION_SECTION_LABELS,
    INVITATION_TEMPLATE_FIELDS,
    SUPPORTED_EMAIL_LANGUAGES,
    default_invitation_template,
    derive_invitation_base_url,
    render_email_html,
    render_template_string,
    validate_template_string,
)

GLOBAL_EMAIL_ENABLED_KEY = "mail.enabled"
GLOBAL_EMAIL_DEFAULT_SENDER_KEY = "mail.default_sender"
GLOBAL_EMAIL_SMTP_HOST_KEY = "mail.smtp_host"
GLOBAL_EMAIL_SMTP_PORT_KEY = "mail.smtp_port"
GLOBAL_EMAIL_SMTP_USERNAME_KEY = "mail.smtp_username"
GLOBAL_EMAIL_SMTP_PASSWORD_KEY = "mail.smtp_password"


def _localized_invitation_key(language: Language, field: str) -> str:
    return f"mail.invitation.{language.value}.{field}"

GLOBAL_EMAIL_CONFIG_KEYS = [
    GLOBAL_EMAIL_ENABLED_KEY,
    GLOBAL_EMAIL_DEFAULT_SENDER_KEY,
    GLOBAL_EMAIL_SMTP_HOST_KEY,
    GLOBAL_EMAIL_SMTP_PORT_KEY,
    GLOBAL_EMAIL_SMTP_USERNAME_KEY,
    GLOBAL_EMAIL_SMTP_PASSWORD_KEY,
    *[
        _localized_invitation_key(language, field)
        for language in SUPPORTED_EMAIL_LANGUAGES
        for field in INVITATION_TEMPLATE_FIELDS
    ],
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


def _normalize_template_value(value: str | None) -> str | None:
    if value is None:
        return None
    if value.strip() == "":
        return None
    return value


async def fetch_config_entries_by_keys(*, conn: Connection, keys: list[str]) -> dict[str, str | None]:
    rows = await conn.fetch("select key, value from config where key = any($1)", keys)
    return {str(row["key"]): row["value"] for row in rows}


async def fetch_global_email_config(*, conn: Connection) -> GlobalEmailConfig:
    config = await fetch_config_entries_by_keys(conn=conn, keys=GLOBAL_EMAIL_CONFIG_KEYS)
    invitation_texts: dict[Language, dict[str, str]] = {}
    for language in SUPPORTED_EMAIL_LANGUAGES:
        templates: dict[str, str] = {}
        for field in INVITATION_TEMPLATE_FIELDS:
            localized_value = _normalize_template_value(config.get(_localized_invitation_key(language, field)))
            if localized_value is not None:
                templates[field] = localized_value
            else:
                templates[field] = default_invitation_template(language, field)
        invitation_texts[language] = templates

    return GlobalEmailConfig(
        email_enabled=_parse_config_bool(config.get(GLOBAL_EMAIL_ENABLED_KEY), default=False),
        email_default_sender=config.get(GLOBAL_EMAIL_DEFAULT_SENDER_KEY),
        email_smtp_host=config.get(GLOBAL_EMAIL_SMTP_HOST_KEY),
        email_smtp_port=_parse_config_int(config.get(GLOBAL_EMAIL_SMTP_PORT_KEY)),
        email_smtp_username=config.get(GLOBAL_EMAIL_SMTP_USERNAME_KEY),
        email_smtp_password=config.get(GLOBAL_EMAIL_SMTP_PASSWORD_KEY),
        invitation_texts=invitation_texts,
    )


def resolve_invitation_template(config: GlobalEmailConfig, language: Language, field: str) -> str:
    template = _normalize_template_value(config.invitation_texts.get(language, {}).get(field))
    if template is not None:
        return template
    return default_invitation_template(language, field)


def render_bilingual_invitation_subject(config: GlobalEmailConfig, context: dict[str, object]) -> str:
    subjects = [
        render_template_string(resolve_invitation_template(config, language, "subject"), context)
        for language in SUPPORTED_EMAIL_LANGUAGES
    ]
    return " | ".join(dict.fromkeys(subjects))


def render_bilingual_invitation_text(config: GlobalEmailConfig, context: dict[str, object]) -> str:
    sections = []
    for language in SUPPORTED_EMAIL_LANGUAGES:
        body = render_template_string(resolve_invitation_template(config, language, "text_body"), context).strip()
        sections.append(f"{INVITATION_SECTION_LABELS[language]}\n\n{body}")
    return "\n\n-----\n\n".join(sections)


def render_bilingual_invitation_html(config: GlobalEmailConfig, context: dict[str, object], subject: str) -> str:
    sections = []
    for language in SUPPORTED_EMAIL_LANGUAGES:
        body = render_template_string(
            resolve_invitation_template(config, language, "html_body"),
            context,
            autoescape=True,
        )
        sections.append(
            '<div style="padding:0 0 32px 0;">'
            f'<p style="margin:0 0 16px 0;color:#176B67;"><strong>{INVITATION_SECTION_LABELS[language]}</strong></p>'
            f"{body}"
            "</div>"
        )
    content = '<div>' + '<div style="border-top:1px solid #E6E6E6;margin:0 0 32px 0;"></div>'.join(sections) + "</div>"
    return render_email_html(content, subject)


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

        for templates in config.invitation_texts.values():
            for field, template in templates.items():
                normalized_template = _normalize_template_value(template)
                if not normalized_template:
                    continue
                try:
                    validate_template_string(normalized_template)
                except TemplateSyntaxError as exc:
                    raise InvalidArgument(f"Invalid invitation template syntax for '{field}': {exc.message}") from exc

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
        }
        for language in SUPPORTED_EMAIL_LANGUAGES:
            templates = config.invitation_texts.get(language, {})
            for field in INVITATION_TEMPLATE_FIELDS:
                values[_localized_invitation_key(language, field)] = _normalize_template_value(templates.get(field))

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
            "node_name": "teamfestlichPay Administration",
            "invitation_url": (
                f"{derive_invitation_base_url(self.config.administration.base_url)}"
                "/accept-invitation?token=preview-token"
            ),
            "expires_at": "2099-12-31 23:59",
        }

        subject = render_bilingual_invitation_subject(config, context)
        text_message = render_bilingual_invitation_text(config, context)
        html_message = render_bilingual_invitation_html(config, context, subject)

        await mail_service.send_mail(
            conn=conn,
            node_id=ROOT_NODE_ID,
            subject=f"[Preview] {subject}",
            text_message=text_message,
            html_message=html_message,
            to_addr=current_user.email,
        )
        return {"status": "queued", "message": f"Preview email queued for {current_user.email}"}
