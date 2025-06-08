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
    message: str
    html_message: bool
    to_addr: str
    from_addr: str
    send_date: datetime | None
    scheduled_send_date: datetime
    attachments: list[MailAttachment]


class MailID(BaseModel):
    id: int
