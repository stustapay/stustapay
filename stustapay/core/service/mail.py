"""Service to handle mail sending.
"""

# pylint: disable=missing-kwoa
import asyncio
import logging
from datetime import datetime, timedelta
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate

import aiosmtplib
import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.mail import Mail
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node


class MailService(Service[Config]):
    MAIL_SEND_CHECK_INTERVAL = timedelta(seconds=1)
    MAIL_SEND_INTERVAL = timedelta(seconds=0.05)

    def __init__(self, db_pool: asyncpg.Pool, config: Config):
        super().__init__(db_pool, config)
        self.logger = logging.getLogger("mail_service")

    @with_db_transaction
    async def send_mail(
        self,
        *,
        conn: Connection,
        node_id: int,
        subject: str,
        message: str,
        html_message: bool = False,
        to_addr: str,
        from_addr: str | None = None,
        scheduled_send_date: datetime | None = None,
        attachments: dict[str, bytes] | None = None,
    ):
        res_config = await fetch_restricted_event_settings_for_node(conn, node_id)
        mail_id = conn.fetchval(
            """
            INSERT INTO mails (node_id, subject, message, html_message, to_addr, from_addr, scheduled_send_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            """,
            node_id,
            subject,
            message,
            html_message,
            to_addr,
            from_addr if from_addr is not None else res_config.email_default_sender,
            scheduled_send_date if scheduled_send_date is not None else datetime.now(),
        )
        attachments = attachments or {}
        for file_name, content in attachments.items():
            conn.execute(
                """
                INSERT INTO mail_attachments (mail_id, file_name, content)
                VALUES ($1, $2, $3)
                """,
                mail_id,
                file_name,
                content,
            )
        self.logger.debug(f"Added mail to data base buffer for {to_addr}")

    @with_db_transaction(read_only=True)
    async def _fetch_mail(self, *, conn: Connection) -> list[Mail]:
        return await conn.fetch_many(
            Mail,
            """
            select * from mail_with_attachments
            where scheduled_send_date <= $1
            """,
            datetime.now(),
        )

    async def run_mail_service(self):
        self.logger.info("Staring periodic job to send mails.")
        while True:
            try:
                await asyncio.sleep(self.MAIL_SEND_CHECK_INTERVAL.seconds)
                mails = await self._fetch_mail()
                for mail in mails:
                    await self._send_mail(mail=mail)
                    await asyncio.sleep(self.MAIL_SEND_INTERVAL.seconds)
            except Exception as e:
                self.logger.exception(f"Failed to send mail with error {e}")

    @with_db_transaction
    async def _send_mail(
        self,
        *,
        conn: Connection,
        mail: Mail,
    ) -> None:
        self.logger.debug(f"Sending mail to {mail.to_addr}")
        res_config = await fetch_restricted_event_settings_for_node(conn, mail.node_id)
        smtp_config = res_config.smtp_config
        if not smtp_config:
            self.logger.info(f"No mail sent because event with node id {mail.node_id} has mail sending deactivated")
            return

        message = MIMEMultipart()
        message["Subject"] = mail.subject
        message["From"] = mail.from_addr if mail.from_addr else res_config.email_default_sender
        message["To"] = mail.to_addr
        message["Date"] = formatdate(localtime=True)

        if mail.html_message:
            # TODO: to properly handle html messages, we need to convert html to plain text
            # and add the plain text version as an alternative part
            msg = MIMEText(mail.message, "html", "utf-8")
        else:
            msg = MIMEText(mail.message, "plain", "utf-8")
        message.attach(msg)

        for attachment in mail.attachments:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.content)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f"attachment; filename= {attachment.file_name}")
            message.attach(part)

        try:
            assert smtp_config.smtp_host is not None and smtp_config.smtp_port is not None
            await aiosmtplib.send(
                message,
                hostname=smtp_config.smtp_host,
                port=smtp_config.smtp_port,
                username=smtp_config.smtp_username,
                password=smtp_config.smtp_password,
                start_tls=True,
            )
        except Exception as e:
            self.logger.exception(f"Failed to send mail to {mail.to_addr} with error {e}")
            return

        await conn.execute(
            """
            update mails
            set send_date = $1
            where id = $2
            """,
            datetime.now(),
            mail.id,
        )
