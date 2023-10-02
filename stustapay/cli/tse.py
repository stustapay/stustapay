import asyncio
from typing import Annotated, Optional

import typer

from stustapay.tse.signature_processor import SignatureProcessor
from stustapay.tse.simulator import Simulator
from stustapay.tse.tse_switchover import TseSwitchover

tse_cli = typer.Typer()


@tse_cli.command()
def signature_processor(ctx: typer.Context):
    processor = SignatureProcessor(config=ctx.obj.config)
    asyncio.run(processor.run())


@tse_cli.command()
def simulator(
    host: Annotated[str, typer.Option(help="local bind address")] = "localhost",
    port: Annotated[int, typer.Option("--port", "-p", help="port for websocket to listen, default 10001")] = 10001,
    delay: Annotated[
        float, typer.Option("--delay", "-d", help="artificial delay for signature to mimic real TSE, default 0.25s")
    ] = 0.25,
    fast: Annotated[bool, typer.Option("--fast", "-f", help="no artificial delay for signature")] = False,
    even_more_realistic: Annotated[
        bool, typer.Option("--even_more_realistic", "-r", help="might be a bit to realistic, be careful")
    ] = False,
    secret_key: Annotated[
        Optional[str], typer.Option("--secret_key", "-s", help="ECDSA BRAINPOOLP384r1 sha384 in hex")
    ] = None,
    gen_key: Annotated[bool, typer.Option("--gen_key", "-g", help="generate new secret key")] = False,
    broken: Annotated[bool, typer.Option("--broken", "-b", help="simulator with error")] = False,
):
    sim = Simulator(
        host,
        port,
        delay,
        fast,
        even_more_realistic,
        secret_key,
        gen_key,
        broken,
    )
    asyncio.run(sim.run())


@tse_cli.command()
def tse_switchover(
    ctx: typer.Context,
    show: Annotated[bool, typer.Option("--show", "-s", help="only show status")] = False,
    nc: Annotated[bool, typer.Option("--nc", "-n", help="curses interface")] = False,
    disable: Annotated[bool, typer.Option(help="disable a failed TSE")] = False,
    tse: Annotated[Optional[str], typer.Option(help="TSE name to disable")] = None,
):
    switch = TseSwitchover(config=ctx.obj.config, show=show, nc=nc, disable=disable, tse=tse)
    asyncio.run(switch.run())
