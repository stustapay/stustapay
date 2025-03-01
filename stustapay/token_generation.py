import secrets
from textwrap import wrap


def generate_nfc(count: int):
    print("index,pin")
    for i in range(count):
        # so we have 36520347436056576 pins
        pin = "".join((secrets.choice("ACDEFHJKLMNPQRTUVWXY3479") for _ in range(12)))

        print(f"{i},{pin}")


def generate_key():
    key0 = secrets.token_hex(16)
    key1 = secrets.token_hex(16)

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
    print(f"- `key0[0]  == 0x{key0[0:2]}`")
    print(f"- `key0[15] == 0x{key0[15 * 2 : 15 * 2 + 2]}`")
    print(f"- `key1[0]  == 0x{key1[0:2]}`")
    print(f"- `key1[15] == 0x{key1[15 * 2 : 15 * 2 + 2]}`")
