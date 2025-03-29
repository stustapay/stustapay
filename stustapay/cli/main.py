import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Annotated

import typer
from sftkit.util import log_setup

from stustapay.administration import server as admin_server
from stustapay.bon.generator import Generator
from stustapay.core.config import read_config
from stustapay.customer_portal import server as customerportal_server
from stustapay.dsfinvk.generator import Generator as DsfinvkGenerator
from stustapay.payment.payment_processor import run as run_payment_processor
from stustapay.terminalserver import server as terminal_server
from stustapay.ticket_shop.ticket_processor import run as run_ticket_processor

from .admin import admin_cli
from .database import database_cli
from .simulate import simulate_cli
from .token import token_cli
from .tse import tse_cli

cli = typer.Typer()


@cli.callback()
def get_config(
    ctx: typer.Context,
    config_path: Annotated[Path, typer.Option("--config-path", "-c")] = Path("/etc/stustapay/config.yaml"),
    quiet: Annotated[
        int,
        typer.Option("--quiet", "-q", count=True, help="decrease program verbosity"),
    ] = 0,
    verbose: Annotated[
        int,
        typer.Option("--verbose", "-v", count=True, help="increase program verbosity"),
    ] = 0,
    debug: Annotated[bool, typer.Option(help="enable asyncio debugging")] = False,
):
    log_setup(verbose - quiet)
    asyncio.get_event_loop().set_debug(debug)

    if not config_path.exists():
        sys.stderr.write(f"Config file does not exist: {config_path}")
        raise typer.Exit(1)

    config = read_config(config_path)
    ctx.obj = SimpleNamespace(config=config, config_path=config_path)


@cli.command()
def bon(
    ctx: typer.Context,
):
    """Run the bon generator."""
    generator = Generator(config=ctx.obj.config)
    generator.run()


@cli.command()
def dsfinvk_export(
    ctx: typer.Context,
    node_id: Annotated[int, typer.Option("--node-id", help="id of node to run the export for")],
    filename: Annotated[
        Path,
        typer.Option("--filename", "-f", help="output file path of resulting zip file"),
    ] = Path("dsfinV_k.zip"),
    index_xml: Annotated[Path, typer.Option("--xml", help="index.xml file to include")] = Path(
        "./stustapay/dsfinvk/assets/index.xml"
    ),
    dtd_file: Annotated[Path, typer.Option(help="*.dtd file to include")] = Path(
        "./stustapay/dsfinvk/assets/gdpdu-01-09-2004.dtd"
    ),
    dry_run: bool = False,
):
    """Export all data required by dsfinvk to the given zip file."""
    generator = DsfinvkGenerator(
        config=ctx.obj.config,
        filename=str(filename),
        xml=str(index_xml),
        dtd=str(dtd_file),
        simulate=dry_run,
        event_node_id=node_id,
    )
    asyncio.run(generator.run())


@cli.command()
def administration_api(ctx: typer.Context, show_openapi: bool = False):
    """Start the API for the administration UI."""
    if show_openapi:
        admin_server.print_openapi(config=ctx.obj.config)
        return
    server = admin_server.Api(config=ctx.obj.config)
    asyncio.run(server.run())


@cli.command()
def terminalserver_api(ctx: typer.Context, show_openapi: bool = False):
    """Start the API for the POS Android terminals."""
    if show_openapi:
        terminal_server.print_openapi(config=ctx.obj.config)
        return
    server = terminal_server.Api(config=ctx.obj.config)
    asyncio.run(server.run())


@cli.command()
def customerportal_api(ctx: typer.Context, show_openapi: bool = False):
    """Start the API for the Customer facing UI."""
    if show_openapi:
        customerportal_server.print_openapi(config=ctx.obj.config)
        return
    server = customerportal_server.Api(config=ctx.obj.config)
    asyncio.run(server.run())


@cli.command()
def payment_processor(ctx: typer.Context):
    """Run the payment processor."""
    asyncio.run(run_payment_processor(config=ctx.obj.config))


@cli.command()
def ticket_processor(ctx: typer.Context):
    """Run the ticket processor."""
    asyncio.run(run_ticket_processor(config=ctx.obj.config))


cli.add_typer(
    simulate_cli,
    name="simulate",
    help="Run parts or all of stustapay in simulation mode",
)
cli.add_typer(tse_cli, name="tse", help="Manage and parts of the TSE system")
cli.add_typer(token_cli, name="token", help="Generate secrets and identifiers for NFC tokens")
cli.add_typer(database_cli, name="db", help="Manage everything related to the stustapay database")
cli.add_typer(admin_cli, name="admin", help="General administrative utilities")


def main():
    cli()
