from uuid import UUID

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_connection

from stustapay.core.config import Config
from stustapay.core.schema.media import Blob, NewBlob
from stustapay.core.service.auth import AuthService


async def store_blob(*, conn: Connection, blob: NewBlob) -> int:
    blob_id = await conn.fetchval(
        "insert into blob (data, mime_type) values ($1, $2) returning id", blob.data_as_bytes(), blob.mime_type
    )
    return blob_id


async def fetch_blob(*, conn: Connection, blob_id: UUID) -> Blob:
    return await conn.fetch_one(Blob, "select b.id, b.data, b.mime_type from blob b where id = $1", blob_id)


async def delete_blob(*, conn: Connection, blob_id: UUID):
    await conn.execute("delete from blob where id = $1", blob_id)


class MediaService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_connection
    async def get_blob(self, *, conn: Connection, blob_id: UUID) -> Blob:
        return await fetch_blob(conn=conn, blob_id=blob_id)
