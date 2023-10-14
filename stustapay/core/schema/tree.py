import enum
from typing import Optional

from pydantic import BaseModel, EmailStr

from stustapay.core.schema.config import SEPAConfig

ROOT_NODE_ID = 0
INITIAL_EVENT_NODE_ID = 1


class ObjectType(enum.Enum):
    user = "user"
    product = "product"
    ticket = "ticket"
    till = "till"
    user_role = "user_role"
    account = "account"
    order = "order"
    user_tags = "user_tags"
    tax_rate = "tax_rate"
    tse = "tse"


ALL_OBJECT_TYPES = [e for e in ObjectType]


class Event(BaseModel):
    id: int
    currency_identifier: str
    sumup_topup_enabled: bool
    max_account_balance: float
    customer_portal_contact_email: EmailStr
    ust_id: str
    bon_issuer: str
    bon_address: str
    bon_title: str
    sepa_enabled: bool
    sepa_sender_name: str
    sepa_sender_iban: str
    sepa_description: str
    sepa_allowed_country_codes: list[str]

    @property
    def sepa_config(self) -> SEPAConfig | None:
        if not self.sepa_enabled:
            return None
        return SEPAConfig(
            sender_name=self.sepa_sender_name,
            sender_iban=self.sepa_sender_iban,
            description=self.sepa_description,
            allowed_country_codes=self.sepa_allowed_country_codes,
        )


class NewNode(BaseModel):
    name: str
    description: str
    allowed_objects_at_node: list[ObjectType]
    allowed_objects_in_subtree: list[ObjectType]


class Node(BaseModel):
    id: int
    parent: int
    name: str
    description: str
    event: Optional[Event]
    path: str
    parent_ids: list[int]
    event_node_id: Optional[int]
    parents_until_event_node: Optional[list[int]]
    allowed_objects_at_node: list[ObjectType]
    # what results from transitive restrictions from nodes above
    computed_allowed_objects_at_node: list[ObjectType]
    allowed_objects_in_subtree: list[ObjectType]
    # what results from transitive restrictions from nodes above
    computed_allowed_objects_in_subtree: list[ObjectType]
    children: list["Node"]

    @property
    def ids_to_root(self) -> list[int]:
        return self.parent_ids + [self.id]

    @property
    def ids_to_event_node(self) -> list[int] | None:
        if self.parents_until_event_node is None:
            return None

        return self.parents_until_event_node + [self.id]


class UpdateEvent(BaseModel):
    currency_identifier: str
    sumup_topup_enabled: bool
    max_account_balance: float
    customer_portal_contact_email: EmailStr
    ust_id: str
    bon_issuer: str
    bon_address: str
    bon_title: str

    sepa_enabled: bool
    sepa_sender_name: str
    sepa_sender_iban: str
    sepa_description: str
    sepa_allowed_country_codes: list[str]


class NewEvent(NewNode, UpdateEvent):
    pass
