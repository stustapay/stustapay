from jinja2.sandbox import SandboxedEnvironment
from markupsafe import Markup

DEFAULT_INVITATION_SUBJECT = "Invitation to manage {{ node_name }}"

DEFAULT_INVITATION_TEXT_BODY = """Hello {{ display_name }},

You have been invited to manage {{ node_name }} in the StuStaPay administration portal.

To activate your account, please click the following link and set your password:
{{ invitation_url }}

This invitation will expire on {{ expires_at }}.

If you did not expect this invitation, please ignore this email.

Best regards,
The StuStaPay Team
"""

DEFAULT_INVITATION_HTML_BODY = """<p>Hello {{ display_name }},</p>
<p>You have been invited to manage <strong>{{ node_name }}</strong> in the StuStaPay administration portal.</p>
<p>To activate your account, please click the following link and set your password:</p>
<p><a href="{{ invitation_url }}">{{ invitation_url }}</a></p>
<p>This invitation will expire on {{ expires_at }}.</p>
<p>If you did not expect this invitation, please ignore this email.</p>
<p>Best regards,<br />The StuStaPay Team</p>
"""

BASE_EMAIL_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{ subject }}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;background:#111827;color:#ffffff;font-size:20px;font-weight:700;">
                StuStaPay
              </td>
            </tr>
            <tr>
              <td style="padding:32px;font-size:16px;line-height:1.6;">
                {{ content }}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f9fafb;color:#6b7280;font-size:12px;">
                This email was sent by StuStaPay.
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


def render_invitation_html(template: str, context: dict[str, object], subject: str) -> str:
    rendered_body = render_template_string(template, context, autoescape=True)
    shell = _sandbox(True).from_string(BASE_EMAIL_HTML_TEMPLATE)
    return shell.render(subject=subject, content=Markup(rendered_body))
