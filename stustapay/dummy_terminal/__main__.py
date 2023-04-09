"""
cli entrypoint for controlling the core.
"""

import asyncio

from stustapay.core.args import Parser
from stustapay.core.config import read_config
from stustapay.core.database import create_db_pool
from .dummy_terminal import DummyTerminal


def main():
    """
    main entry point for launching the core
    """
    parser = Parser()

    parser.add_argument("-c", "--config-path", default="server.conf")

    loop = asyncio.new_event_loop()

    args = parser.parse_args(loop)

    config = read_config(args.config_path)  # pylint: disable=no-member

    db_pool = loop.run_until_complete(create_db_pool(cfg=config.database))
    dummy_terminal = DummyTerminal(config=config, db_pool=db_pool)
    loop.run_until_complete(dummy_terminal.run())


if __name__ == "__main__":
    main()
