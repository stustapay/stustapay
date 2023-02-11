import asyncio

from . import psql, admin
from . import terminal
from .args import Parser
from .config import read_config, mock_config


def main():
    """
    main entry point for launching the core
    """
    parser = Parser()

    parser.add_argument("-c", "--config-path", default="server.conf")
    parser.add_argument("--mock", action="store_true")

    ### module registration
    parser.add_subcommand("psql", psql.PSQL)
    parser.add_subcommand("terminalserver", terminal.TerminalServer)
    parser.add_subcommand("admin", admin.AdminCli)
    ### / module registration

    loop = asyncio.new_event_loop()

    args = parser.parse_args(loop)


    if args.mock:
        config = mock_config()
    else:
        config = read_config(args.config_path)  # pylint: disable=no-member

    args.run_subcommand(loop, config=config)


if __name__ == "__main__":
    main()
