import enum
from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator

from stustapay.core.config import CoreConfig
from stustapay.core.schema.config import SEPAConfig, SMTPConfig
from stustapay.core.schema.language import Language
from stustapay.core.schema.sumup import ResolvedSumUpLink
from stustapay.core.schema.user import Privilege

ROOT_NODE_ID = 0
INITIAL_EVENT_NODE_ID = 1


class _BaseEvent(BaseModel):
    currency_identifier: str
    max_account_balance: float
    vip_max_account_balance: float = 300.0  # Default VIP balance limit

    start_date: datetime | None = None
    end_date: datetime | None = None
    daily_end_time: time | None = None
    expected_visitors_per_day: int | None = None
    post_payment_allowed: bool = False

    sumup_topup_enabled: bool
    sumup_payment_enabled: bool

    customer_portal_url: str
    customer_portal_about_page_url: str
    customer_portal_data_privacy_url: str
    customer_portal_contact_email: EmailStr

    pretix_presale_enabled: bool
    pretix_shop_url: str | None
    pretix_organizer: str | None
    pretix_event: str | None
    pretix_ticket_ids: list[int] | None

    ust_id: str
    bon_issuer: str
    bon_address: str
    bon_title: str

    sepa_enabled: bool
    sepa_sender_name: str
    sepa_sender_iban: str
    sepa_description: str
    sepa_max_num_payouts_in_run: int
    sepa_allowed_country_codes: list[str]

    # email configs
    email_enabled: bool
    email_default_sender: str | None = None
    email_smtp_host: str | None = None
    email_smtp_port: int | None = None
    email_smtp_username: str | None = None

    payout_done_subject: str | None = None
    payout_done_message: str | None = None
    payout_registered_subject: str | None = None
    payout_registered_message: str | None = None
    payout_sender: str | None = None

    donation_enabled: bool = True

    # customer portal banner image URL (computed from stored image)
    customer_portal_banner_image_url: str | None = None

    # theme colors
    customer_portal_primary_color: str | None = None
    customer_portal_secondary_color: str | None = None
    customer_portal_background_color: str | None = None

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
            max_num_payouts_in_run=self.sepa_max_num_payouts_in_run,
        )


class _RestrictedEventMetadata(BaseModel):
    sumup_api_key: str = ""
    sumup_affiliate_key: str = ""
    sumup_merchant_code: str = ""
    sumup_oauth_client_id: str = ""
    sumup_oauth_client_secret: str = ""

    pretix_api_key: str | None

    email_smtp_password: str | None = None
    wifi_ssid: str | None = None
    wifi_passphrase: str | None = None

    @field_validator("wifi_ssid", "wifi_passphrase", mode="before")
    @classmethod
    def _normalize_empty_wifi_value(cls, value: str | None):
        if isinstance(value, str) and value.strip() == "":
            return None
        return value

    @model_validator(mode="after")
    def _validate_wifi_settings(self):
        if (self.wifi_ssid is None) != (self.wifi_passphrase is None):
            raise ValueError("wifi_ssid and wifi_passphrase must either both be set or both be empty")
        return self


class UpdateEvent(_BaseEvent, _RestrictedEventMetadata):
    sepa_max_num_payouts_in_run: int | None = None  # type: ignore


class PublicEventSettings(_BaseEvent):
    id: int
    languages: list[Language]


class RestrictedEventSettings(_BaseEvent, _RestrictedEventMetadata):
    id: int
    languages: list[Language]
    sumup_oauth_refresh_token: str
    resolved_sumup_link: ResolvedSumUpLink | None = None
    sumup_global_oauth_configured: bool = False
    sumup_global_affiliate_key_configured: bool = False
    sumup_legacy_api_key_configured: bool = False
    sumup_legacy_oauth_configured: bool = False

    @property
    def smtp_config(self) -> SMTPConfig | None:
        if not self.email_enabled:
            return None
        return SMTPConfig(
            smtp_host=self.email_smtp_host,
            smtp_port=self.email_smtp_port,
            smtp_username=self.email_smtp_username,
            smtp_password=self.email_smtp_password,
        )


class ObjectType(enum.Enum):
    user = "user"
    product = "product"
    ticket = "ticket"
    till = "till"
    user_role = "user_role"
    tax_rate = "tax_rate"
    user_tag = "user_tag"
    tse = "tse"
    account = "account"
    terminal = "terminal"
    entry_area = "entry_area"
    entry_group = "entry_group"


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
    read_only: bool
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


class EventSummary(BaseModel):
    node_id: int
    node_name: str
    path: str
    description: str
    event_id: int
    event_name: str
    start_date: datetime | None = None
    end_date: datetime | None = None


class NewEvent(NewNode, UpdateEvent):
    pass


class NodeSeenByUser(Node):
    privileges_at_node: set[Privilege]
    children: list["NodeSeenByUser"]  # type: ignore


class CopyEventOptions(BaseModel):
    """Options for copying an event with selective components."""

    # Copy event settings/configuration
    copy_event_settings: bool = True

    # Copy user tags (with their secrets and restrictions)
    copy_user_tags: bool = True

    # Copy account balances (current balances for accounts)
    copy_account_balances: bool = False

    # Copy tills (layouts, profiles, buttons, registers)
    copy_tills: bool = True

    # Copy terminals
    copy_terminals: bool = True

    # Copy users and roles
    copy_users: bool = True

    # Copy products and tax rates
    copy_products: bool = True

    # Copy TSE devices
    copy_tse_devices: bool = True

    # Copy sub-nodes
    copy_sub_nodes: bool = True


class CopyEventRequest(BaseModel):
    """Request to copy an event with specified options."""

    name: str
    description: str
    options: CopyEventOptions
