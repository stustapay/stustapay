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
