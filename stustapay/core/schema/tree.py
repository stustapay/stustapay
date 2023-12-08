import enum
from itertools import chain
from typing import Optional

from pydantic import BaseModel, EmailStr, computed_field

from stustapay.core.config import CoreConfig
from stustapay.core.schema.config import SEPAConfig
from stustapay.core.schema.user import UserRole, Privilege

ROOT_NODE_ID = 0
INITIAL_EVENT_NODE_ID = 1


class Language(enum.Enum):
    en_US = "en-US"
    de_DE = "de-DE"


class _BaseEvent(BaseModel):
    currency_identifier: str
    max_account_balance: float

    sumup_topup_enabled: bool = False
    sumup_payment_enabled: bool = False

    customer_portal_url: str
    customer_portal_about_page_url: str
    customer_portal_data_privacy_url: str
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

    # map of lang_code -> [text type -> text content]
    translation_texts: dict[Language, dict[str, str]] = {}

    def is_sumup_topup_enabled(self, cfg: CoreConfig):
        return self.sumup_topup_enabled and cfg.sumup_enabled

    def is_sumup_payment_enabled(self, cfg: CoreConfig):
        return self.sumup_payment_enabled and cfg.sumup_enabled

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


class _RestrictedEventMetadata(BaseModel):
    sumup_api_key: str = ""
    sumup_affiliate_key: str = ""
    sumup_merchant_code: str = ""


class UpdateEvent(_BaseEvent, _RestrictedEventMetadata):
    pass


class PublicEventSettings(_BaseEvent):
    id: int
    languages: list[Language]


class RestrictedEventSettings(_BaseEvent, _RestrictedEventMetadata):
    id: int
    languages: list[Language]


class ObjectType(enum.Enum):
    user = "user"
    product = "product"
    ticket = "ticket"
    till = "till"
    user_role = "user_role"
    tax_rate = "tax_rate"
    user_tag = "user_tag"
    tse = "tse"
    order = "order"
    account = "account"


ALL_OBJECT_TYPES = [e for e in ObjectType]


class NewNode(BaseModel):
    name: str
    description: str
    forbidden_objects_at_node: list[ObjectType] = []
    forbidden_objects_in_subtree: list[ObjectType] = []


class Node(BaseModel):
    id: int
    parent: int
    name: str
    description: str
    event: Optional[PublicEventSettings]
    path: str
    parent_ids: list[int]
    event_node_id: Optional[int]
    parents_until_event_node: Optional[list[int]]
    forbidden_objects_at_node: list[ObjectType]
    # what results from transitive restrictions from nodes above
    computed_forbidden_objects_at_node: list[ObjectType]
    forbidden_objects_in_subtree: list[ObjectType]
    # what results from transitive restrictions from nodes above
    computed_forbidden_objects_in_subtree: list[ObjectType]
    children: list["Node"]

    @property
    def ids_to_root(self) -> list[int]:
        return self.parent_ids + [self.id]

    @property
    def ids_to_event_node(self) -> list[int] | None:
        if self.parents_until_event_node is None:
            return None

        return self.parents_until_event_node + [self.id]


class NewEvent(NewNode, UpdateEvent):
    pass


class NodeSeenByUser(Node):
    roles_at_node: list[UserRole]
    children: list["NodeSeenByUser"]

    @computed_field  # type: ignore[misc]
    @property
    def privileges_at_node(self) -> set[Privilege]:
        return set(chain.from_iterable([r.privileges for r in self.roles_at_node]))
