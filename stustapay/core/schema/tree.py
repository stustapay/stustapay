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
    customer_portal_sepa_enabled: bool
    customer_portal_sepa_sender_name: Optional[str]
    customer_portal_sepa_sender_iban: Optional[str]
    customer_portal_sepa_description: Optional[str]
    customer_portal_sepa_allowed_country_codes: Optional[list[str]]

    @property
    def sepa_config(self) -> SEPAConfig | None:
        if not self.customer_portal_sepa_enabled:
            return None
        assert self.customer_portal_sepa_description is not None
        assert self.customer_portal_sepa_sender_name is not None
        assert self.customer_portal_sepa_sender_iban is not None
        assert self.customer_portal_sepa_allowed_country_codes is not None
        return SEPAConfig(
            sender_name=self.customer_portal_sepa_sender_name,
            sender_iban=self.customer_portal_sepa_sender_iban,
            description=self.customer_portal_sepa_description,
            allowed_country_codes=self.customer_portal_sepa_allowed_country_codes,
        )


class NewNode(BaseModel):
    name: str
    description: str
    allowed_objects_at_node: list[ObjectType]
    allowed_objects_in_subtree: list[ObjectType]


class Node(BaseModel):
    id: int
    parent: Optional[int]
    name: str
    description: str
    event: Optional[Event]
    path: str
    parent_ids: list[int]
    allowed_objects_at_node: list[ObjectType]
    # what results from transitive restrictions from nodes above
    computed_allowed_objects_at_node: list[ObjectType]
    allowed_objects_in_subtree: list[ObjectType]
    # what results from transitive restrictions from nodes above
    computed_allowed_objects_in_subtree: list[ObjectType]
    children: list["Node"]


class NewEvent(NewNode):
    currency_identifier: str
    sumup_topup_enabled: bool
    max_account_balance: float
    customer_portal_contact_email: EmailStr
    ust_id: str
    bon_issuer: str
    bon_address: str
    bon_title: str
