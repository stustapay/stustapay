import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Annotated, Optional

import typer

from stustapay.core import admin, populate
from stustapay.core.customer_bank_export import export_customer_payouts

admin_cli = typer.Typer()


@admin_cli.command()
def add_user(ctx: typer.Context):
    asyncio.run(admin.add_user(config=ctx.obj.config))


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


@admin_cli.command()
def customer_bank_export(
    ctx: typer.Context,
    created_by: Annotated[
        str,
        typer.Option("--created-by", "-c", help="User who created the payout run. This is used for logging purposes."),
    ],
    event_node_id: Annotated[
        int, typer.Option("--event-node-id", help="Event node in the tree the export should be created for")
    ],
    execution_date: Annotated[
        Optional[datetime],
        typer.Option(
            "--execution-date", "-t", formats=["%Y-%m-%d"], help="Execution date for SEPA transfer. Format: YYYY-MM-DD"
        ),
    ] = None,
    max_transactions_per_batch: Annotated[
        Optional[int],
        typer.Option(
            "--max-transactions-per-batch",
            "-n",
            help="Maximum amount of transactions per file. "
            "Not giving this argument means one large batch with all customers in a single file.",
        ),
    ] = None,
    payout_run_id: Annotated[
        Optional[int],
        typer.Option(
            "--payout-run-id",
            "-p",
            help="Payout run id. If not given, a new payout run is created. If given, the payout run is recreated.",
        ),
    ] = None,
    output_path: Annotated[
        Optional[Path],
        typer.Option(
            "--output-path",
            "-o",
            help="Output path for the generated files. If not given, the current working directory is used.",
        ),
    ] = None,
    max_payout_sum: Annotated[
        float,
        typer.Option(
            "--max-payout-sum",
            "-s",
            help="Maximum sum of money being payed out for this payout run. "
            "Relevant is the bank only accepts a certain max. number that one can spend per day. "
            "If not given, the default is 50.000€.",
        ),
    ] = 50_000.0,
    dry_run: Annotated[bool, typer.Option(help="If set, don't perform any database modifications.")] = False,
):
    asyncio.run(
        export_customer_payouts(
            config=ctx.obj.config,
            created_by=created_by,
            execution_date=execution_date,
            max_transactions_per_batch=max_transactions_per_batch,
            payout_run_id=payout_run_id,
            output_path=output_path,
            max_payout_sum=max_payout_sum,
            event_node_id=event_node_id,
            dry_run=dry_run,
        )
    )
