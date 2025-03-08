from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.till import NewTillProfile, TillProfile
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import Privilege
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.core.service.user import AuthService


async def _get_profile(*, conn: Connection, node: Node, profile_id: int) -> Optional[TillProfile]:
    return await conn.fetch_maybe_one(
        TillProfile,
        "select * from till_profile where id = $1 and node_id = any($2)",
        profile_id,
        node.ids_to_event_node,
    )


class TillProfileService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def create_profile(self, *, conn: Connection, node: Node, profile: NewTillProfile) -> TillProfile:
        profile_id = await conn.fetchval(
            "insert into till_profile (node_id, name, description, allow_top_up, allow_cash_out, "
            "allow_ticket_sale, enable_ssp_payment, enable_cash_payment, enable_card_payment, layout_id) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) "
            "returning id",
            node.id,
            profile.name,
            profile.description,
            profile.allow_top_up,
            profile.allow_cash_out,
            profile.allow_ticket_sale,
            profile.enable_ssp_payment,
            profile.enable_cash_payment,
            profile.enable_card_payment,
            profile.layout_id,
        )

        resulting_profile = await _get_profile(conn=conn, node=node, profile_id=profile_id)
        assert resulting_profile is not None
        return resulting_profile

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_profiles(self, *, conn: Connection, node: Node) -> list[TillProfile]:
        return await conn.fetch_many(
            TillProfile, "select * from till_profile where node_id = any($1) order by name", node.ids_to_event_node
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def get_profile(self, *, conn: Connection, node: Node, profile_id: int) -> Optional[TillProfile]:
        return await _get_profile(conn=conn, node=node, profile_id=profile_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def update_profile(
        self, *, conn: Connection, node: Node, profile_id: int, profile: NewTillProfile
    ) -> Optional[TillProfile]:
        p_id = await conn.fetchval(
            "update till_profile set name = $2, description = $3, allow_top_up = $4, allow_cash_out = $5, "
            "   allow_ticket_sale = $6, enable_ssp_payment = $7, enable_cash_payment = $8, "
            "   enable_card_payment = $9, layout_id = $10 "
            "where id = $1 and node_id = any($11) returning id ",
            profile_id,
            profile.name,
            profile.description,
            profile.allow_top_up,
            profile.allow_cash_out,
            profile.allow_ticket_sale,
            profile.enable_ssp_payment,
            profile.enable_cash_payment,
            profile.enable_card_payment,
            profile.layout_id,
            node.ids_to_event_node,
        )
        if p_id is None:
            return None

        resulting_profile = await _get_profile(conn=conn, node=node, profile_id=profile_id)
        assert resulting_profile is not None
        return resulting_profile

    @with_db_transaction
    @requires_node(object_types=[ObjectType.till])
    @requires_user([Privilege.node_administration])
    async def delete_profile(self, *, conn: Connection, node: Node, till_profile_id: int) -> bool:
        result = await conn.execute("delete from till_profile where id = $1 and node_id = $2", till_profile_id, node.id)
        return result != "DELETE 0"
