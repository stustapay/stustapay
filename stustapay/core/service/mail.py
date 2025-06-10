"""Service to handle mail sending."""

# pylint: disable=missing-kwoa
import asyncio
import logging
import math
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
from stustapay.core.schema.mail import Mail, MailID
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node


class MailService(Service[Config]):
    MAIL_SEND_CHECK_INTERVAL = timedelta(seconds=1)
    MAIL_SEND_INTERVAL = timedelta(seconds=0.05)
    MAIL_MAX_RETRIES = 10
    MAIL_BACKOFF_FACTOR = math.e / 2.0 - 0.1  # empirically proven to be good by Liew et al. 2008

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
        if not res_config.email_enabled:
            self.logger.warning(
                f"Mail to {to_addr} was not scheduled for sending because event with node id {node_id} has mail sending deactivated"
            )
            return
        mail_id = await conn.fetchval(
            """
            INSERT INTO mails (node_id, subject, message, html_message, to_addr, from_addr, scheduled_send_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
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
            await conn.execute(
                """
                INSERT INTO mail_attachments (mail_id, file_name, content)
                VALUES ($1, $2, $3)
                """,
                mail_id,
                file_name,
                content,
            )
        self.logger.debug(f"Added mail to database buffer for {to_addr}")

    @with_db_transaction(read_only=True)
    async def _fetch_due_mail_ids(self, *, conn: Connection) -> list[MailID]:
        # fetch all unsent mail ids from nodes with email enabled
        return await conn.fetch_many(
            MailID,
            """
            select m.id
            from mail_with_attachments m
                join node n on n.id = m.node_id join event e on e.id = n.event_id
            where m.scheduled_send_date <= $1 and m.send_date is null and e.email_enabled and m.num_retries < $2
            order by m.scheduled_send_date asc
            """,
            datetime.now(),
            self.MAIL_MAX_RETRIES,
        )

    async def run_mail_service(self):
        self.logger.info("Staring periodic job to send mails.")
        while True:
            try:
                await asyncio.sleep(self.MAIL_SEND_CHECK_INTERVAL.seconds)
                mail_ids = await self._fetch_due_mail_ids()
                for mail_id in mail_ids:
                    await self._send_mail(mail_id=mail_id)
                    await asyncio.sleep(self.MAIL_SEND_INTERVAL.seconds)
            except Exception as e:
                self.logger.exception(f"Failed to send mail with error {e}")

    @with_db_transaction
    async def _send_mail(
        self,
        *,
        conn: Connection,
        mail_id: MailID,
    ) -> None:
        mail = await conn.fetch_one(
            Mail,
            """
            select *
            from mail_with_attachments
            where id = $1 and send_date is null
            """,
            mail_id.id,
        )
        if mail is None:
            self.logger.info(f"Mail with id {mail_id.id} not found or already sent.")
            return

        self.logger.debug(f"Sending mail to {mail.to_addr}")
        res_config = await fetch_restricted_event_settings_for_node(conn, mail.node_id)
        smtp_config = res_config.smtp_config
        if not smtp_config:
            self.logger.info(
                f"The mail was not send because event with node id {mail.node_id} has mail sending deactivated"
            )
            return
        # set mail send to avoid race conditions
        await conn.execute(
            """
            update mails
            set send_date = $1
            where id = $2
            """,
            datetime.now(),
            mail.id,
        )

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
            self.logger.debug(f"Mail sent to {mail.to_addr}")
        except Exception as e:
            self.logger.exception(f"Failed to send mail to {mail.to_addr} with error {e}")
            # undo mail send state
            await conn.execute(
                """
                update mails
                set send_date = null, num_retries = num_retries + 1, scheduled_send_date = $2
                where id = $1
                """,
                mail.id,
                datetime.now() + timedelta(hours=math.pow(self.MAIL_BACKOFF_FACTOR, mail.num_retries) - 1),
            )
