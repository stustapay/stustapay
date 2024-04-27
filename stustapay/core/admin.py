from getpass import getpass
from pprint import pprint

from stustapay.framework.database import create_db_pool

from . import database
from .config import Config
from .schema.user import NewUser, RoleToNode
from .service.auth import AuthService
from .service.tree.common import fetch_node
from .service.user import UserService, list_user_roles


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

        role_names = input(f"Enter roles (comma separated, choose from {available_roles_formatted}:\n")
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
