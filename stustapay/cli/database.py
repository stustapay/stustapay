import asyncio
from typing import Annotated, Optional

import typer

from stustapay.core.database import add_data as add_data_
from stustapay.core.database import apply_revisions
from stustapay.core.database import list_revisions as list_revisions_
from stustapay.core.database import reset_schema
from stustapay.core.schema import DATA_PATH, DEFAULT_EXAMPLE_DATA_FILE
from stustapay.framework.database import create_db_pool, psql_attach

database_cli = typer.Typer()


@database_cli.command()
def attach(ctx: typer.Context):
    """Get a psql shell to the currently configured database."""
    asyncio.run(psql_attach(ctx.obj.config.database))


@database_cli.command()
def migrate(
    ctx: typer.Context,
    until_revision: Annotated[Optional[str], typer.Option(help="Only apply revisions until this version")] = None,
):
    """Apply all database migrations."""
    db_pool = asyncio.run(create_db_pool(ctx.obj.config.database))
    try:
        asyncio.run(apply_revisions(db_pool=db_pool, until_revision=until_revision))
    finally:
        asyncio.run(db_pool.close())


@database_cli.command()
def rebuild(ctx: typer.Context):
    """Wipe the database and apply all revisions."""
    db_pool = asyncio.run(create_db_pool(ctx.obj.config.database))
    try:
        asyncio.run(reset_schema(db_pool=db_pool))
        asyncio.run(apply_revisions(db_pool=db_pool))
    finally:
        asyncio.run(db_pool.close())


@database_cli.command()
def reset(
    ctx: typer.Context,
):
    """Wipe the database."""
    db_pool = asyncio.run(create_db_pool(ctx.obj.config.database))
    try:
        asyncio.run(reset_schema(db_pool=db_pool))
    finally:
        asyncio.run(db_pool.close())


@database_cli.command()
def add_data(
    ctx: typer.Context,
    sql_file: Annotated[
        str, typer.Option(help=f"Name of the .sql file in {DATA_PATH} that will get loaded into the DB")
    ] = DEFAULT_EXAMPLE_DATA_FILE,
):
    """Load data from a sql file into the database."""
    db_pool = asyncio.run(create_db_pool(ctx.obj.config.database))
    try:
        asyncio.run(add_data_(db_pool=db_pool, sql_file=sql_file))
    finally:
        asyncio.run(db_pool.close())


@database_cli.command()
def list_revisions():
    """List all available database revisions."""
    list_revisions_()
