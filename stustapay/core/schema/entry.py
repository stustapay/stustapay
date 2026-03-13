import enum
from datetime import datetime

from pydantic import BaseModel


class EntryAreaBase(BaseModel):
    name: str
    description: str | None = None


class NewEntryArea(EntryAreaBase):
    pass


class EntryArea(EntryAreaBase):
    id: int
    node_id: int


class EntryAreaConfig(BaseModel):
    id: int
    name: str
    description: str | None = None


class EntryGroupBase(BaseModel):
    name: str
    description: str | None = None


class NewEntryGroup(EntryGroupBase):
    pass


class EntryGroup(EntryGroupBase):
    id: int
    node_id: int


class EntryAreaGroup(BaseModel):
    id: int
    area_id: int
    group_id: int


class EntryAreaGroupWithGroup(EntryAreaGroup):
    group_name: str
    group_description: str | None = None


class EntryAreaGroupWindowBase(BaseModel):
    start_at: datetime
    end_at: datetime


class NewEntryAreaGroupWindow(EntryAreaGroupWindowBase):
    pass


class EntryAreaGroupWindow(EntryAreaGroupWindowBase):
    id: int
    area_group_id: int


class EntryGroupMember(BaseModel):
    user_tag_id: int
    user_tag_uid: int | None
    user_tag_pin: str
    comment: str | None = None
    is_vip: bool = False


class EntryGroupMemberAddPayload(BaseModel):
    user_tag_id: int | None = None
    user_tag_uid: int | None = None


class EntryGroupMemberAddByGroupTagPayload(BaseModel):
    group_tag: str


class EntryAreaGroupAssignPayload(BaseModel):
    group_id: int


class EntryDirection(enum.Enum):
    entry = "entry"
    exit = "exit"


class EntryScanPayload(BaseModel):
    tag_uid: int


class EntryScanResult(BaseModel):
    allowed: bool
    reason: str
    direction: EntryDirection
    area_id: int | None
    area_name: str | None
    group_id: int | None
    group_name: str | None
    is_inside: bool | None
    scanned_at: datetime


class EntryScanLog(BaseModel):
    id: int
    scanned_at: datetime
    node_id: int
    terminal_id: int
    terminal_name: str
    area_id: int
    area_name: str
    direction: EntryDirection
    user_tag_id: int | None
    user_tag_uid: int
    allowed: bool
    reason: str
    group_id: int | None
    group_name: str | None


class EntryScanLogQuery(BaseModel):
    area_id: int | None = None
    group_id: int | None = None
    terminal_id: int | None = None
    direction: EntryDirection | None = None
    allowed: bool | None = None
    user_tag_uid: int | None = None
    from_time: datetime | None = None
    to_time: datetime | None = None
    limit: int = 200
    offset: int = 0
