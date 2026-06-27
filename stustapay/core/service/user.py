# pylint: disable=unexpected-keyword-arg
from typing import Optional

import asyncpg
from passlib.context import CryptContext
from pydantic import BaseModel
from sftkit.database import Connection
from sftkit.service import Service, with_db_transaction

from stustapay.core.config import Config
from stustapay.core.schema.audit_logs import AuditType
from stustapay.core.schema.tree import Node, ObjectType
from stustapay.core.schema.user import (
    AssignableUserRolesAtNode,
    CurrentUser,
    EventPrivilege,
    NewUser,
    NewUserRole,
    NewUserToRoles,
    NodePrivilege,
    RoleToNode,
    User,
    UserRole,
    UserRoleAssignment,
    UserRoleAssignmentPayload,
    UserToRoles,
    UserVoucherGrantStats,
    UserWithoutId,
    format_user_tag_uid,
)
from stustapay.core.service.auth import AuthService, UserTokenMetadata
from stustapay.core.service.common.audit_logs import create_audit_log
from stustapay.core.service.common.decorators import (
    requires_node,
    requires_terminal,
    requires_user,
)
from stustapay.core.service.common.error import AccessDenied, InvalidArgument, NotFound
from stustapay.core.service.common.role_assignment import (
    assert_roles_assignable,
    fetch_assigner_role_ids_at_node,
    list_assignable_roles_for_assigner_roles,
)
from stustapay.core.service.tree.common import fetch_node
from stustapay.core.service.user_tag import get_or_assign_user_tag


class UserLoginSuccess(BaseModel):
    user: CurrentUser
    token: str


class UserLoginResult(BaseModel):
    class NodeChoice(BaseModel):
        node_id: int
        name: str
        description: str

    success: UserLoginSuccess | None
    available_nodes: list[NodeChoice] | None


async def fetch_user_to_roles(*, conn: Connection, node: Node, user_id: int) -> UserToRoles:
    curr_user_to_role = await conn.fetch_maybe_one(
        UserToRoles, "select * from user_to_roles_aggregated where node_id = $1 and user_id = $2", node.id, user_id
    )
    if curr_user_to_role is None:
        return UserToRoles(node_id=node.id, user_id=user_id, role_ids=[])
    return curr_user_to_role


async def fetch_user(*, conn: Connection, node: Node, user_id: int) -> User:
    user = await conn.fetch_maybe_one(
        User, "select * from user_with_tag where id = $1 and node_id = any($2)", user_id, node.ids_to_root
    )
    if user is None:
        raise NotFound(element_type="user", element_id=user_id)

    return user


async def update_user(*, conn: Connection, node: Node, user_id: int, user: NewUser) -> User:
    user_tag_id = None
    if user.user_tag_uid is not None:
        user_tag_id = await get_or_assign_user_tag(conn=conn, node=node, pin=user.user_tag_pin, uid=user.user_tag_uid)

    row = await conn.fetchrow(
        "update usr "
        "set login = $2, description = $3, display_name = $4, user_tag_id = $5 "
        "where id = $1 and node_id = $6 returning id",
        user_id,
        user.login,
        user.description,
        user.display_name,
        user_tag_id,
        node.id,
    )
    if row is None:
        raise NotFound(element_type="user", element_id=str(user_id))

    updated_user = await fetch_user(conn=conn, node=node, user_id=user_id)
    await create_audit_log(
        conn=conn,
        log_type=AuditType.user_updated,
        content=updated_user,
        user_id=None,  # TODO: AUDIT
        node_id=node.id,
    )
    return updated_user


async def list_user_roles(*, conn: Connection, node: Node) -> list[UserRole]:
    return await conn.fetch_many(
        UserRole, "select * from user_role_with_privileges where node_id = any($1) order by name", node.ids_to_root
    )


async def get_user_privileges_at_node(
    *, conn: Connection, user_id: int, event_node_id: int, node_id: int
) -> tuple[set[EventPrivilege], set[NodePrivilege]]:
    event_privileges = await conn.fetchval("select user_event_privileges($1, $2)", user_id, event_node_id)
    node_privileges = await conn.fetchval("select user_node_privileges($1, $2)", user_id, node_id)
    return set(EventPrivilege[val] for val in event_privileges), set(NodePrivilege[val] for val in node_privileges)


async def _validate_role_assignment_policy(
    *,
    conn: Connection,
    node: Node,
    can_assign_all_roles: bool,
    assignable_role_ids: list[int],
) -> None:
    if can_assign_all_roles and len(assignable_role_ids) > 0:
        raise InvalidArgument("cannot set explicit assignable roles when can_assign_all_roles is enabled")
    if len(assignable_role_ids) == 0:
        return

    visible_role_count = await conn.fetchval(
        "select count(*) from user_role where id = any($1) and node_id = any($2)",
        list(set(assignable_role_ids)),
        node.ids_to_root,
    )
    if visible_role_count != len(set(assignable_role_ids)):
        raise InvalidArgument("assignable roles must belong to the current node tree")


async def _persist_role_assignment_policy(
    *,
    conn: Connection,
    role_id: int,
    can_assign_all_roles: bool,
    assignable_role_ids: list[int],
) -> None:
    await conn.execute("update user_role set can_assign_all_roles = $2 where id = $1", role_id, can_assign_all_roles)
    await conn.execute("delete from user_role_to_assignable_role where assigner_role_id = $1", role_id)
    if can_assign_all_roles:
        return

    for assignable_role_id in set(assignable_role_ids):
        await conn.execute(
            "insert into user_role_to_assignable_role (assigner_role_id, assignable_role_id) values ($1, $2)",
            role_id,
            assignable_role_id,
        )


async def list_assignable_roles_for_user_at_node(
    *, conn: Connection, node: Node, user_id: int, active_role_id: int | None = None
) -> list[UserRole]:
    assigner_role_ids = await fetch_assigner_role_ids_at_node(
        conn=conn, user_id=user_id, node=node, active_role_id=active_role_id
    )
    return await list_assignable_roles_for_assigner_roles(conn=conn, node=node, assigner_role_ids=assigner_role_ids)


async def list_assignable_roles_by_node_for_user(
    *, conn: Connection, event_node: Node, user_id: int, active_role_id: int
) -> list[AssignableUserRolesAtNode]:
    rows = await conn.fetch(
        "select n.id as node_id, n.name as node_name "
        "from node n "
        "where n.event_node_id = $2 "
        "  and exists ("
        "      select 1 "
        "      from user_to_role utr "
        "      where utr.user_id = $1 "
        "        and utr.role_id = $3 "
        "        and utr.node_id = any(n.parent_ids || array[n.id])"
        "  ) "
        "  and ("
        "      exists ("
        "          select 1 from user_role ur "
        "          where ur.id = $3 and ur.can_assign_all_roles"
        "      ) "
        "      or exists ("
        "          select 1 "
        "          from user_role_to_assignable_role urtar "
        "          join user_role target on target.id = urtar.assignable_role_id "
        "          where urtar.assigner_role_id = $3 "
        "            and target.node_id = any(n.parent_ids || array[n.id])"
        "      )"
        "  ) "
        "order by n.path",
        user_id,
        event_node.id,
        active_role_id,
    )

    result: list[AssignableUserRolesAtNode] = []
    for row in rows:
        node = await fetch_node(conn=conn, node_id=row["node_id"])
        assert node is not None
        roles = await list_assignable_roles_for_user_at_node(
            conn=conn, node=node, user_id=user_id, active_role_id=active_role_id
        )
        if len(roles) > 0:
            result.append(
                AssignableUserRolesAtNode(
                    node_id=row["node_id"],
                    node_name=row["node_name"],
                    roles=roles,
                )
            )
    return result


async def _get_user_role(*, conn: Connection, role_id: int) -> Optional[UserRole]:
    return await conn.fetch_maybe_one(UserRole, "select * from user_role_with_privileges where id = $1", role_id)


async def associate_user_to_role(
    *,
    conn: Connection,
    current_user_id: int | None,
    node: Node,
    user_id: int,
    role_id: int,
    active_role_id: int | None = None,
):
    user_node_id = await conn.fetchval(
        "select node_id from usr where node_id = any($1) and id = $2",
        node.ids_to_root,
        user_id,
    )
    if user_node_id is None:
        raise NotFound(element_type="user", element_id=user_id)

    user_node = await fetch_node(conn=conn, node_id=user_node_id)
    assert user_node is not None

    role = await conn.fetchrow(
        "select node_id from user_role where id = $1 and node_id = any($2)",
        role_id,
        user_node.ids_to_root,
    )
    if role is None:
        raise NotFound(element_type="user_role", element_id=role_id)

    if current_user_id is not None:
        assigner_role_ids = await fetch_assigner_role_ids_at_node(
            conn=conn,
            user_id=current_user_id,
            node=node,
            active_role_id=active_role_id,
        )
        await assert_roles_assignable(
            conn=conn,
            node=node,
            assigner_role_ids=assigner_role_ids,
            target_role_ids={role_id},
        )

    await conn.execute(
        "insert into user_to_role (node_id, user_id, role_id) values ($1, $2, $3)",
        node.id,
        user_id,
        role_id,
    )


class UserService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service

        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def _hash_password(self, password: str) -> str:
        return self.pwd_context.hash(password)

    def _check_password(self, password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(password, hashed_password)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_user_roles(self, *, conn: Connection, node: Node) -> list[UserRole]:
        return await list_user_roles(conn=conn, node=node)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user_role])
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def create_user_role(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, new_role: NewUserRole
    ) -> UserRole:
        await _validate_role_assignment_policy(
            conn=conn,
            node=node,
            can_assign_all_roles=new_role.can_assign_all_roles,
            assignable_role_ids=new_role.assignable_role_ids,
        )
        role_id = await conn.fetchval(
            "insert into user_role (node_id, name, can_assign_all_roles) values ($1, $2, $3) returning id",
            node.id,
            new_role.name,
            new_role.can_assign_all_roles,
        )
        for event_privilege in new_role.event_privileges:
            await conn.execute(
                "insert into user_role_to_event_privilege (role_id, privilege) values ($1, $2)",
                role_id,
                event_privilege.name,
            )
        for node_privilege in new_role.node_privileges:
            await conn.execute(
                "insert into user_role_to_node_privilege (role_id, privilege) values ($1, $2)",
                role_id,
                node_privilege.name,
            )
        if not new_role.can_assign_all_roles:
            for assignable_role_id in set(new_role.assignable_role_ids):
                await conn.execute(
                    "insert into user_role_to_assignable_role (assigner_role_id, assignable_role_id) values ($1, $2)",
                    role_id,
                    assignable_role_id,
                )

        assert role_id is not None
        role = await _get_user_role(conn=conn, role_id=role_id)
        assert role is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_role_created,
            content=role,
            user_id=current_user.id,
            node_id=node.id,
        )
        return role

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user_role])
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def update_user_role_privileges(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        role_id: int,
        can_assign_all_roles: bool,
        assignable_role_ids: list[int],
        event_privileges: list[EventPrivilege],
        node_privileges: list[NodePrivilege],
    ) -> UserRole:
        role = await _get_user_role(conn=conn, role_id=role_id)
        if role is None or role.node_id not in node.ids_to_root:
            raise NotFound(element_type="user_role", element_id=role_id)

        await _validate_role_assignment_policy(
            conn=conn,
            node=node,
            can_assign_all_roles=can_assign_all_roles,
            assignable_role_ids=assignable_role_ids,
        )
        await _persist_role_assignment_policy(
            conn=conn,
            role_id=role_id,
            can_assign_all_roles=can_assign_all_roles,
            assignable_role_ids=assignable_role_ids,
        )

        await conn.execute("delete from user_role_to_event_privilege where role_id = $1", role_id)
        await conn.execute("delete from user_role_to_node_privilege where role_id = $1", role_id)
        for event_privilege in event_privileges:
            await conn.execute(
                "insert into user_role_to_event_privilege (role_id, privilege) values ($1, $2)",
                role_id,
                event_privilege.name,
            )
        for node_privilege in node_privileges:
            await conn.execute(
                "insert into user_role_to_node_privilege (role_id, privilege) values ($1, $2)",
                role_id,
                node_privilege.name,
            )

        role = await _get_user_role(conn=conn, role_id=role_id)
        assert role is not None
        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_role_updated,
            content=role,
            user_id=current_user.id,
            node_id=node.id,
        )
        return role

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user_role])
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def delete_user_role(self, *, conn: Connection, node: Node, current_user: CurrentUser, role_id: int) -> bool:
        result = await conn.execute(
            "delete from user_role where id = $1 and node_id = any($2)", role_id, node.ids_to_root
        )
        # TODO: AUDIT_DELETE
        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_role_deleted,
            content={"id": role_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return result != "DELETE 0"

    async def _create_user(
        self,
        *,
        conn: Connection,
        node: Node,
        new_user: NewUser,
        creating_user_id: Optional[int],
        roles: list[RoleToNode] | None = None,
        password: Optional[str] = None,
        creating_user_active_role_id: int | None = None,
    ) -> User:
        user_tag_id = None
        if new_user.user_tag_uid is not None:
            user_tag_id = await get_or_assign_user_tag(
                conn=conn, node=node, pin=new_user.user_tag_pin, uid=new_user.user_tag_uid
            )

            existing_user = await conn.fetchrow("select * from user_with_tag where user_tag_id = $1", user_tag_id)
            if existing_user is not None:
                raise InvalidArgument(f"User with tag id {new_user.user_tag_pin} already exists")

        hashed_password = None
        if password:
            hashed_password = self._hash_password(password)

        customer_account_id = None
        if new_user.user_tag_uid is not None:
            customer_account_id = await conn.fetchval(
                "select a.id from account a join user_tag ut on a.user_tag_id = ut.id where ut.uid = $1",
                new_user.user_tag_uid,
            )

        if customer_account_id is None:
            customer_account_id = await conn.fetchval(
                "insert into account (node_id, user_tag_id, type) values ($1, $2, 'private') returning id",
                node.id,
                user_tag_id,
            )

        user_id = await conn.fetchval(
            "insert into usr (node_id, login, description, password, display_name, user_tag_id, "
            "   created_by, customer_account_id) "
            "values ($1, $2, $3, $4, $5, $6, $7, $8) returning id",
            node.id,
            new_user.login,
            new_user.description,
            hashed_password,
            new_user.display_name,
            user_tag_id,
            creating_user_id,
            customer_account_id,
        )
        for role in roles or []:
            role_node = await fetch_node(conn=conn, node_id=role.node_id)
            if role_node is None:
                raise InvalidArgument(
                    f"Could not associate user to role at node {role.node_id} since the node does not exist"
                )
            assert role_node is not None
            await associate_user_to_role(
                conn=conn,
                node=role_node,
                current_user_id=creating_user_id,
                active_role_id=creating_user_active_role_id,
                user_id=user_id,
                role_id=role.role_id,
            )

        user = await conn.fetch_one(User, "select * from user_with_tag where id = $1", user_id)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_created,
            content=user,
            user_id=creating_user_id,
            node_id=node.id,
        )
        return user

    @with_db_transaction
    async def create_user_no_auth(
        self,
        *,
        conn: Connection,
        node_id: int,
        new_user: NewUser,
        roles: list[RoleToNode] | None = None,
        password: Optional[str] = None,
    ) -> User:
        node = await fetch_node(conn=conn, node_id=node_id)
        assert node is not None
        return await self._create_user(
            conn=conn, creating_user_id=None, node=node, new_user=new_user, password=password, roles=roles
        )

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user(event_privileges=[EventPrivilege.create_user])
    async def create_user(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        new_user: NewUser,
        password: Optional[str] = None,
    ) -> User:
        return await self._create_user(
            conn=conn,
            creating_user_id=current_user.id,
            node=node,
            new_user=new_user,
            password=password,
        )

    @with_db_transaction
    @requires_terminal(event_privileges=[EventPrivilege.create_user], requires_till=False)
    async def create_user_terminal(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        new_user: NewUser,
        role_assignments: list[UserRoleAssignmentPayload] | None = None,
    ) -> User:
        event_node = node
        if node.event_node_id is not None and node.event_node_id != node.id:
            n = await fetch_node(conn=conn, node_id=node.event_node_id)
            assert n is not None
            event_node = n

        actual_roles = None
        if role_assignments is not None:
            actual_roles = [
                RoleToNode(node_id=assignment.node_id, role_id=role_id)
                for assignment in role_assignments
                for role_id in assignment.role_ids
            ]
        return await self._create_user(
            node=event_node,
            conn=conn,
            creating_user_id=current_user.id,
            creating_user_active_role_id=current_user.active_role_id,
            new_user=new_user,
            roles=actual_roles,
        )

    @with_db_transaction
    @requires_terminal(event_privileges=[EventPrivilege.create_user], requires_till=False)
    async def update_user_roles_terminal(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        user_tag_uid: int,
        role_assignments: list[UserRoleAssignmentPayload],
    ) -> User:
        user_id = await conn.fetchval(
            "select id from user_with_tag where user_tag_uid = $1 and node_id = any($2)",
            user_tag_uid,
            node.ids_to_root,
        )
        if user_id is None:
            raise InvalidArgument(f"User with tag uid {format_user_tag_uid(user_tag_uid)} does not exist")

        for assignment in role_assignments:
            assignment_node = await fetch_node(conn=conn, node_id=assignment.node_id)
            if assignment_node is None:
                raise InvalidArgument(f"Node {assignment.node_id} does not exist")

            user_to_roles = NewUserToRoles(user_id=user_id, role_ids=assignment.role_ids)
            await self.update_user_to_roles(
                conn=conn,
                node=assignment_node,
                current_user=current_user,
                user_to_roles=user_to_roles,
                active_role_id=current_user.active_role_id,
            )

        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_updated,
            content={
                "user_id": user_id,
                "role_assignments": [assignment.model_dump() for assignment in role_assignments],
            },
            user_id=current_user.id,
            node_id=node.id,
        )
        return await conn.fetch_one(User, "select * from user_with_tag where id = $1", user_id)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_users(
        self, *, conn: Connection, node: Node, filter_privilege: EventPrivilege | NodePrivilege | None = None
    ) -> list[User]:
        if filter_privilege is None:
            return await conn.fetch_many(
                User, "select * from user_with_tag where node_id = any($1) order by login", node.ids_to_root
            )

        return await conn.fetch_many(
            User,
            "with users_by_privilege as ("
            "   select "
            "       u.*, "
            "       (select exists(select from user_privileges_at_node(u.id) up "
            "       where $2 = any(up.privileges_at_node) and up.node_id = any($1))) as has_privilege "
            "   from user_with_tag u "
            "   where u.node_id = any($1)"
            ")"
            "select * from users_by_privilege where has_privilege",
            node.ids_to_root,
            filter_privilege.name if filter_privilege is not None else None,
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def get_user(self, *, conn: Connection, node: Node, user_id: int) -> Optional[User]:
        return await fetch_user(conn=conn, node=node, user_id=user_id)

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def get_user_voucher_grant_stats(
        self, *, conn: Connection, node: Node, user_id: int
    ) -> UserVoucherGrantStats:
        await fetch_user(conn=conn, node=node, user_id=user_id)
        if node.event_node_id is None:
            return UserVoucherGrantStats(vouchers_granted=0)

        vouchers_granted = await conn.fetchval(
            "select coalesce(sum(t.vouchers), 0) "
            "from transaction t "
            "join account sa on t.source_account = sa.id "
            "where t.conducting_user_id = $1 "
            "   and sa.type = 'voucher_create' "
            "   and sa.node_id = $2 "
            "   and t.vouchers > 0",
            user_id,
            node.event_node_id,
        )
        return UserVoucherGrantStats(vouchers_granted=vouchers_granted or 0)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def update_user(self, *, conn: Connection, node: Node, user_id: int, user: UserWithoutId) -> Optional[User]:
        return await update_user(conn=conn, node=node, user_id=user_id, user=user)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def change_user_password(
        self, *, conn: Connection, node: Node, current_user: CurrentUser, user_id: int, new_password: str
    ) -> Optional[User]:
        new_password_hashed = self._hash_password(new_password)

        ret = await conn.execute(
            "update usr set password = $2 where id = $1 and node_id = $3 returning id",
            user_id,
            new_password_hashed,
            node.id,
        )
        if ret is None:
            raise InvalidArgument("User not found")

        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_password_changed,
            content={"id": user_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return await fetch_user(conn=conn, node=node, user_id=user_id)

    @with_db_transaction
    @requires_node(object_types=[ObjectType.user])
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def delete_user(self, *, conn: Connection, node: Node, current_user: CurrentUser, user_id: int) -> bool:
        result = await conn.execute(
            "delete from usr where id = $1 and node_id = $2",
            user_id,
            node.id,
        )
        # TODO: AUDIT_DELETE
        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_deleted,
            content={"id": user_id},
            user_id=current_user.id,
            node_id=node.id,
        )
        return result != "DELETE 0"

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user()
    async def list_user_to_roles(self, *, conn: Connection, node: Node) -> list[UserToRoles]:
        return await conn.fetch_many(
            UserToRoles, "select * from user_to_roles_aggregated where node_id = any($1)", node.ids_to_root
        )

    @with_db_transaction(read_only=True)
    @requires_node()
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def list_role_assignments_for_user(
        self, *, conn: Connection, node: Node, user_id: int
    ) -> list[UserRoleAssignment]:
        # fetch the user to ensure it exists and is visible from the node we are querying for
        await fetch_user(conn=conn, node=node, user_id=user_id)

        class UserToRolesWithNodeName(UserToRoles):
            node_name: str

        assignments = await conn.fetch_many(
            UserToRolesWithNodeName,
            "select utr.*, n.name as node_name "
            "from user_to_roles_aggregated utr "
            "join node n on n.id = utr.node_id "
            "where utr.user_id = $1 "
            "order by n.path",
            user_id,
        )
        if len(assignments) == 0:
            return []

        role_ids = {role_id for assignment in assignments for role_id in assignment.role_ids}
        roles_by_id: dict[int, UserRole] = {}
        if len(role_ids) > 0:
            roles = await conn.fetch_many(
                UserRole,
                "select * from user_role_with_privileges where id = any($1)",
                list(role_ids),
            )
            roles_by_id = {role.id: role for role in roles}

        return [
            UserRoleAssignment(
                user_id=assignment.user_id,
                node_id=assignment.node_id,
                node_name=assignment.node_name,
                role_ids=assignment.role_ids,
                roles=sorted(
                    (roles_by_id[role_id] for role_id in assignment.role_ids if role_id in roles_by_id),
                    key=lambda role: role.name.lower(),
                ),
            )
            for assignment in assignments
        ]

    @with_db_transaction
    @requires_node()
    @requires_user(node_privileges=[NodePrivilege.node_administration])
    async def update_user_to_roles(
        self,
        *,
        conn: Connection,
        node: Node,
        current_user: CurrentUser,
        user_to_roles: NewUserToRoles,
        active_role_id: int | None = None,
    ) -> UserToRoles:
        if len(user_to_roles.role_ids) == 0:
            curr_user_to_role = await conn.fetch_maybe_one(
                UserToRoles,
                "select * from user_to_roles_aggregated where node_id = $1 and user_id = $2",
                node.id,
                user_to_roles.user_id,
            )
            if curr_user_to_role is not None:
                assigner_role_ids = await fetch_assigner_role_ids_at_node(
                    conn=conn,
                    user_id=current_user.id,
                    node=node,
                    active_role_id=active_role_id,
                )
                await assert_roles_assignable(
                    conn=conn,
                    node=node,
                    assigner_role_ids=assigner_role_ids,
                    target_role_ids=set(curr_user_to_role.role_ids),
                )
            await conn.execute(
                "delete from user_to_role where node_id = $1 and user_id = $2", node.id, user_to_roles.user_id
            )
            return UserToRoles(node_id=node.id, user_id=user_to_roles.user_id, role_ids=[])

        curr_user_to_role = await conn.fetch_maybe_one(
            UserToRoles,
            "select * from user_to_roles_aggregated where node_id = $1 and user_id = $2",
            node.id,
            user_to_roles.user_id,
        )
        role_ids_to_remove = set()
        if curr_user_to_role is None:
            role_ids_to_add = set(user_to_roles.role_ids)
        else:
            role_ids_to_add = set(user_to_roles.role_ids).difference(set(curr_user_to_role.role_ids))
            role_ids_to_remove = set(curr_user_to_role.role_ids).difference(set(user_to_roles.role_ids))

        assigner_role_ids = await fetch_assigner_role_ids_at_node(
            conn=conn,
            user_id=current_user.id,
            node=node,
            active_role_id=active_role_id,
        )
        if len(role_ids_to_remove) > 0:
            await assert_roles_assignable(
                conn=conn,
                node=node,
                assigner_role_ids=assigner_role_ids,
                target_role_ids=role_ids_to_remove,
            )

        for role_id in role_ids_to_add:
            await associate_user_to_role(
                conn=conn,
                node=node,
                current_user_id=current_user.id,
                active_role_id=active_role_id,
                user_id=user_to_roles.user_id,
                role_id=role_id,
            )
        if len(role_ids_to_remove) > 0:
            await conn.execute(
                "delete from user_to_role where node_id = $1 and user_id = $2 and role_id = any($3)",
                node.id,
                user_to_roles.user_id,
                role_ids_to_remove,
            )

        new_user_to_roles = await fetch_user_to_roles(conn=conn, node=node, user_id=user_to_roles.user_id)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_to_roles_updated,
            content=new_user_to_roles,
            user_id=current_user.id,
            node_id=node.id,
        )
        return new_user_to_roles

    @with_db_transaction
    async def login_user(
        self, *, conn: Connection, username: str, password: str, node_id: int | None = None
    ) -> UserLoginResult:
        if node_id is None:
            potential_users = await conn.fetch("select * from usr where login = $1", username)
        else:
            potential_users = await conn.fetch("select * from usr where login = $1 and node_id = $2", username, node_id)
        if len(potential_users) == 0:
            raise AccessDenied("Invalid username or password")

        users_with_matching_passwords = []
        for row in potential_users:
            user_id = row["id"]
            if self._check_password(password, row["password"]):
                users_with_matching_passwords.append(row)

        if len(users_with_matching_passwords) == 0:
            raise AccessDenied("Invalid username or password")

        if len(users_with_matching_passwords) > 1:
            node_ids = [row["node_id"] for row in users_with_matching_passwords]
            nodes = await conn.fetch_many(
                UserLoginResult.NodeChoice,
                "select id as node_id, name, description from node n where id = any($1)",
                node_ids,
            )
            return UserLoginResult(success=None, available_nodes=nodes)

        logged_in_user = users_with_matching_passwords[0]
        user_id = logged_in_user["id"]
        session_id = await conn.fetchval("insert into usr_session (usr) values ($1) returning id", user_id)
        token = self.auth_service.create_user_access_token(UserTokenMetadata(user_id=user_id, session_id=session_id))
        user = await self.auth_service.get_user_from_token(conn=conn, token=token)
        return UserLoginResult(
            available_nodes=None,
            success=UserLoginSuccess(
                user=user,
                token=token,
            ),
        )

    @with_db_transaction
    @requires_user(node_required=False)
    async def change_password(
        self, *, conn: Connection, current_user: CurrentUser, old_password: str, new_password: str
    ):
        old_password_hashed = await conn.fetchval("select password from usr where id = $1", current_user.id)
        assert old_password_hashed is not None
        if not self._check_password(old_password, old_password_hashed):
            raise AccessDenied("Invalid password")

        new_password_hashed = self._hash_password(new_password)

        await conn.execute("update usr set password = $2 where id = $1", current_user.id, new_password_hashed)
        await create_audit_log(
            conn=conn,
            log_type=AuditType.user_password_changed,
            content={"id": current_user.id},
            user_id=current_user.id,
            node_id=current_user.node_id,
        )

    @with_db_transaction
    @requires_user(node_required=False)
    async def logout_user(self, *, conn: Connection, current_user: User, token: str) -> bool:
        token_payload = self.auth_service.decode_user_jwt_payload(token)
        assert token_payload is not None
        assert current_user.id == token_payload.user_id

        result = await conn.execute(
            "delete from usr_session where usr = $1 and id = $2", current_user.id, token_payload.session_id
        )
        return result != "DELETE 0"
