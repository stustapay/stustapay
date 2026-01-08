import csv
import io
from datetime import datetime, timezone

import asyncpg
from sftkit.database import Connection
from sftkit.error import InvalidArgument, NotFound
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.entry import (
    EntryArea,
    EntryAreaGroup,
    EntryAreaGroupAssignPayload,
    EntryAreaGroupWithGroup,
    EntryAreaGroupWindow,
    EntryDirection,
    EntryGroup,
    EntryGroupMember,
    EntryGroupMemberAddPayload,
    EntryGroupMemberAddByGroupTagPayload,
    EntryScanLog,
    EntryScanLogQuery,
    EntryScanResult,
    NewEntryArea,
    NewEntryAreaGroupWindow,
    NewEntryGroup,
)
from stustapay.core.schema.terminal import CurrentTerminal, TerminalMode
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import Privilege
from stustapay.core.service.auth import AuthService
from stustapay.core.service.common.decorators import requires_node, requires_terminal, requires_user
from stustapay.core.service.tree.common import fetch_event_node_for_node


ENTRY_REASON_ALREADY_INSIDE = "already_inside"
ENTRY_REASON_NOT_INSIDE = "not_inside"
ENTRY_REASON_NOT_IN_GROUP = "not_in_group"
ENTRY_REASON_OUTSIDE_WINDOW = "outside_window"
ENTRY_REASON_UNKNOWN_TAG = "unknown_tag"
ENTRY_REASON_TERMINAL_MODE = "terminal_wrong_mode"
ENTRY_REASON_TERMINAL_CONFIG = "terminal_not_configured"
ENTRY_REASON_AREA_NOT_FOUND = "area_not_found"


async def _fetch_entry_area(conn: Connection, node: Node, area_id: int) -> EntryArea | None:
    return await conn.fetch_maybe_one(
        EntryArea,
        "select * from entry_area where id = $1 and node_id = any($2)",
        area_id,
        node.ids_to_root,
    )


async def _fetch_entry_group(conn: Connection, node: Node, group_id: int) -> EntryGroup | None:
    return await conn.fetch_maybe_one(
        EntryGroup,
        "select * from entry_group where id = $1 and node_id = any($2)",
        group_id,
        node.ids_to_root,
    )


class EntryService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def list_entry_areas(self, *, conn: Connection, node: Node) -> list[EntryArea]:
        return await conn.fetch_many(
            EntryArea,
            "select * from entry_area where node_id = $1 order by name",
            node.id,
        )

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def create_entry_area(self, *, conn: Connection, node: Node, area: NewEntryArea) -> EntryArea:
        area_id = await conn.fetchval(
            "insert into entry_area (node_id, name, description) values ($1, $2, $3) returning id",
            node.id,
            area.name,
            area.description,
        )
        created_area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        assert created_area is not None
        return created_area

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def get_entry_area(self, *, conn: Connection, node: Node, area_id: int) -> EntryArea | None:
        return await _fetch_entry_area(conn=conn, node=node, area_id=area_id)

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def update_entry_area(self, *, conn: Connection, node: Node, area_id: int, area: NewEntryArea) -> EntryArea:
        updated = await conn.fetchval(
            "update entry_area set name = $1, description = $2 where id = $3 and node_id = $4 returning id",
            area.name,
            area.description,
            area_id,
            node.id,
        )
        if updated is None:
            raise NotFound(element_type="entry_area", element_id=area_id)
        updated_area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        assert updated_area is not None
        return updated_area

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def delete_entry_area(self, *, conn: Connection, node: Node, area_id: int) -> bool:
        result = await conn.execute("delete from entry_area where id = $1 and node_id = $2", area_id, node.id)
        return result != "DELETE 0"

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def list_entry_groups(self, *, conn: Connection, node: Node) -> list[EntryGroup]:
        return await conn.fetch_many(
            EntryGroup,
            "select * from entry_group where node_id = $1 order by name",
            node.id,
        )

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def create_entry_group(self, *, conn: Connection, node: Node, group: NewEntryGroup) -> EntryGroup:
        group_id = await conn.fetchval(
            "insert into entry_group (node_id, name, description) values ($1, $2, $3) returning id",
            node.id,
            group.name,
            group.description,
        )
        created_group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        assert created_group is not None
        return created_group

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def get_entry_group(self, *, conn: Connection, node: Node, group_id: int) -> EntryGroup | None:
        return await _fetch_entry_group(conn=conn, node=node, group_id=group_id)

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def update_entry_group(self, *, conn: Connection, node: Node, group_id: int, group: NewEntryGroup) -> EntryGroup:
        updated = await conn.fetchval(
            "update entry_group set name = $1, description = $2 where id = $3 and node_id = $4 returning id",
            group.name,
            group.description,
            group_id,
            node.id,
        )
        if updated is None:
            raise NotFound(element_type="entry_group", element_id=group_id)
        updated_group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        assert updated_group is not None
        return updated_group

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def delete_entry_group(self, *, conn: Connection, node: Node, group_id: int) -> bool:
        result = await conn.execute("delete from entry_group where id = $1 and node_id = $2", group_id, node.id)
        return result != "DELETE 0"

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def list_entry_area_groups(self, *, conn: Connection, node: Node, area_id: int) -> list[EntryAreaGroupWithGroup]:
        area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        if area is None:
            raise NotFound(element_type="entry_area", element_id=area_id)
        return await conn.fetch_many(
            EntryAreaGroupWithGroup,
            "select ag.id, ag.area_id, ag.group_id, g.name as group_name, g.description as group_description "
            "from entry_area_group ag "
            "join entry_group g on g.id = ag.group_id "
            "where ag.area_id = $1 order by g.name",
            area_id,
        )

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def assign_entry_group_to_area(
        self, *, conn: Connection, node: Node, area_id: int, payload: EntryAreaGroupAssignPayload
    ) -> EntryAreaGroup:
        area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        if area is None:
            raise NotFound(element_type="entry_area", element_id=area_id)
        group = await _fetch_entry_group(conn=conn, node=node, group_id=payload.group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=payload.group_id)

        area_group_id = await conn.fetchval(
            "insert into entry_area_group (area_id, group_id) values ($1, $2) "
            "on conflict (area_id, group_id) do update set area_id = excluded.area_id returning id",
            area_id,
            payload.group_id,
        )
        area_group = await conn.fetch_maybe_one(
            EntryAreaGroup,
            "select * from entry_area_group where id = $1",
            area_group_id,
        )
        assert area_group is not None
        return area_group

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def remove_entry_group_from_area(self, *, conn: Connection, node: Node, area_id: int, group_id: int) -> bool:
        area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        if area is None:
            raise NotFound(element_type="entry_area", element_id=area_id)
        result = await conn.execute(
            "delete from entry_area_group where area_id = $1 and group_id = $2",
            area_id,
            group_id,
        )
        return result != "DELETE 0"

    async def _get_area_group_id(self, conn: Connection, area_id: int, group_id: int) -> int:
        area_group_id = await conn.fetchval(
            "select id from entry_area_group where area_id = $1 and group_id = $2",
            area_id,
            group_id,
        )
        if area_group_id is None:
            raise NotFound(element_type="entry_area_group", element_id=f"{area_id}:{group_id}")
        return area_group_id

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def list_entry_area_group_windows(
        self, *, conn: Connection, node: Node, area_id: int, group_id: int
    ) -> list[EntryAreaGroupWindow]:
        area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        if area is None:
            raise NotFound(element_type="entry_area", element_id=area_id)
        group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=group_id)
        area_group_id = await self._get_area_group_id(conn=conn, area_id=area_id, group_id=group_id)
        return await conn.fetch_many(
            EntryAreaGroupWindow,
            "select * from entry_area_group_window where area_group_id = $1 order by start_at",
            area_group_id,
        )

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def create_entry_area_group_window(
        self, *, conn: Connection, node: Node, area_id: int, group_id: int, window: NewEntryAreaGroupWindow
    ) -> EntryAreaGroupWindow:
        if window.start_at >= window.end_at:
            raise InvalidArgument("Window end time must be after start time")
        area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        if area is None:
            raise NotFound(element_type="entry_area", element_id=area_id)
        group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=group_id)
        area_group_id = await self._get_area_group_id(conn=conn, area_id=area_id, group_id=group_id)
        window_id = await conn.fetchval(
            "insert into entry_area_group_window (area_group_id, start_at, end_at) values ($1, $2, $3) returning id",
            area_group_id,
            window.start_at,
            window.end_at,
        )
        created_window = await conn.fetch_maybe_one(
            EntryAreaGroupWindow,
            "select * from entry_area_group_window where id = $1",
            window_id,
        )
        assert created_window is not None
        return created_window

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def update_entry_area_group_window(
        self,
        *,
        conn: Connection,
        node: Node,
        area_id: int,
        group_id: int,
        window_id: int,
        window: NewEntryAreaGroupWindow,
    ) -> EntryAreaGroupWindow:
        if window.start_at >= window.end_at:
            raise InvalidArgument("Window end time must be after start time")
        area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        if area is None:
            raise NotFound(element_type="entry_area", element_id=area_id)
        group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=group_id)
        area_group_id = await self._get_area_group_id(conn=conn, area_id=area_id, group_id=group_id)
        updated = await conn.fetchval(
            "update entry_area_group_window set start_at = $1, end_at = $2 "
            "where id = $3 and area_group_id = $4 returning id",
            window.start_at,
            window.end_at,
            window_id,
            area_group_id,
        )
        if updated is None:
            raise NotFound(element_type="entry_area_group_window", element_id=window_id)
        updated_window = await conn.fetch_maybe_one(
            EntryAreaGroupWindow,
            "select * from entry_area_group_window where id = $1",
            window_id,
        )
        assert updated_window is not None
        return updated_window

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def delete_entry_area_group_window(
        self, *, conn: Connection, node: Node, area_id: int, group_id: int, window_id: int
    ) -> bool:
        area = await _fetch_entry_area(conn=conn, node=node, area_id=area_id)
        if area is None:
            raise NotFound(element_type="entry_area", element_id=area_id)
        group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=group_id)
        area_group_id = await self._get_area_group_id(conn=conn, area_id=area_id, group_id=group_id)
        result = await conn.execute(
            "delete from entry_area_group_window where id = $1 and area_group_id = $2",
            window_id,
            area_group_id,
        )
        return result != "DELETE 0"

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def list_entry_group_members(self, *, conn: Connection, node: Node, group_id: int) -> list[EntryGroupMember]:
        group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=group_id)
        return await conn.fetch_many(
            EntryGroupMember,
            "select ut.id as user_tag_id, ut.uid as user_tag_uid, ut.pin as user_tag_pin, "
            "ut.comment, ut.is_vip "
            "from entry_group_user_tag egut "
            "join user_tag ut on ut.id = egut.user_tag_id "
            "where egut.group_id = $1 and ut.node_id = $2 "
            "order by ut.pin",
            group_id,
            node.id,
        )

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def add_entry_group_member(
        self, *, conn: Connection, node: Node, group_id: int, payload: EntryGroupMemberAddPayload
    ) -> EntryGroupMember:
        group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=group_id)

        user_tag_id = payload.user_tag_id
        if user_tag_id is None and payload.user_tag_uid is None:
            raise InvalidArgument("Either user_tag_id or user_tag_uid must be provided")
        if user_tag_id is None:
            user_tag_id = await conn.fetchval(
                "select id from user_tag where uid = $1 and node_id = $2",
                payload.user_tag_uid,
                node.id,
            )
            if user_tag_id is None:
                raise NotFound(element_type="user_tag", element_id=payload.user_tag_uid)
        else:
            exists = await conn.fetchval(
                "select exists(select 1 from user_tag where id = $1 and node_id = $2)",
                user_tag_id,
                node.id,
            )
            if not exists:
                raise NotFound(element_type="user_tag", element_id=user_tag_id)

        await conn.execute(
            "insert into entry_group_user_tag (group_id, user_tag_id) values ($1, $2) "
            "on conflict (group_id, user_tag_id) do nothing",
            group_id,
            user_tag_id,
        )
        member = await conn.fetch_maybe_one(
            EntryGroupMember,
            "select ut.id as user_tag_id, ut.uid as user_tag_uid, ut.pin as user_tag_pin, "
            "ut.comment, ut.is_vip "
            "from user_tag ut where ut.id = $1 and ut.node_id = $2",
            user_tag_id,
            node.id,
        )
        if member is None:
            raise NotFound(element_type="user_tag", element_id=user_tag_id)
        return member

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def add_entry_group_members_by_group_tag(
        self, *, conn: Connection, node: Node, group_id: int, payload: EntryGroupMemberAddByGroupTagPayload
    ) -> list[EntryGroupMember]:
        group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=group_id)

        group_tag = payload.group_tag.strip()
        if not group_tag:
            raise InvalidArgument("Group tag must not be empty")

        exists = await conn.fetchval(
            "select exists(select 1 from user_tag where node_id = $1 and group_tag = $2)",
            node.id,
            group_tag,
        )
        if not exists:
            raise NotFound(element_type="user_tag_group_tag", element_id=group_tag)

        await conn.execute(
            "insert into entry_group_user_tag (group_id, user_tag_id) "
            "select $1, ut.id from user_tag ut where ut.node_id = $2 and ut.group_tag = $3 "
            "on conflict (group_id, user_tag_id) do nothing",
            group_id,
            node.id,
            group_tag,
        )

        return await conn.fetch_many(
            EntryGroupMember,
            "select ut.id as user_tag_id, ut.uid as user_tag_uid, ut.pin as user_tag_pin, "
            "ut.comment, ut.is_vip "
            "from entry_group_user_tag egut "
            "join user_tag ut on ut.id = egut.user_tag_id "
            "where egut.group_id = $1 and ut.node_id = $2 and ut.group_tag = $3 "
            "order by ut.pin",
            group_id,
            node.id,
            group_tag,
        )

    @with_db_transaction
    @requires_node(event_only=True, object_types=[ObjectType.entry_group])
    @requires_user([Privilege.entry_management])
    async def remove_entry_group_member(self, *, conn: Connection, node: Node, group_id: int, user_tag_id: int) -> bool:
        group = await _fetch_entry_group(conn=conn, node=node, group_id=group_id)
        if group is None:
            raise NotFound(element_type="entry_group", element_id=group_id)
        result = await conn.execute(
            "delete from entry_group_user_tag where group_id = $1 and user_tag_id = $2",
            group_id,
            user_tag_id,
        )
        return result != "DELETE 0"

    async def _insert_scan_log(
        self,
        *,
        conn: Connection,
        node_id: int,
        terminal_id: int,
        area_id: int,
        direction: EntryDirection,
        user_tag_id: int | None,
        user_tag_uid: int,
        allowed: bool,
        reason: str,
        area_group_id: int | None,
        scanned_at: datetime,
    ) -> int:
        return await conn.fetchval(
            "insert into entry_scan_log "
            "(node_id, terminal_id, area_id, direction, user_tag_id, user_tag_uid, allowed, reason, area_group_id, scanned_at) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id",
            node_id,
            terminal_id,
            area_id,
            direction.value,
            user_tag_id,
            user_tag_uid,
            allowed,
            reason,
            area_group_id,
            scanned_at,
        )

    @with_db_transaction
    @requires_terminal(requires_till=False)
    async def scan_entry(
        self, *, conn: Connection, current_terminal: CurrentTerminal, tag_uid: int
    ) -> EntryScanResult:
        scanned_at = datetime.now(timezone.utc)
        if current_terminal.mode not in (TerminalMode.entry, TerminalMode.exit):
            return EntryScanResult(
                allowed=False,
                reason=ENTRY_REASON_TERMINAL_MODE,
                direction=EntryDirection.entry,
                area_id=None,
                area_name=None,
                group_id=None,
                group_name=None,
                is_inside=None,
                scanned_at=scanned_at,
            )

        if current_terminal.entry_area_id is None:
            return EntryScanResult(
                allowed=False,
                reason=ENTRY_REASON_TERMINAL_CONFIG,
                direction=EntryDirection.entry if current_terminal.mode == TerminalMode.entry else EntryDirection.exit,
                area_id=None,
                area_name=None,
                group_id=None,
                group_name=None,
                is_inside=None,
                scanned_at=scanned_at,
            )

        event_node = await fetch_event_node_for_node(conn=conn, node_id=current_terminal.node_id)
        assert event_node is not None

        area = await _fetch_entry_area(conn=conn, node=event_node, area_id=current_terminal.entry_area_id)
        if area is None:
            return EntryScanResult(
                allowed=False,
                reason=ENTRY_REASON_AREA_NOT_FOUND,
                direction=EntryDirection.entry if current_terminal.mode == TerminalMode.entry else EntryDirection.exit,
                area_id=current_terminal.entry_area_id,
                area_name=None,
                group_id=None,
                group_name=None,
                is_inside=None,
                scanned_at=scanned_at,
            )

        direction = EntryDirection.entry if current_terminal.mode == TerminalMode.entry else EntryDirection.exit

        user_tag = await conn.fetchrow(
            "select id, uid from user_tag where uid = $1 and node_id = any($2)",
            tag_uid,
            event_node.ids_to_root,
        )

        if user_tag is None:
            await self._insert_scan_log(
                conn=conn,
                node_id=area.node_id,
                terminal_id=current_terminal.id,
                area_id=area.id,
                direction=direction,
                user_tag_id=None,
                user_tag_uid=tag_uid,
                allowed=False,
                reason=ENTRY_REASON_UNKNOWN_TAG,
                area_group_id=None,
                scanned_at=scanned_at,
            )
            return EntryScanResult(
                allowed=False,
                reason=ENTRY_REASON_UNKNOWN_TAG,
                direction=direction,
                area_id=area.id,
                area_name=area.name,
                group_id=None,
                group_name=None,
                is_inside=None,
                scanned_at=scanned_at,
            )

        user_tag_id = user_tag["id"]
        current_inside = await conn.fetchval(
            "select is_inside from entry_presence where area_id = $1 and user_tag_id = $2",
            area.id,
            user_tag_id,
        )
        current_inside = bool(current_inside) if current_inside is not None else False

        if direction == EntryDirection.exit:
            if not current_inside:
                await self._insert_scan_log(
                    conn=conn,
                    node_id=area.node_id,
                    terminal_id=current_terminal.id,
                    area_id=area.id,
                    direction=direction,
                    user_tag_id=user_tag_id,
                    user_tag_uid=tag_uid,
                    allowed=False,
                    reason=ENTRY_REASON_NOT_INSIDE,
                    area_group_id=None,
                    scanned_at=scanned_at,
                )
                return EntryScanResult(
                    allowed=False,
                    reason=ENTRY_REASON_NOT_INSIDE,
                    direction=direction,
                    area_id=area.id,
                    area_name=area.name,
                    group_id=None,
                    group_name=None,
                    is_inside=current_inside,
                    scanned_at=scanned_at,
                )

            await self._insert_scan_log(
                conn=conn,
                node_id=area.node_id,
                terminal_id=current_terminal.id,
                area_id=area.id,
                direction=direction,
                user_tag_id=user_tag_id,
                user_tag_uid=tag_uid,
                allowed=True,
                reason="allowed",
                area_group_id=None,
                scanned_at=scanned_at,
            )
            await conn.execute(
                "insert into entry_presence (area_id, user_tag_id, is_inside, last_exit_at) "
                "values ($1, $2, false, $3) "
                "on conflict (area_id, user_tag_id) do update set is_inside = false, last_exit_at = $3",
                area.id,
                user_tag_id,
                scanned_at,
            )
            return EntryScanResult(
                allowed=True,
                reason="allowed",
                direction=direction,
                area_id=area.id,
                area_name=area.name,
                group_id=None,
                group_name=None,
                is_inside=False,
                scanned_at=scanned_at,
            )

        if current_inside:
            await self._insert_scan_log(
                conn=conn,
                node_id=area.node_id,
                terminal_id=current_terminal.id,
                area_id=area.id,
                direction=direction,
                user_tag_id=user_tag_id,
                user_tag_uid=tag_uid,
                allowed=False,
                reason=ENTRY_REASON_ALREADY_INSIDE,
                area_group_id=None,
                scanned_at=scanned_at,
            )
            return EntryScanResult(
                allowed=False,
                reason=ENTRY_REASON_ALREADY_INSIDE,
                direction=direction,
                area_id=area.id,
                area_name=area.name,
                group_id=None,
                group_name=None,
                is_inside=True,
                scanned_at=scanned_at,
            )

        member_exists = await conn.fetchval(
            "select exists("
            "select 1 from entry_area_group ag "
            "join entry_group_user_tag egut on egut.group_id = ag.group_id "
            "where ag.area_id = $1 and egut.user_tag_id = $2"
            ")",
            area.id,
            user_tag_id,
        )
        if not member_exists:
            await self._insert_scan_log(
                conn=conn,
                node_id=area.node_id,
                terminal_id=current_terminal.id,
                area_id=area.id,
                direction=direction,
                user_tag_id=user_tag_id,
                user_tag_uid=tag_uid,
                allowed=False,
                reason=ENTRY_REASON_NOT_IN_GROUP,
                area_group_id=None,
                scanned_at=scanned_at,
            )
            return EntryScanResult(
                allowed=False,
                reason=ENTRY_REASON_NOT_IN_GROUP,
                direction=direction,
                area_id=area.id,
                area_name=area.name,
                group_id=None,
                group_name=None,
                is_inside=False,
                scanned_at=scanned_at,
            )

        match = await conn.fetchrow(
            "select ag.id as area_group_id, g.id as group_id, g.name as group_name "
            "from entry_area_group ag "
            "join entry_group g on g.id = ag.group_id "
            "join entry_group_user_tag egut on egut.group_id = g.id "
            "join entry_area_group_window w on w.area_group_id = ag.id "
            "where ag.area_id = $1 and egut.user_tag_id = $2 and $3 between w.start_at and w.end_at "
            "order by w.start_at limit 1",
            area.id,
            user_tag_id,
            scanned_at,
        )
        if match is None:
            await self._insert_scan_log(
                conn=conn,
                node_id=area.node_id,
                terminal_id=current_terminal.id,
                area_id=area.id,
                direction=direction,
                user_tag_id=user_tag_id,
                user_tag_uid=tag_uid,
                allowed=False,
                reason=ENTRY_REASON_OUTSIDE_WINDOW,
                area_group_id=None,
                scanned_at=scanned_at,
            )
            return EntryScanResult(
                allowed=False,
                reason=ENTRY_REASON_OUTSIDE_WINDOW,
                direction=direction,
                area_id=area.id,
                area_name=area.name,
                group_id=None,
                group_name=None,
                is_inside=False,
                scanned_at=scanned_at,
            )

        area_group_id = match["area_group_id"]
        await self._insert_scan_log(
            conn=conn,
            node_id=area.node_id,
            terminal_id=current_terminal.id,
            area_id=area.id,
            direction=direction,
            user_tag_id=user_tag_id,
            user_tag_uid=tag_uid,
            allowed=True,
            reason="allowed",
            area_group_id=area_group_id,
            scanned_at=scanned_at,
        )
        await conn.execute(
            "insert into entry_presence (area_id, user_tag_id, is_inside, last_entry_at) "
            "values ($1, $2, true, $3) "
            "on conflict (area_id, user_tag_id) do update set is_inside = true, last_entry_at = $3",
            area.id,
            user_tag_id,
            scanned_at,
        )
        return EntryScanResult(
            allowed=True,
            reason="allowed",
            direction=direction,
            area_id=area.id,
            area_name=area.name,
            group_id=match["group_id"],
            group_name=match["group_name"],
            is_inside=True,
            scanned_at=scanned_at,
        )

    async def _fetch_entry_scan_logs(self, conn: Connection, node: Node, query: EntryScanLogQuery) -> list[EntryScanLog]:
        conditions = ["l.node_id = any($1)"]
        params: list[object] = [node.ids_to_root]
        param_index = 2

        def add_condition(condition: str, value: object | None):
            nonlocal param_index
            if value is None:
                return
            conditions.append(condition.format(param_index))
            params.append(value)
            param_index += 1

        add_condition("l.area_id = ${}", query.area_id)
        add_condition("g.id = ${}", query.group_id)
        add_condition("l.terminal_id = ${}", query.terminal_id)
        add_condition("l.direction = ${}", query.direction.value if query.direction is not None else None)
        add_condition("l.allowed = ${}", query.allowed)
        add_condition("l.user_tag_uid = ${}", query.user_tag_uid)
        add_condition("l.scanned_at >= ${}", query.from_time)
        add_condition("l.scanned_at <= ${}", query.to_time)

        params.extend([query.limit, query.offset])
        where_clause = " and ".join(conditions)

        return await conn.fetch_many(
            EntryScanLog,
            "select "
            "l.id, l.scanned_at, l.node_id, l.terminal_id, t.name as terminal_name, "
            "l.area_id, a.name as area_name, l.direction, l.user_tag_id, l.user_tag_uid, "
            "l.allowed, l.reason, g.id as group_id, g.name as group_name "
            "from entry_scan_log l "
            "join terminal t on t.id = l.terminal_id "
            "join entry_area a on a.id = l.area_id "
            "left join entry_area_group ag on ag.id = l.area_group_id "
            "left join entry_group g on g.id = ag.group_id "
            f"where {where_clause} "
            "order by l.scanned_at desc "
            "limit $%d offset $%d" % (param_index, param_index + 1),
            *params,
        )

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def list_entry_scan_logs(
        self, *, conn: Connection, node: Node, query: EntryScanLogQuery
    ) -> list[EntryScanLog]:
        return await self._fetch_entry_scan_logs(conn=conn, node=node, query=query)

    @with_db_transaction(read_only=True)
    @requires_node(event_only=True, object_types=[ObjectType.entry_area])
    @requires_user([Privilege.entry_management])
    async def export_entry_scan_logs(
        self, *, conn: Connection, node: Node, query: EntryScanLogQuery
    ) -> str:
        logs = await self._fetch_entry_scan_logs(conn=conn, node=node, query=query)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "scanned_at",
                "terminal_id",
                "terminal_name",
                "area_id",
                "area_name",
                "direction",
                "user_tag_id",
                "user_tag_uid",
                "allowed",
                "reason",
                "group_id",
                "group_name",
            ]
        )
        for log in logs:
            writer.writerow(
                [
                    log.scanned_at.isoformat(),
                    log.terminal_id,
                    log.terminal_name,
                    log.area_id,
                    log.area_name,
                    log.direction.value,
                    log.user_tag_id,
                    log.user_tag_uid,
                    log.allowed,
                    log.reason,
                    log.group_id,
                    log.group_name,
                ]
            )
        return output.getvalue()
