import asyncio

from . import psql
from . import terminal
from .args import Parser
from .config import read_config


def main():
    """
    main entry point for launching the core
    """
    parser = Parser()

    parser.add_argument("-c", "--config-path", default="server.conf")

    ### module registration
    parser.add_subcommand("psql", psql.PSQL)
    parser.add_subcommand("terminalserver", terminal.TerminalServer)
    ### / module registration

    loop = asyncio.new_event_loop()

    args = parser.parse_args(loop)

    config = read_config(args.config_path)

    args.run_subcommand(loop, config=config)


if __name__ == "__main__":
    main()
