"""
cli entrypoint for controlling the core.
"""

import asyncio

from . import admin
from . import database
from .args import Parser
from .config import read_config, mock_config


def main():
    """
    main entry point for launching the core
    """
    parser = Parser()

    parser.add_argument("-c", "--config-path", default="server.conf")

    ### module registration
    parser.add_subcommand("database", database.DatabaseManage)
    parser.add_subcommand("admin", admin.AdminCli)
    ### / module registration

    loop = asyncio.new_event_loop()

    args = parser.parse_args(loop)

    if args.mock:  # pylint: disable=no-member
        config = mock_config()
    else:
        config = read_config(args.config_path)  # pylint: disable=no-member

    args.run_subcommand(loop, config=config)


if __name__ == "__main__":
    main()
