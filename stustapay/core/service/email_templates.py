from urllib.parse import urlsplit, urlunsplit

from jinja2.sandbox import SandboxedEnvironment
from markupsafe import Markup

from stustapay.core.schema.language import Language

SUPPORTED_EMAIL_LANGUAGES = (Language.de_DE, Language.en_US)
INVITATION_TEMPLATE_FIELDS = ("subject", "text_body", "html_body")
INVITATION_SECTION_LABELS = {
    Language.de_DE: "Deutsch",
    Language.en_US: "English",
}

DEFAULT_INVITATION_SUBJECTS = {
    Language.de_DE: "Einladung zur Verwaltung von {{ node_name }}",
    Language.en_US: "Invitation to manage {{ node_name }}",
}

DEFAULT_INVITATION_TEXT_BODIES = {
    Language.de_DE: """Hallo {{ display_name }},

Sie wurden eingeladen, {{ node_name }} im teamfestlichPay-Administrationsportal zu verwalten.

Um Ihr Konto zu aktivieren, klicken Sie bitte auf den folgenden Link und setzen Sie Ihr Passwort:
{{ invitation_url }}

Diese Einladung ist gueltig bis {{ expires_at }}.

Falls Sie diese Einladung nicht erwartet haben, ignorieren Sie bitte diese E-Mail.

Viele Gruesse
Ihr teamfestlichPay-Team
""",
    Language.en_US: """Hello {{ display_name }},

You have been invited to manage {{ node_name }} in the teamfestlichPay administration portal.

To activate your account, please click the following link and set your password:
{{ invitation_url }}

This invitation will expire on {{ expires_at }}.

If you did not expect this invitation, please ignore this email.

Best regards,
The teamfestlichPay Team
""",
}

DEFAULT_INVITATION_HTML_BODIES = {
    Language.de_DE: """<p>Hallo {{ display_name }},</p>
<p>Sie wurden eingeladen, <strong>{{ node_name }}</strong> im teamfestlichPay-Administrationsportal zu verwalten.</p>
<p>Um Ihr Konto zu aktivieren, klicken Sie bitte auf den folgenden Link und setzen Sie Ihr Passwort:</p>
<p style="margin:24px 0;">
  <a
    href="{{ invitation_url }}"
    style="display:inline-block;padding:14px 24px;background:#176B67;color:#FFFFFF;
      text-decoration:none;font-weight:700;border-radius:999px;"
  >Einladung annehmen</a>
</p>
<p style="word-break:break-all;"><a href="{{ invitation_url }}" style="color:#176B67;">{{ invitation_url }}</a></p>
<p>Diese Einladung ist gueltig bis {{ expires_at }}.</p>
<p>Falls Sie diese Einladung nicht erwartet haben, ignorieren Sie bitte diese E-Mail.</p>
<p>Viele Gruesse<br />Ihr teamfestlichPay-Team</p>
""",
    Language.en_US: """<p>Hello {{ display_name }},</p>
<p>You have been invited to manage <strong>{{ node_name }}</strong> in the teamfestlichPay administration portal.</p>
<p>To activate your account, please click the following link and set your password:</p>
<p style="margin:24px 0;">
  <a
    href="{{ invitation_url }}"
    style="display:inline-block;padding:14px 24px;background:#176B67;color:#FFFFFF;
      text-decoration:none;font-weight:700;border-radius:999px;"
  >Accept invitation</a>
</p>
<p style="word-break:break-all;"><a href="{{ invitation_url }}" style="color:#176B67;">{{ invitation_url }}</a></p>
<p>This invitation will expire on {{ expires_at }}.</p>
<p>If you did not expect this invitation, please ignore this email.</p>
<p>Best regards,<br />The teamfestlichPay Team</p>
""",
}

BASE_EMAIL_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ subject }}</title>
  </head>
  <body style="margin:0;padding:0;background:#E6E6E6;font-family:Arial,sans-serif;color:#000000;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
      style="width:100%;background:#E6E6E6;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
            style="width:100%;max-width:640px;background:#FFFFFF;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:0;background:#176B67;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td style="height:6px;background:#2AD2C9;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:28px 32px;color:#FFFFFF;">
                      <div style="font-size:28px;line-height:1.1;font-weight:700;">teamfestlichPay</div>
                      <div style="margin-top:8px;font-size:14px;line-height:1.5;color:#FFFFFF;">
                        Cashless payment administration
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:16px;line-height:1.7;color:#000000;">
                {{ content }}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;background:#E6E6E6;color:#000000;font-size:12px;
                line-height:1.6;border-top:2px solid #2AD2C9;">
                This invitation email was sent by teamfestlichPay.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _sandbox(autoescape: bool) -> SandboxedEnvironment:
    return SandboxedEnvironment(autoescape=autoescape)


def validate_template_string(template: str) -> None:
    _sandbox(False).parse(template)


def render_template_string(template: str, context: dict[str, object], *, autoescape: bool = False) -> str:
    environment = _sandbox(autoescape)
    compiled = environment.from_string(template)
    return compiled.render(**context)


def render_email_html(content: str, subject: str) -> str:
    shell = _sandbox(True).from_string(BASE_EMAIL_HTML_TEMPLATE)
    return shell.render(subject=subject, content=Markup(content))


def render_invitation_html(template: str, context: dict[str, object], subject: str) -> str:
    rendered_body = render_template_string(template, context, autoescape=True)
    return render_email_html(rendered_body, subject)


def default_invitation_template(language: Language, field: str) -> str:
    if field == "subject":
        return DEFAULT_INVITATION_SUBJECTS[language]
    if field == "text_body":
        return DEFAULT_INVITATION_TEXT_BODIES[language]
    if field == "html_body":
        return DEFAULT_INVITATION_HTML_BODIES[language]
    raise KeyError(field)


def derive_invitation_base_url(api_base_url: str) -> str:
    parsed = urlsplit(api_base_url)
    path = parsed.path.rstrip("/")
    for suffix in ("/api/admin", "/api"):
        if path.endswith(suffix):
            path = path[: -len(suffix)]
            break

    return urlunsplit((parsed.scheme, parsed.netloc, path, "", "")).rstrip("/")
