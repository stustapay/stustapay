import asyncio
import json
from pathlib import Path
from typing import Annotated, Optional

import typer

from stustapay.core import admin, populate

admin_cli = typer.Typer()


@admin_cli.command()
def add_user(ctx: typer.Context, node_id: int):
    asyncio.run(admin.add_user(config=ctx.obj.config, node_id=node_id))


@admin_cli.command()
def load_tag_secret(
    ctx: typer.Context,
    node_id: Annotated[int, typer.Option(help="Id of the tree node the user tags secret should be created at")],
    secret_file: Annotated[
        Path,
        typer.Option(
            "--secret-file",
            "-f",
            help=f"path to .json file with the following structure:\n\n"
            f"{json.dumps(populate.TagSecretSchema.model_json_schema(), indent=2)}\n\n"
            f"Whitespaces used as visual alignment in the hex representation of the keys will be stripped",
        ),
    ],
    dry_run: Annotated[
        bool, typer.Option(help="perform a dry run, i.e. do not write anything to the database")
    ] = False,
):
    asyncio.run(
        populate.load_tag_secret(config=ctx.obj.config, node_id=node_id, secret_file=secret_file, dry_run=dry_run)
    )


@admin_cli.command()
def load_tags(
    ctx: typer.Context,
    csv_file: Annotated[
        Path,
        typer.Option(
            "--csv-file",
            "-f",
            help="Name of .csv file with tag configuration, expects 4 columns: [serial number,ID,PIN code,UID]",
        ),
    ],
    node_id: Annotated[int, typer.Option(help="Id of the tree node the user tags should be created at")],
    tag_secret_id: Annotated[int, typer.Option(help="id of tag secret in database")],
    restriction_type: Annotated[
        Optional[str], typer.Option(help="tag restriction type, if omitted will assume tags have no restriction")
    ] = None,
    dry_run: Annotated[
        bool, typer.Option(help="perform a dry run, i.e. do not write anything to the database")
    ] = False,
):
    asyncio.run(
        populate.load_tags(
            config=ctx.obj.config,
            node_id=node_id,
            csv_file=csv_file,
            tag_secret_id=tag_secret_id,
            dry_run=dry_run,
            restriction_type=restriction_type,
        )
    )


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
