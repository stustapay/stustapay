import re
from typing import Optional

import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.account import UserTagDetail
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import CurrentUser, Privilege, format_user_tag_uid
from stustapay.core.schema.user_tag import NewUserTag, NewUserTagSecret, UserTagSecret
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.dbservice import DBService
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_user,
    with_db_transaction,
)
from stustapay.core.service.common.error import InvalidArgument
from stustapay.framework.database import Connection


async def fetch_user_tag_secret(conn: Connection, secret_id: int) -> UserTagSecret | None:
    return await conn.fetch_maybe_one(
        UserTagSecret,
        "select id, node_id, description, encode(key0, 'hex') as key0, encode(key1, 'hex') as key1 "
        "from user_tag_secret where id = $1",
        secret_id,
    )


async def create_user_tag_secret(conn: Connection, node_id: int, secret: NewUserTagSecret) -> UserTagSecret:
    secret_id = await conn.fetchval(
        "insert into user_tag_secret (key0, key1, description, node_id) "
        "values (decode($1, 'hex'), decode($2, 'hex'), $3, $4) "
        "returning id",
        secret.key0,
        secret.key1,
        secret.description,
        node_id,
    )
    result = await fetch_user_tag_secret(conn=conn, secret_id=secret_id)
    assert result is not None
    return result


async def create_user_tags(conn: Connection, node_id: int, tags: list[NewUserTag]):
    for tag in tags:
        await conn.execute(
            "insert into user_tag (node_id, uid, pin, serial, restriction, secret_id) "
            "values ($1, $2, $3, $4, $5, $6)",
            node_id,
            tag.uid,
            tag.pin,
            tag.serial,
            tag.restriction,
            tag.secret_id,
        )


class UserTagService(DBService):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def create_user_tag_secret(
        self, *, conn: Connection, node: Node, new_secret: NewUserTagSecret
    ) -> UserTagSecret:
        # TODO: TREE visibility
        return await create_user_tag_secret(conn=conn, node_id=node.id, secret=new_secret)

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def get_user_tag_detail(self, *, conn: Connection, user_tag_uid: int) -> Optional[UserTagDetail]:
        # TODO: TREE visibility
        return await conn.fetch_maybe_one(
            UserTagDetail, "select * from user_tag_with_history utwh where user_tag_uid = $1", user_tag_uid
        )

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def update_user_tag_comment(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, user_tag_uid: int, comment: str
    ) -> UserTagDetail:
        # TODO: TREE visibility
        ret = await conn.fetchval(
            "update user_tag set comment = $1 where uid = $2 returning uid", comment, user_tag_uid
        )
        if ret is None:
            raise InvalidArgument(f"User tag {format_user_tag_uid(user_tag_uid)} does not exist")

        detail = await self.get_user_tag_detail(  # pylint: disable=unexpected-keyword-arg
            conn=conn, node_id=node.id, current_user=current_user, user_tag_uid=user_tag_uid
        )
        assert detail is not None
        return detail

    @with_db_transaction
    @requires_node()
    @requires_user([Privilege.node_administration])
    async def find_user_tags(self, *, conn: Connection, node: Node, search_term: str) -> list[UserTagDetail]:
        value_as_int = None
        if re.match("^[A-Fa-f0-9]+$", search_term):
            value_as_int = int(search_term, base=16)

        # the following query won't be able to find full uint64 tag uids as we need cast the numeric(20) to bigint in
        # order to do hex conversion in postgres, therefore loosing one bit of information as bigint is in64 not uint64
        return await conn.fetch_many(
            UserTagDetail,
            "select * from user_tag_with_history "
            "where to_hex(user_tag_uid::bigint) like $1 or user_tag_uid = $2 and node_id = any($3)",
            f"%{search_term.lower()}%",
            value_as_int,
            node.ids_to_event_node,
        )
