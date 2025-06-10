import logging
import subprocess
from pathlib import Path

import asyncpg
from pydantic import BaseModel
from sftkit.database import Connection, Database, DatabaseConfig

from stustapay.core.schema.tree import NewEvent
from stustapay.core.schema.tse import NewTse
from stustapay.core.service.tree.common import fetch_node, fetch_restricted_event_settings_for_node
from stustapay.core.service.tree.service import update_event
from stustapay.core.service.tse import create_tse

from .schema import DB_CODE_PATH, MIGRATION_PATH

logger = logging.getLogger(__name__)

CURRENT_REVISION = "6dc876fd"
DB_FUNCTION_BLACKLIST = [
    "get_default_till_dsfinvk_brand",
    "get_default_till_dsfinvk_model",
    "get_default_till_dsfinvk_software_brand",
    "hash_voucher_token",
]
DB_FUNCTION_BLACKLIST_PREFIX = None


def get_database(config: DatabaseConfig) -> Database:
    return Database(
        config=config,
        migrations_dir=MIGRATION_PATH,
        code_dir=DB_CODE_PATH,
    )


def list_revisions(db: Database):
    revisions = db.list_migrations()
    for revision in revisions:
        print(f"Revision: {revision.version}, requires revision: {revision.requires}, filename: {revision.file_name}")


async def check_revision_version(db: Database):
    revision = await db.get_current_migration_version()
    if revision != CURRENT_REVISION:
        raise RuntimeError(
            f"Invalid database revision, expected {CURRENT_REVISION}, database is at revision {revision}"
        )


async def reset_schema(db_pool: asyncpg.Pool):
    async with db_pool.acquire() as conn:
        async with conn.transaction(isolation="serializable"):
            await conn.execute("drop schema public cascade")
            await conn.execute("create schema public")


class EventTemplate(BaseModel):
    tses: list[NewTse] = []

    customer_portal_url: str = ""

    pretix_presale_enabled: bool = False
    pretix_shop_url: str | None = None
    pretix_organizer: str | None = None
    pretix_event: str | None = None
    pretix_ticket_ids: list[int] = []
    pretix_api_key: str | None = None

    sumup_payment_enabled: bool = False
    sumup_topup_enabled: bool = False
    sumup_api_key: str = ""
    sumup_affiliate_key: str = ""
    sumup_merchant_code: str = ""
    sumup_oauth_client_id: str = ""
    sumup_oauth_client_secret: str = ""
    sumup_oauth_refresh_token: str = ""


class DatabaseRestoreConfig(BaseModel):
    event_configs: dict[int, EventTemplate] = {}


async def _apply_restore_config(conn: Connection, restore_config: DatabaseRestoreConfig):
    event_nodes = await conn.fetch("select id from node where event_id is not null")
    await conn.execute(
        "update tse_signature set tse_id = null, signature_status = 'new', "
        "transaction_process_type = null, transaction_process_data = null, tse_transaction = null, "
        "tse_signaturenr = null, tse_start = null, tse_end = null, tse_signature = null, result_message = null"
    )
    await conn.execute("truncate till_tse_history")
    await conn.execute("update till set tse_id = null")
    await conn.execute("delete from tse")
    for event_node in event_nodes:
        node = await fetch_node(conn=conn, node_id=event_node["id"])
        assert node is not None
        event = await fetch_restricted_event_settings_for_node(conn=conn, node_id=node.id)
        event_dump = event.model_dump()
        del event_dump["id"]
        update = NewEvent(
            **node.model_dump(),
            **event_dump,
        )
        if node.id in restore_config.event_configs:
            cfg = restore_config.event_configs[node.id]
        else:
            cfg = EventTemplate()

        update.customer_portal_url = cfg.customer_portal_url

        update.sumup_payment_enabled = cfg.sumup_payment_enabled
        update.sumup_topup_enabled = cfg.sumup_topup_enabled
        update.sumup_affiliate_key = cfg.sumup_affiliate_key
        update.sumup_api_key = cfg.sumup_api_key
        update.sumup_merchant_code = cfg.sumup_merchant_code
        update.sumup_oauth_client_id = cfg.sumup_oauth_client_id
        update.sumup_oauth_client_secret = cfg.sumup_oauth_client_secret

        update.pretix_presale_enabled = cfg.pretix_presale_enabled
        update.pretix_event = cfg.pretix_event
        update.pretix_organizer = cfg.pretix_organizer
        update.pretix_shop_url = cfg.pretix_shop_url
        update.pretix_ticket_ids = cfg.pretix_ticket_ids
        update.pretix_api_key = cfg.pretix_api_key

        await update_event(conn=conn, node=node, event=update)
        await conn.execute(
            "update event set sumup_oauth_refresh_token = $1 where id = $2", cfg.sumup_oauth_refresh_token, event.id
        )

        for tse in cfg.tses:
            await create_tse(conn=conn, node=node, new_tse=tse)


async def load_test_dump(db: Database, dump_file: Path, restore_config: DatabaseRestoreConfig):
    ret = subprocess.run(
        [
            "pg_restore",
            "--dbname",
            db.config.dbname,
            "--no-owner",
            "--verbose",
            "--no-privileges",
            "--role",
            db.config.user,
            dump_file,
        ],
        env={
            "PGHOST": db.config.host,
            "PGPORT": str(db.config.port),
            "PGUSER": db.config.user,
        },
        check=False,
    )
    if ret.returncode != 0:
        return False

    pool = await db.create_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await _apply_restore_config(conn, restore_config)
    finally:
        await pool.close()
    return True
