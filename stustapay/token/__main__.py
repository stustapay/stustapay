"""
Utilities for tangible token handling.

These identify users.
"""

import asyncio

from stustapay.token.generator import Generator
from stustapay.core.args import Parser


def main():
    """
    entry point for generating token properties.
    """
    parser = Parser()
    parser.add_subcommand("generate", Generator)

    loop = asyncio.new_event_loop()
    args = parser.parse_args(loop)

    args.run_subcommand(loop)


if __name__ == "__main__":
    main()
