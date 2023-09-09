import typer

from stustapay import token_generation

token_cli = typer.Typer()


@token_cli.command()
def generate_nfc(count: int = 10):
    token_generation.generate_nfc(count)


@token_cli.command()
def generate_key():
    token_generation.generate_key()
