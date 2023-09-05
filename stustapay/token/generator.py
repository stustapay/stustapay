import binascii
import logging
import random
from textwrap import wrap

from stustapay.core.config import Config
from stustapay.framework.subcommand import SubCommand


class Generator(SubCommand[Config]):
    """
    Token id generationCommand which listens for database changes on bons and generates the bons immediately as pdf
    """

    @staticmethod
    def argparse_register(subparser):
        sp = subparser.add_subparsers()
        sp.required = True
        cli = sp.add_parser("nfc")
        cli.set_defaults(action="nfc")
        cli.add_argument("-n", "--count", type=int, default=10)

        cli = sp.add_parser("key")
        cli.set_defaults(action="key")

    def __init__(self, args, **rest):
        del rest
        self.args = args
        self.logger = logging.getLogger(__name__)

    async def run(self):
        if self.args.action == "nfc":
            print("index,id,pin")
            for i in range(self.args.count):
                chipid = binascii.hexlify(random.randbytes(8)).decode()

                # so we have 1291467969 pins
                pin = "".join(random.choices("abcdefghjkmnpqrstuvwxyz0123456789", k=6))

                print(f"{i},{chipid},{pin}")

        elif self.args.action == "key":
            key0 = binascii.hexlify(random.randbytes(16)).decode()
            key1 = binascii.hexlify(random.randbytes(16)).decode()

            # split in groups
            def pretty(key):
                return " ".join(wrap(key, 8))

            print("# Secret Keys")
            print()
            print("```")
            print(f"key0 = {pretty(key0)}")
            print(f"key1 = {pretty(key1)}")
            print("```")
            print()
            print("So:")
            print(f"- `key0[0]  == {key0[0:2]}`")
            print(f"- `key0[15] == {key0[15*2:15*2+2]}`")
            print(f"- `key1[0]  == {key1[0:2]}`")
            print(f"- `key1[15] == {key1[15*2:15*2+2]}`")
        else:
            raise Exception("unknown action")
