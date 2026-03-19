from datetime import datetime

from pydantic import BaseModel


class MailAttachment(BaseModel):
    id: int
    mail_id: int
    file_name: str
    content: bytes


class Mail(BaseModel):
    id: int
    node_id: int
    subject: str
    text_message: str
    html_message: str | None
    to_addr: str
    from_addr: str
    send_date: datetime | None
    scheduled_send_date: datetime
    retry_count: int = 0
    retry_max: int = 5
    retry_next_attempt: datetime | None = None
    failure_reason: str | None = None
    attachments: list[MailAttachment]
