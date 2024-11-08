from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.account import UserTagDetail
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import CurrentUser, Privilege
from stustapay.core.schema.user_tag import NewUserTag, NewUserTagSecret, UserTagSecret
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_node, requires_user
from stustapay.core.service.common.error import InvalidArgument, NotFound


async def fetch_user_tag_secret(conn: Connection, secret_id: int) -> UserTagSecret | None:
    return await conn.fetch_maybe_one(
        UserTagSecret,
        "select id, node_id, description, encode(key0, 'hex') as key0, encode(key1, 'hex') as key1 "
        "from user_tag_secret where id = $1",
        secret_id,
    )


async def create_user_tag_secret(conn: Connection, node_id: int, secret: NewUserTagSecret) -> UserTagSecret:
    secrets_already_exist_for_node = await conn.fetchval(
        "select exists(select from user_tag_secret where node_id = $1)", node_id
    )
    if secrets_already_exist_for_node:
        raise InvalidArgument("It is currently not supported to have multiple user tag secrets for one event")

    key0 = secret.key0.replace(" ", "")
    key1 = secret.key1.replace(" ", "")
    secret_id = await conn.fetchval(
        "insert into user_tag_secret (key0, key1, description, node_id) "
        "values (decode($1, 'hex'), decode($2, 'hex'), $3, $4) "
        "returning id",
        key0,
        key1,
        secret.description,
        node_id,
    )
    result = await fetch_user_tag_secret(conn=conn, secret_id=secret_id)
    assert result is not None
    return result


async def create_user_tags(conn: Connection, node_id: int, tags: list[NewUserTag]):
    if len(tags) == 0:
        raise InvalidArgument("List of tags to create is empty")

    for tag in tags:
        await conn.execute(
            "insert into user_tag (node_id, pin, restriction, secret_id) values ($1, $2, $3, $4)",
            node_id,
            tag.pin,
            tag.restriction.value if tag.restriction is not None else None,
            tag.secret_id,
        )


async def get_or_assign_user_tag(conn: Connection, node: Node, pin: Optional[str], uid: int) -> int:
    user_tag_id = await conn.fetchval(
        "select id from user_tag where uid = $1 and node_id = any($2)", uid, node.ids_to_root
    )
    if user_tag_id:
        return user_tag_id

    if pin is None:
        raise InvalidArgument("Chip was not activated and no pin was provided")

    user_tag_id = await conn.fetchval(
        "select id from user_tag where pin = $1 and node_id = any($2)", pin, node.ids_to_root
    )
    if user_tag_id is None:
        raise NotFound(element_type="user_tag", element_id=pin)

    await conn.fetchval("update user_tag set uid = $1 where id = $2", uid, user_tag_id)

    return user_tag_id


class UserTagService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.user_tag])
    @requires_user([Privilege.node_administration])
    async def create_user_tag_secret(
        self, *, conn: Connection, node: Node, new_secret: NewUserTagSecret
    ) -> UserTagSecret:
        return await create_user_tag_secret(conn=conn, node_id=node.id, secret=new_secret)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.user_tag])
    @requires_user([Privilege.node_administration])
    async def list_user_tag_secrets(self, *, conn: Connection, node: Node) -> list[UserTagSecret]:
        return await conn.fetch_many(
            UserTagSecret,
            "select id, node_id, description, encode(key0, 'hex') as key0, encode(key1, 'hex') as key1 "
            "from user_tag_secret where node_id = $1",
            node.id,
        )

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.user_tag])
    @requires_user([Privilege.node_administration])
    async def create_user_tags(self, *, conn: Connection, node: Node, new_user_tags: list[NewUserTag]):
        return await create_user_tags(conn=conn, node_id=node.id, tags=new_user_tags)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.user_tag])
    @requires_user([Privilege.node_administration])
    async def get_user_tag_detail(self, *, conn: Connection, node: Node, user_tag_id: int) -> Optional[UserTagDetail]:
        return await conn.fetch_maybe_one(
            UserTagDetail,
            "select * from user_tag_with_history utwh where utwh.id = $1 and utwh.node_id = any($2)",
            user_tag_id,
            node.ids_to_event_node,
        )

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def update_user_tag_comment(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, user_tag_id: int, comment: str
    ) -> UserTagDetail:
        # TODO: TREE visibility
        ret = await conn.fetchval("update user_tag set comment = $1 where id = $2 returning id", comment, user_tag_id)
        if ret is None:
            raise InvalidArgument(f"User tag {user_tag_id} does not exist")

        detail = await self.get_user_tag_detail(  # pylint: disable=unexpected-keyword-arg, missing-kwoa
            conn=conn, node_id=node.id, current_user=current_user, user_tag_id=user_tag_id
        )
        assert detail is not None
        return detail

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def find_user_tags(self, *, conn: Connection, node: Node, search_term: str) -> list[UserTagDetail]:
        return await conn.fetch_many(
            UserTagDetail,
            "select * from user_tag_with_history utwh "
            "where ((uid is not null and to_hex(uid::bigint) like $1) or lower(pin) like $1) and node_id = any($2)",
            f"%{search_term.lower()}%",
            node.ids_to_event_node,
        )
