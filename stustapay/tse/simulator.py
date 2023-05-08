from .config import Config
from .diebold_nixdorf_usb.simulator import WebsocketInterface
from ..core.subcommand import SubCommand


class Simulator(SubCommand):
    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("--host", default="::1")
        subparser.add_argument("-p", "--port", type=int, default=10001)
        subparser.add_argument("-d", "--delay", type=float, default=0.25)
        subparser.add_argument("-f", "--fast", action="store_true", default=False)
        subparser.add_argument("-r", "--even_more_realistic", action="store_true", default=False)

    def __init__(self, args, config: Config, **rest):
        del rest  # unused

        self.cfg = config

        self.tse_sim = WebsocketInterface(args.host, args.port, args.delay, args.fast, args.even_more_realistic)

    async def run(self):
        await self.tse_sim.run()
