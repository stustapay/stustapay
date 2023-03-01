import asyncio
import contextlib
import logging

from ..core.subcommand import SubCommand
from .config import Config
from .muxer import TSEMuxer
from .handler import Order

LOGGER = logging.getLogger(__name__)


class SignatureProcessor(SubCommand):
    @staticmethod
    def argparse_register(subparser):
        del subparser  # unused, no extra arguments

    def __init__(self, args: dict, config: Config, **rest):
        del args, rest  # unused

        self.cfg = config
        self.db_pool = None
        self.muxer = TSEMuxer()
        self.tses = [tse_cfg.make() for tse_cfg in self.cfg.tses]

    async def run(self):
        async with contextlib.AsyncExitStack() as aes:
            for tse in self.tses:
                aes.enter_async_context(self.muxer.use_tse(tse))

            async for order in self.get_signature_requests():
                self.muxer.sign_order(order)

    async def get_signature_requests(self):
        # if False:
        #     db_pool = await create_db_pool(self.cfg.database)

        for order_bunch_no in range(10):
            yield Order("client0", f"{order_bunch_no} lol".encode())
            yield Order("client0", f"{order_bunch_no} rofl".encode())
            yield Order("client0", f"{order_bunch_no} lmao".encode())
            yield Order("client1", f"{order_bunch_no} wtf".encode())
            yield Order("client0", f"{order_bunch_no} burf".encode())
            yield Order("client1", f"{order_bunch_no} melf".encode())
            yield Order("client2", f"{order_bunch_no} mogf".encode())

            await asyncio.sleep(10)
