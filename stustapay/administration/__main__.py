import argparse

import yaml

from stustapay.core.util import log_setup


def main():
    """
    main CLI entry point

    parses commands and jumps into the subprogram's entry point
    """
    cli = argparse.ArgumentParser()

    cli.add_argument('-c', '--config-path', default='server.conf')


    cli.add_argument("-d", "--debug", action="store_true",
                     help="enable asyncio debugging")
    cli.add_argument("-v", "--verbose", action="count", default=0,
                     help="increase program verbosity")
    cli.add_argument("-q", "--quiet", action="count", default=0,
                     help="decrease program verbosity")

    subparsers = cli.add_subparsers()
    def add_subcommand(name, subcommand_class):
        subparser = subparsers.add_parser(name)
        subparser.set_defaults(subcommand_class=subcommand_class)
        subcommand_class.argparse_register(subparser)


    from . import command
    add_subcommand('api', command.Api)

    args = vars(cli.parse_args())

    # set up log level
    log_setup(args['verbose'] - args['quiet'])

    # enable asyncio debugging

    config_path = args.pop('config_path')
    with open(config_path) as config_file:
        config = yaml.safe_load(config_file)

    try:
        subcommand_class = args.pop('subcommand_class')
    except KeyError:
        cli.error('no subcommand was given')
    subcommand_class.argparse_validate(args, cli.error)
    subcommand_object = subcommand_class(config=config, **args)
    subcommand_object.run()


if __name__ == '__main__':
    main()
