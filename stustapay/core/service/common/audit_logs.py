import json

from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.core.schema.audit_logs import AuditLog, AuditType
from stustapay.core.schema.tree import Node


async def fetch_audit_logs(
    conn: Connection,
    node: Node,
) -> list[AuditLog]:
    return await conn.fetch_many(
        AuditLog,
        "select a.* from audit_log as a join node as n on a.node_id = n.id where $1 = any(n.parent_ids) or n.id = $1",
        node.id,
    )


async def create_audit_log(
    conn: Connection,
    log_type: AuditType,
    node_id: int,
    content: dict | BaseModel | None = None,
    user_id: int | None = None,
    terminal_id: int | None = None,
):
    content = content or {}
    serialized_content = None
    if isinstance(content, BaseModel):
        serialized_content = content.model_dump_json()
    elif isinstance(content, dict):
        serialized_content = json.dumps(content)

    await conn.execute(
        "insert into audit_log (log_type, node_id, originating_user_id, originating_terminal_id, content) values ($1, $2, $3, $4, $5)",
        log_type.value,
        node_id,
        user_id,
        terminal_id,
        serialized_content,
    )
