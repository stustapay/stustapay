from stustapay.framework.subcommand import SubCommand

from .config import Config
from .diebold_nixdorf_usb.simulator import WebsocketInterface


class Simulator(SubCommand[Config]):
    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("--host", default="localhost", help="local bind address, default localhost")
        subparser.add_argument(
            "-p", "--port", type=int, default=10001, help="port for websocket to listen, default 10001"
        )
        subparser.add_argument(
            "-d",
            "--delay",
            type=float,
            default=0.25,
            help="artificial delay for signature to mimic real TSE, default 0.25s",
        )
        subparser.add_argument(
            "-f", "--fast", action="store_true", default=False, help="no artificial delay for signature"
        )
        subparser.add_argument(
            "-r",
            "--even_more_realistic",
            action="store_true",
            default=False,
            help="might be a bit to realistic, be careful",
        )
        subparser.add_argument("-s", "--secret_key", type=str, default=None, help="ECDSA BRAINPOOLP384r1 sha384 in hex")
        subparser.add_argument("-g", "--gen_key", action="store_true", default=False, help="generate new secret key")
        subparser.add_argument("-b", "--broken", action="store_true", default=False, help="simulator with error")

    def __init__(self, args, config: Config, **rest):
        del rest  # unused

        self.cfg = config

        self.tse_sim = WebsocketInterface(
            args.host,
            args.port,
            args.delay,
            args.fast,
            args.even_more_realistic,
            args.secret_key,
            args.gen_key,
            args.broken,
        )

    async def run(self):
        await self.tse_sim.run()
