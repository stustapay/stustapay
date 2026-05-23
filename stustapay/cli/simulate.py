import asyncio
import csv
from pathlib import Path
from typing import Annotated, Optional

import typer

from stustapay.festivalsimulator.database_setup import DatabaseSetup, TagEntryCustom
from stustapay.festivalsimulator.festivalsetup import FestivalSetup
from stustapay.festivalsimulator.festivalsimulator import Simulator

simulate_cli = typer.Typer()


@simulate_cli.command()
def setup(
    ctx: typer.Context,
    n_cashiers: Annotated[
        Optional[int], typer.Option(help="number of cashiers to create, default is number of tills plus 50%")
    ] = None,
    n_tags: Annotated[int, typer.Option(help="number of tags to create")] = 1000,
    n_entry_tills: Annotated[int, typer.Option(help="number of entry tills to create")] = 10,
    n_topup_tills: Annotated[int, typer.Option(help="number of topup tills to create")] = 8,
    n_beer_tills: Annotated[int, typer.Option(help="number of beer tills to create")] = 20,
    n_cocktail_tills: Annotated[int, typer.Option(help="number of cocktail tills to create")] = 3,
    tags: Annotated[
        Optional[Path], typer.Option(help="CSV file with tags (columns: login, pin, uid (hex), roles (+-separated))")
    ] = None,
):
    """Prepare the database for a future stustapay simulation."""
    config = ctx.obj.config

    csv_tags = _parse_tag_csv(tags) if tags else None

    database_setup = DatabaseSetup(
        config=config,
        n_cocktail_tills=n_cocktail_tills,
        n_beer_tills=n_beer_tills,
        n_topup_tills=n_topup_tills,
        n_entry_tills=n_entry_tills,
        n_cashiers=n_cashiers,
        n_tags=n_tags,
        custom_tags=csv_tags,
    )
    asyncio.run(database_setup.run())


def _parse_tag_csv(file_path: Path) -> list[TagEntryCustom]:
    with open(file_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None or "pin" not in reader.fieldnames:
            raise ValueError(f"CSV file must contain a 'pin' column, got: {reader.fieldnames}")

        entries = []
        for row in reader:
            pin = row["pin"].strip()
            if not pin:
                continue

            login = None
            if login := row.get("login"):
                login = login.strip()

            uid = None
            if uid_hex := row.get("uid"):
                try:
                    uid = int(uid_hex.strip(), 16)
                except ValueError as e:
                    raise ValueError(f"Invalid uid hex '{uid_hex}' for pin {pin}") from e

            roles = []
            if roles_str := row.get("roles"):
                for role_raw in roles_str.strip().split("+"):
                    role = role_raw.strip()
                    if role:
                        roles.append(role)

            entries.append(TagEntryCustom(login=login, pin=pin, uid=uid, roles=roles))

        return entries


@simulate_cli.command()
def api(
    ctx: typer.Context,
    no_bon: Annotated[bool, typer.Option(help="Do not run the bon generator")] = False,
    no_tse: Annotated[bool, typer.Option(help="Do not run the TSE signature processor")] = False,
):
    """Start all APIs which are necessary for a working, simulated environment."""
    config = ctx.obj.config
    api_starter = FestivalSetup(config=config, no_bon=no_bon, no_tse=no_tse)
    api_starter.run()


@simulate_cli.command()
def start(
    ctx: typer.Context,
    bookings_per_second: Annotated[float, typer.Option(help="How many bookings per second should be run")] = 100.0,
):
    """Simulate an actual load on a stustapay instance."""
    config = ctx.obj.config
    simulator = Simulator(config=config, bookings_per_second=bookings_per_second)
    asyncio.run(simulator.run())
