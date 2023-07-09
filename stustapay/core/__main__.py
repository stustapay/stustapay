"""
cli entrypoint for controlling the core.
"""

import asyncio

from stustapay.core import customer_bank_export

from . import admin, database, populate
from .args import Parser
from .config import read_config


def main():
    """
    main entry point for launching the core
    """
    parser = Parser()

    parser.add_argument("-c", "--config-path", default="server.yaml")

    ### module registration
    parser.add_subcommand("database", database.DatabaseManage)
    parser.add_subcommand("admin", admin.AdminCli)
    parser.add_subcommand("populate", populate.PopulateCli)
    parser.add_subcommand("customer-bank-export", customer_bank_export.CustomerBankExport)
    ### / module registration

    loop = asyncio.new_event_loop()

    args = parser.parse_args(loop)

    config = read_config(args.config_path)  # pylint: disable=no-member

    args.run_subcommand(loop, config=config)


if __name__ == "__main__":
    main()
