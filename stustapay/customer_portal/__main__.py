import asyncio

from stustapay.core.args import Parser

from . import server
from .config import read_config


def main():
    """
    main entry point for launching the customer portal server
    """
    parser = Parser()

    parser.add_argument("-c", "--config-path", default="server.conf")

    ### module registration
    parser.add_subcommand("api", server.Api)
    ### / module registration

    loop = asyncio.new_event_loop()

    args = parser.parse_args(loop)

    config = read_config(vars(args)["config_path"])

    args.run_subcommand(loop, config=config)


if __name__ == "__main__":
    main()
