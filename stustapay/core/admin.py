import asyncpg
from getpass import getpass

from . import database
from .schema.user import UserWithoutId
from .subcommand import SubCommand
from .config import Config

from .service.users import UserService


class AdminCli(SubCommand):
    """
    Admin utility cli
    """

    def __init__(self, config: Config, **args):
        self.config = config
        self.action = args["action"]

    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("action", choices=["add-user"])

    async def _add_user(self, db_pool: asyncpg.Pool):
        try:
            user_service = UserService(db_pool=db_pool, config=self.config)
            username = input("Enter username:\n")
            password = getpass("Enter password:\n")
            confirm_password = getpass("Confirm password:\n")
            if password != confirm_password:
                print("Error, passwords do not match")
                return
            privileges = input("Enter privileges (comma separated, choose from 'admin', 'orga', 'cashier':\n")

            new_user = UserWithoutId(name=username, privileges=privileges.split(","))
            user = await user_service.create_user_no_auth(  # pylint: disable=missing-kwoa
                new_user=new_user, password=password
            )
            print(f"created new user {user.name} with user id {user.id}")
        except KeyboardInterrupt:
            print("Aborting ...")

    async def run(self):
        db_pool = await database.create_db_pool(self.config.database)
        if self.action == "add-user":
            return await self._add_user(db_pool)
