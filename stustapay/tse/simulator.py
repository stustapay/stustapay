import asyncio

from ..core.subcommand import SubCommand
from .config import Config
from .diebold_nixdorf_usb.simulator import WebsocketInterface


class Simulator(SubCommand):
    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("--host", default="::1")
        subparser.add_argument("-p", "--port", type=int, default=10001)

    def __init__(self, args: dict, config: Config, **rest):
        del rest  # unused

        self.cfg = config

        self.tse_sim = WebsocketInterface(args.host, args.port)

    async def run(self):
        await self.tse_sim.run()
