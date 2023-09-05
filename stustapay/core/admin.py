from getpass import getpass
from pprint import pprint

import asyncpg

from stustapay.framework.subcommand import SubCommand

from . import database
from .config import Config
from .schema.user import UserWithoutId
from .service.auth import AuthService
from .service.user import UserService, list_user_roles


class AdminCli(SubCommand[Config]):
    """
    Admin utility cli
    """

    def __init__(self, args, config: Config, **kwargs):
        del kwargs
        self.config = config
        self.action = args.action

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("action", choices=["add-user"])

    async def _add_user(self, db_pool: asyncpg.Pool):
        try:
            auth_service = AuthService(db_pool=db_pool, config=self.config)
            user_service = UserService(db_pool=db_pool, config=self.config, auth_service=auth_service)
            async with db_pool.acquire() as conn:
                available_roles = await list_user_roles(conn=conn)
                available_roles_formatted = ", ".join([f"'{role.name}'" for role in available_roles])

            username = input("Enter username:\n")
            password = getpass("Enter password:\n")
            confirm_password = getpass("Confirm password:\n")
            if password != confirm_password:
                print("Error, passwords do not match")
                return

            role_names = input(f"Enter roles (comma separated, choose from {available_roles_formatted}:\n")
            display_name = input("Enter display name:\n")

            new_user = UserWithoutId(
                login=username,
                description=None,
                role_names=role_names.split(","),
                display_name=display_name,
            )
            user = await user_service.create_user_no_auth(  # pylint: disable=missing-kwoa
                new_user=new_user, password=password
            )
            print("created new user:")
            pprint(user)
        except KeyboardInterrupt:
            print("Aborting ...")

    async def run(self):
        db_pool = await database.create_db_pool(self.config.database)
        try:
            await database.check_revision_version(db_pool)
            if self.action == "add-user":
                return await self._add_user(db_pool)
        finally:
            await db_pool.close()
