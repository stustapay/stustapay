from getpass import getpass
from pprint import pprint

from stustapay.framework.database import create_db_pool

from . import database
from .config import Config
from .schema.user import NewUser, RoleToNode, User
from .service.auth import AuthService
from .service.tree.common import fetch_node
from .service.user import UserService, fetch_user, list_user_roles, update_user


async def add_user(config: Config, node_id: int):
    db_pool = await create_db_pool(config.database)
    try:
        await database.check_revision_version(db_pool)
        auth_service = AuthService(db_pool=db_pool, config=config)
        user_service = UserService(db_pool=db_pool, config=config, auth_service=auth_service)
        async with db_pool.acquire() as conn:
            node = await fetch_node(conn=conn, node_id=node_id)
            assert node is not None
            available_roles = await list_user_roles(conn=conn, node=node)
            available_roles_formatted = ", ".join([f"'{role.name}'" for role in available_roles])

        username = input("Enter username:\n")
        password = getpass("Enter password:\n")
        confirm_password = getpass("Confirm password:\n")
        if password != confirm_password:
            print("Error, passwords do not match")
            return

        role_names_input = input(f"Enter roles (comma separated, choose from {available_roles_formatted}:\n")
        role_names = role_names_input.split(",")
        display_name = input("Enter display name:\n")

        new_user = NewUser(
            login=username,
            description=None,
            display_name=display_name,
        )
        role_to_nodes = []
        for role_name in role_names:
            roles = [x for x in available_roles if x.name == role_name]
            if len(roles) != 1:
                print(f"Invalid role: {role_name}")
                return
            role_id = roles[0].id
            role_to_nodes.append(RoleToNode(node_id=node.id, role_id=role_id))

        user = await user_service.create_user_no_auth(  # pylint: disable=missing-kwoa
            node_id=node.id, new_user=new_user, password=password, roles=role_to_nodes
        )

        print("created new user:")
        pprint(user)
    finally:
        await db_pool.close()


async def register_tag_with_user(config: Config, user_id: int, tag_pin: str, tag_uid: str):
    db_pool = await create_db_pool(config.database)
    try:
        await database.check_revision_version(db_pool)
        async with db_pool.acquire() as conn:
            user = await conn.fetch_maybe_one(User, "select * from user_with_tag where id = $1", user_id)
            node = await fetch_node(conn=conn, node_id=user.node_id)
            assert node is not None
            decoded_uid = int(tag_uid, 16)
            new_user = NewUser(
                login=user.login,
                description=user.description,
                user_tag_pin=tag_pin,
                user_tag_uid=decoded_uid,
                display_name=user.display_name,
            )
            await update_user(conn=conn, node=node, user_id=user_id, user=new_user)
            final_user = await fetch_user(conn=conn, node=node, user_id=user_id)
            pprint(final_user)
    finally:
        await db_pool.close()
