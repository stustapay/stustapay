import asyncio

from stustapay.bon.generator import Generator
from stustapay.core.args import Parser
from stustapay.bon.config import read_config


def main():
    """
    main entry point for launching the bon generator
    """
    parser = Parser()
    parser.add_argument("-c", "--config-path", default="etc/bon.yaml")
    parser.add_subcommand("bon", Generator)

    loop = asyncio.new_event_loop()
    args = parser.parse_args(loop)

    config = read_config(vars(args)["config_path"])

    args.run_subcommand(loop, config=config)


if __name__ == "__main__":
    main()
