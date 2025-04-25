import json

from pydantic import BaseModel
from sftkit.database import Connection

from stustapay.core.schema.audit_logs import AuditLog, AuditLogDetail, AuditType
from stustapay.core.schema.tree import Node


async def fetch_audit_logs(
    conn: Connection,
    node: Node,
) -> list[AuditLog]:
    return await conn.fetch_many(
        AuditLog,
        "select a.id, a.created_at, a.node_id, a.log_type, a.originating_user_id, a.originating_terminal_id "
        "from audit_log as a join node as n on a.node_id = n.id where $1 = any(n.parent_ids) or n.id = $1",
        node.id,
    )


async def fetch_audit_log(
    conn: Connection,
    node: Node,
    audit_log_id: int,
) -> AuditLogDetail:
    row = await conn.fetchrow(
        "select a.id, a.created_at, a.node_id, a.log_type, a.originating_user_id, a.originating_terminal_id, a.content "
        "from audit_log as a join node as n on a.node_id = n.id where $1 = any(n.parent_ids) or n.id = $1 and a.id = $2",
        node.id,
        audit_log_id,
    )
    content = row["content"]

    return AuditLogDetail(
        id=row["id"],
        created_at=row["created_at"],
        node_id=row["node_id"],
        log_type=row["log_type"],
        originating_user_id=row["originating_user_id"],
        originating_terminal_id=row["originating_terminal_id"],
        content=json.loads(content) if content is not None else None,
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
