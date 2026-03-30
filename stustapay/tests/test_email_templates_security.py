"""Regression tests for admin-configurable email templates (sandboxed Jinja)."""

import pytest
from jinja2.sandbox import SecurityError

from stustapay.core.service.email_templates import (
    render_invitation_html,
    render_template_string,
    validate_template_string,
)


def test_render_simple_placeholder() -> None:
    assert render_template_string("Hello {{ display_name }}", {"display_name": "Ada"}) == "Hello Ada"


def test_validate_template_accepts_default_like_syntax() -> None:
    validate_template_string("{{ invitation_url }} — {{ node_name }}")


def test_sandbox_blocks_type_confusion_payload() -> None:
    with pytest.raises(SecurityError):
        render_template_string("{{ ''.__class__.__mro__[1].__subclasses__() }}", {"display_name": "x"})


def test_invitation_html_wraps_sandboxed_body() -> None:
    html = render_invitation_html("<p>{{ display_name }}</p>", {"display_name": "Ada"}, subject="Subj")
    assert "<p>Ada</p>" in html
    assert "<!DOCTYPE html>" in html
    assert "teamfestlichPay" in html
    assert "#176B67" in html


def test_invitation_html_inner_body_is_sandboxed() -> None:
    payload = "{{ ''.__class__.__mro__[1].__subclasses__() }}"
    with pytest.raises(SecurityError):
        render_invitation_html(payload, {"display_name": "x"}, subject="Subj")
