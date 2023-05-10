from getpass import getpass

import asyncpg

from . import database
from .config import Config
from .schema.user import UserWithoutId
from .service.auth import AuthService
from .service.user import UserService
from .subcommand import SubCommand


class AdminCli(SubCommand):
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
            username = input("Enter username:\n")
            password = getpass("Enter password:\n")
            confirm_password = getpass("Confirm password:\n")
            if password != confirm_password:
                print("Error, passwords do not match")
                return
            role_names = input("Enter roles (comma separated, choose from 'admin', 'finanzorga', 'cashier':\n")
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
            print(f"created new user {user.login} with user id {user.id}")
        except KeyboardInterrupt:
            print("Aborting ...")

    async def run(self):
        db_pool = await database.create_db_pool(self.config.database)
        if self.action == "add-user":
            return await self._add_user(db_pool)
