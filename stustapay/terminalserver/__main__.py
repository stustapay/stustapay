import asyncio

from stustapay.core.config import mock_config, read_config
from stustapay.core.args import Parser

from . import server


def main():
    """
    main entry point for launching the terminal server
    """
    parser = Parser()

    parser.add_argument("-c", "--config-path", default="server.conf")
    parser.add_argument("--mock", action="store_true", help="don't run with real data")

    ### module registration
    parser.add_subcommand("api", server.Api)
    ### / module registration

    loop = asyncio.new_event_loop()

    args = parser.parse_args(loop)

    if args.mock:  # pylint: disable=no-member
        config = mock_config()
    else:
        config = read_config(vars(args)["config_path"])

    args.run_subcommand(loop, config=config)


if __name__ == "__main__":
    main()
