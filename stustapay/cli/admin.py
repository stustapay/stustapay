import asyncio
from typing import Annotated

import typer

from stustapay.core import admin, populate

admin_cli = typer.Typer()


@admin_cli.command()
def add_user(ctx: typer.Context, node_id: int):
    asyncio.run(admin.add_user(config=ctx.obj.config, node_id=node_id))


@admin_cli.command()
def create_cash_registers(
    ctx: typer.Context,
    node_id: Annotated[int, typer.Option(help="Id of the tree node the cash registers should be created at")],
    n_registers: Annotated[int, typer.Option("--n-registers", "-n", help="Number of cash registers to create")],
    name_format: Annotated[
        str, typer.Option(help="Format string used as the cash register name, available format variables: 'i'")
    ] = "Blechkasse {i}",
    dry_run: Annotated[
        bool, typer.Option(help="perform a dry run, i.e. do not write anything to the database")
    ] = False,
):
    asyncio.run(
        populate.create_cash_registers(
            config=ctx.obj.config, node_id=node_id, n_registers=n_registers, name_format=name_format, dry_run=dry_run
        )
    )


@admin_cli.command()
def create_tills(
    ctx: typer.Context,
    node_id: Annotated[int, typer.Option(help="Id of the tree node the tills should be created at")],
    n_tills: Annotated[int, typer.Option("--n-tills", "-n", help="Number of tills to create")],
    profile_id: Annotated[int, typer.Option(help="Till profile id which will be assigned to the till")],
    name_format: Annotated[
        str, typer.Option(help="Format string used as the till name, available format variables: 'i'")
    ] = "Kasse {i}",
    dry_run: Annotated[
        bool, typer.Option(help="perform a dry run, i.e. do not write anything to the database")
    ] = False,
):
    asyncio.run(
        populate.create_tills(
            config=ctx.obj.config,
            node_id=node_id,
            n_tills=n_tills,
            profile_id=profile_id,
            name_format=name_format,
            dry_run=dry_run,
        )
    )
