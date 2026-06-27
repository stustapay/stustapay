from datetime import date

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import NodePrivilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.core.service.common.error import InvalidArgument
from stustapay.dsfinvk.ao146a_xml_generator import AO146Aexporter
from stustapay.dsfinvk.generator import DEFAULT_DTD, DEFAULT_INDEX_XML
from stustapay.dsfinvk.generator import Generator as DsfinvkGenerator


class DsfinvkService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def export_dsfinvk(self, *, conn: Connection, node: Node) -> bytes:
        generator = DsfinvkGenerator(
            config=self.config,
            event_node_id=node.id,
            filename="",
            xml=str(DEFAULT_INDEX_XML),
            dtd=str(DEFAULT_DTD),
            simulate=False,
        )
        content = await generator.generate(conn)
        if content is None:
            raise InvalidArgument("Export produced no data")
        return content

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def export_ao146a(self, *, conn: Connection, node: Node, shutdown_date: date | None = None) -> bytes:
        exporter = AO146Aexporter(
            config=self.config,
            event_node_id=node.id,
            filename="",
            shutdown_date=shutdown_date,
        )
        return await exporter.generate(conn)
