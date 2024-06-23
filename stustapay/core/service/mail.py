"""Module to handle mail sending.
"""

# pylint: disable=unexpected-keyword-arg
# pylint: disable=unused-argument
# pylint: disable=missing-kwoa
import asyncio
import logging
from datetime import timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate

import aiosmtplib

# import markdown
import asyncpg
from pydantic import BaseModel
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.service.tree.common import fetch_restricted_event_settings_for_node

# TODO(jobi):
# - support for html and markdown messages
# - implement as native service, which uses the database to handle mail state
# - add attachments
# - config in db?


class Mail(BaseModel):
    subject: str
    message: str
    to_email: str
    from_email: str | None
    # markdown_message: bool = True,
    # attachments: Optional[dict[str, bytes]] = None,
    node_id: int


class MailService(Service[Config]):
    MAIL_SEND_CHECK_INTERVAL = timedelta(seconds=1)
    MAIL_SEND_INTERVAL = timedelta(seconds=0.05)

    def __init__(self, db_pool: asyncpg.Pool, config: Config):
        super().__init__(db_pool, config)
        self.logger = logging.getLogger("mail")
        self.mail_buffer: list[Mail] = []

    def send_mail(
        self,
        subject: str,
        message: str,
        to_email: str,
        node_id: int,
        from_email: str | None = None,
        # markdown_message: bool = True,
        # attachments: Optional[dict[str, bytes]] = None,
    ):
        self.mail_buffer.append(
            Mail(
                subject=subject,
                message=message,
                to_email=to_email,
                from_email=from_email,
                node_id=node_id,
            )
        )
        self.logger.debug(f"Added mail to buffer for {to_email}")

    async def run_mail_service(self):
        self.logger.info("Staring periodic job to send mails.")
        while True:
            try:
                await asyncio.sleep(self.MAIL_SEND_CHECK_INTERVAL.seconds)
                while len(self.mail_buffer) > 0:
                    await self._send_mail(mail=self.mail_buffer.pop(0))
                    await asyncio.sleep(self.MAIL_SEND_INTERVAL.seconds)
            except Exception as e:
                self.logger.exception(f"Failed to send mail with error {e}")

    @with_db_transaction(read_only=True)
    async def _send_mail(
        self,
        *,
        conn: asyncpg.Connection,
        mail: Mail,
    ) -> bool:
        self.logger.debug(f"Sending mail to {mail.to_email}")
        res_config = await fetch_restricted_event_settings_for_node(conn, mail.node_id)
        smtp_config = res_config.smtp_config
        if not smtp_config:
            self.logger.info(f"No mail sent because event with node id {mail.node_id} has mail sending deactivated")
            return False

        message = MIMEMultipart()
        message["Subject"] = mail.subject
        message["From"] = mail.from_email if mail.from_email else res_config.email_default_sender
        message["To"] = mail.to_email
        message["Date"] = formatdate(localtime=True)
        # message['Reply-To']

        msg = MIMEText(mail.message, "plain", "utf-8")
        message.attach(msg)
        # if mail.attachments is None:
        #     mail.attachments = {}
        # if markdown_message:
        #     message.attach(MIMEText(markdown.markdown(message), "html"))

        # for fname, content in mail.attachments:
        #     part = MIMEBase('application', 'octet-stream')
        #     part.set_payload(content)
        #     encoders.encode_base64(part)
        #     part.add_header('Content-Disposition', f"attachment; filename= {fname}")
        #     message.attach(part)

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
            self.logger.exception(f"Failed to send mail to {mail.to_email} with error {e}")
            return False
        return True
