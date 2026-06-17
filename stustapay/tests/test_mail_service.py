# pylint: disable=protected-access
from datetime import datetime
from email.message import Message
from unittest.mock import AsyncMock

import pytest

from stustapay.core.schema.mail import Mail
from stustapay.core.schema.tree import ROOT_NODE_ID
from stustapay.core.service.mail import MailService


async def test_fetch_mail_claims_rows(mail_service: MailService, db_connection):
    await db_connection.execute("delete from mails")

    mail_id = await db_connection.fetchval(
        """
        insert into mails (node_id, subject, text_message, to_addr, from_addr, scheduled_send_date, retry_max)
        values ($1, $2, $3, $4, $5, now(), $6)
        returning id
        """,
        ROOT_NODE_ID,
        "Claim test",
        "hello",
        "recipient@example.test",
        "noreply@example.test",
        5,
    )

    first_claim = await mail_service._fetch_mail()
    second_claim = await mail_service._fetch_mail()

    assert len(first_claim) == 1
    assert first_claim[0].id == mail_id
    assert second_claim == []


@pytest.mark.asyncio
async def test_send_mail_sets_delivery_headers(mail_service: MailService, monkeypatch: pytest.MonkeyPatch):
    captured: dict[str, object] = {}

    async def fake_send(message, **kwargs):
        captured["message"] = message
        captured["kwargs"] = kwargs

    monkeypatch.setattr("stustapay.core.service.mail.aiosmtplib.send", fake_send)
    monkeypatch.setattr(
        mail_service,
        "_resolve_mail_settings",
        AsyncMock(return_value=(True, "noreply@teamfestlichpay.de", "smtp.example.test", 587, "user", "secret")),
    )

    mail = Mail(
        id=123,
        node_id=ROOT_NODE_ID,
        subject="Payout registered",
        text_message="hello world",
        html_message="<p>hello world</p>",
        to_addr="recipient@example.test",
        from_addr="payout@teamfestlichpay.de",
        send_date=None,
        scheduled_send_date=datetime.now(),
        retry_count=0,
        retry_max=5,
        retry_next_attempt=None,
        failure_reason=None,
        attachments=[],
    )

    await mail_service._send_mail(mail=mail)

    message = captured["message"]
    assert isinstance(message, Message)
    assert message["From"] == "teamfestlichPay <payout@teamfestlichpay.de>"
    assert message["Reply-To"] == "teamfestlichPay <payout@teamfestlichpay.de>"
    assert message["Message-ID"].endswith("@teamfestlichpay.de>")
