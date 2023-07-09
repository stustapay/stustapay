import asyncio

from stustapay.core.args import Parser

from .config import read_config
from .exporter import Exporter


def main():
    """
    main entry point for launching the DSFinV-K export
    """
    parser = Parser()

    parser.add_argument("-c", "--config-path", default="dsfinvk.yaml")

    ### module registration
    parser.add_subcommand("exporter", Exporter)
    ### / module registration

    loop = asyncio.new_event_loop()

    args = parser.parse_args(loop)

    config = read_config(vars(args)["config_path"])

    args.run_subcommand(loop, config=config)


if __name__ == "__main__":
    main()
