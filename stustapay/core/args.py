"""
basic argument parsing
"""

import argparse
from .util import log_setup


class Args(argparse.Namespace):
    def __init__(self, args, cli):
        super().__init__(**args)
        self._cli = cli

    def run_subcommand(self, loop, **injected_args):
        try:
            subcommand_class = vars(self).pop("subcommand_class")
        except KeyError:
            self._cli.error("no subcommand was given")
        subcommand_class.argparse_validate(vars(self), self._cli.error)

        # pass the cli args as single param, pass the injected
        subcommand_object = subcommand_class(vars(self), **injected_args)
        loop.run_until_complete(subcommand_object.run())


class Parser:
    def __init__(self):
        """
        main CLI entry point

        parses commands and jumps into the subprogram's entry point
        """
        self.cli = argparse.ArgumentParser()

        self.cli.add_argument("-d", "--debug", action="store_true", help="enable asyncio debugging")
        self.cli.add_argument("-v", "--verbose", action="count", default=0, help="increase program verbosity")
        self.cli.add_argument("-q", "--quiet", action="count", default=0, help="decrease program verbosity")

        self.subparsers = self.cli.add_subparsers()

    def add_argument(self, *args, **kwargs):
        self.cli.add_argument(*args, **kwargs)

    def add_subcommand(self, name, subcommand_class):
        subparser = self.subparsers.add_parser(name)
        subparser.set_defaults(subcommand_class=subcommand_class)
        subcommand_class.argparse_register(subparser)

    def parse_args(self, loop):
        args = vars(self.cli.parse_args())

        # set up log level
        log_setup(args["verbose"] - args["quiet"])

        # enable asyncio debugging
        loop.set_debug(args["debug"])

        return Args(args, self.cli)
