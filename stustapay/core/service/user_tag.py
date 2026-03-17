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
from sftkit.error import InvalidArgument, NotFound


def _get_search_patterns(search_term: str) -> list[str]:
    patterns = []
    for token in search_term.strip().split():
        normalized_token = token.lower()
        if normalized_token.startswith("0x") and len(normalized_token) > 2:
            normalized_token = normalized_token[2:]
        patterns.append(f"%{normalized_token}%")
    return patterns


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
            "insert into user_tag (node_id, pin, restriction, secret_id, uid, is_vip, comment, group_tag) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8)",
            node_id,
            tag.pin,
            tag.restriction.value if tag.restriction is not None else None,
            tag.secret_id,
            tag.uid,
            tag.is_vip,
            tag.comment,
            tag.group_tag,
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


async def create_accounts_for_tags(
    conn: Connection, node_id: int, user_tag_ids: list[int] | None = None
) -> dict[str, int]:
    """
    Create customer accounts for user tags that don't have accounts yet.
    If user_tag_ids is None, creates accounts for all tags without accounts in the node.
    Returns dict with 'created' and 'skipped' counts.
    """
    if user_tag_ids is not None and len(user_tag_ids) == 0:
        return {"created": 0, "skipped": 0}

    # Find tags without accounts
    if user_tag_ids is None:
        # Get all tags in the node that don't have accounts
        tags_without_accounts = await conn.fetch(
            """
            select ut.id
            from user_tag ut
            left join account a on a.user_tag_id = ut.id
            where ut.node_id = $1 and a.id is null
            """,
            node_id,
        )
    else:
        # Get specified tags that don't have accounts
        tags_without_accounts = await conn.fetch(
            """
            select ut.id
            from user_tag ut
            left join account a on a.user_tag_id = ut.id
            where ut.id = any($1) and ut.node_id = $2 and a.id is null
            """,
            user_tag_ids,
            node_id,
        )

    created_count = 0
    skipped_count = 0

    # Count skipped (tags that already have accounts) BEFORE creating new accounts
    if user_tag_ids is not None:
        tags_with_accounts = await conn.fetchval(
            """
            select count(*)
            from user_tag ut
            join account a on a.user_tag_id = ut.id
            where ut.id = any($1) and ut.node_id = $2
            """,
            user_tag_ids,
            node_id,
        )
        skipped_count = tags_with_accounts or 0

    # Get event node ID (accounts should be created at event node level)
    event_node_id = await conn.fetchval("select event_node_id from node where id = $1", node_id)
    if event_node_id is None:
        raise InvalidArgument("Could not find event node for account creation")

    for tag_row in tags_without_accounts:
        tag_id = tag_row["id"]
        # Create account for this tag
        await conn.execute(
            "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private')",
            event_node_id,
            tag_id,
        )
        created_count += 1

    return {"created": created_count, "skipped": skipped_count}


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
        ret = await conn.fetchval(
            "update user_tag set comment = $1 where id = $2 and node_id = $3 returning id",
            comment,
            user_tag_id,
            node.id,
        )
        if ret is None:
            raise InvalidArgument(f"User tag {user_tag_id} does not exist")

        detail = await self.get_user_tag_detail(  # pylint: disable=unexpected-keyword-arg, missing-kwoa
            conn=conn, node_id=node.id, current_user=current_user, user_tag_id=user_tag_id
        )
        assert detail is not None
        return detail

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def update_user_tag_vip_status(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, user_tag_id: int, is_vip: bool  # pylint: disable=unused-argument
    ) -> UserTagDetail:
        # TODO: TREE visibility
        ret = await conn.fetchval("update user_tag set is_vip = $1 where id = $2 returning id", is_vip, user_tag_id)
        if ret is None:
            raise InvalidArgument(f"User tag {user_tag_id} does not exist")

        detail = await self.get_user_tag_detail(  # pylint: disable=unexpected-keyword-arg, missing-kwoa
            conn=conn, node_id=node.id, current_user=current_user, user_tag_id=user_tag_id
        )
        assert detail is not None
        return detail

    @with_db_transaction
    @requires_node(event_only=True)
    @requires_user([Privilege.node_administration])
    async def update_user_tag_group_tag(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, user_tag_id: int, group_tag: Optional[str]
    ) -> UserTagDetail:
        ret = await conn.fetchval(
            "update user_tag set group_tag = $1 where id = $2 and node_id = $3 returning id",
            group_tag,
            user_tag_id,
            node.id,
        )
        if ret is None:
            raise InvalidArgument(f"User tag {user_tag_id} does not exist")

        detail = await self.get_user_tag_detail(  # pylint: disable=unexpected-keyword-arg, missing-kwoa
            conn=conn, node_id=node.id, current_user=current_user, user_tag_id=user_tag_id
        )
        assert detail is not None
        return detail

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True)
    @requires_user([Privilege.entry_management])
    async def find_user_tags(self, *, conn: Connection, node: Node, search_term: str) -> list[UserTagDetail]:
        search_patterns = _get_search_patterns(search_term)
        # Try to parse search term as integer for UID search
        search_uid: int | None = None
        try:
            # Try decimal first
            search_uid = int(search_term.strip())
        except ValueError:
            try:
                # Try hex (with or without 0x prefix)
                search_term_clean = search_term.strip().replace("0x", "").replace("0X", "")
                search_uid = int(search_term_clean, 16)
            except ValueError:
                pass

        if search_uid is not None:
            # Search by exact UID, and case-insensitive partial matches on text fields.
            return await conn.fetch_many(
                UserTagDetail,
                "select * from user_tag_with_history utwh "
                "where node_id = any($2) and ("
                "   uid = $1 "
                "   or not exists ("
                "       select 1 from unnest($3::text[]) as token(pattern) "
                "       where not ("
                "           coalesce(pin, '') ilike token.pattern "
                "           or coalesce(comment, '') ilike token.pattern "
                "           or coalesce(group_tag, '') ilike token.pattern "
                "           or (uid is not null and to_hex(uid::bigint) ilike token.pattern)"
                "       )"
                "   )"
                ")",
                search_uid,
                node.ids_to_event_node,
                search_patterns,
            )
        else:
            return await conn.fetch_many(
                UserTagDetail,
                "select * from user_tag_with_history utwh "
                "where node_id = any($1) and not exists ("
                "   select 1 from unnest($2::text[]) as token(pattern) "
                "   where not ("
                "       coalesce(pin, '') ilike token.pattern "
                "       or coalesce(comment, '') ilike token.pattern "
                "       or coalesce(group_tag, '') ilike token.pattern "
                "       or (uid is not null and to_hex(uid::bigint) ilike token.pattern)"
                "   )"
                ")",
                node.ids_to_event_node,
                search_patterns,
            )

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.user_tag])
    @requires_user([Privilege.node_administration])
    async def create_accounts_for_tags(
        self, *, conn: Connection, node: Node, user_tag_ids: list[int] | None = None
    ) -> dict[str, int]:
        return await create_accounts_for_tags(conn=conn, node_id=node.id, user_tag_ids=user_tag_ids)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.user_tag])
    @requires_user([Privilege.node_administration])
    async def count_tags_without_accounts(self, *, conn: Connection, node: Node) -> int:
        """Count how many tags in the node don't have accounts yet."""
        count = await conn.fetchval(
            """
            select count(*)
            from user_tag ut
            left join account a on a.user_tag_id = ut.id
            where ut.node_id = $1 and a.id is null
            """,
            node.id,
        )
        return count or 0
