import enum

from pydantic import BaseModel


class SumUpConnectionSource(enum.Enum):
    node_link = "node_link"
    legacy_event_oauth = "legacy_event_oauth"
    legacy_event_api_key = "legacy_event_api_key"


class ResolvedSumUpLink(BaseModel):
    source: SumUpConnectionSource
    source_node_id: int
    source_node_name: str
    merchant_code: str
    merchant_name: str | None = None
    inherited: bool = False


class NodeSumUpConnectionStatus(BaseModel):
    node_id: int
    node_name: str
    connected: bool
    merchant_code: str | None = None
    merchant_name: str | None = None
    linked_event_count: int = 0
    oauth_client_id: str = ""
    oauth_configured: bool = False
    affiliate_key_configured: bool = False
