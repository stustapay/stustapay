import binascii
import random
from textwrap import wrap


def generate_nfc(count: int):
    print("index,id,pin")
    for i in range(count):
        chipid = binascii.hexlify(random.randbytes(8)).decode()

        # so we have 1291467969 pins
        pin = "".join(random.choices("abcdefghjkmnpqrstuvwxyz0123456789", k=6))

        print(f"{i},{chipid},{pin}")


def generate_key():
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
