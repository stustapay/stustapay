import asyncio
import sys
from pathlib import Path
from typing import Annotated, Optional

import typer

from stustapay.core.config import Config
from stustapay.core.database import (
    DB_FUNCTION_BLACKLIST,
    DB_FUNCTION_BLACKLIST_PREFIX,
    DatabaseRestoreConfig,
    get_database,
    load_test_dump,
    reset_schema,
)
from stustapay.core.database import list_revisions as list_revisions_

database_cli = typer.Typer()


@database_cli.command()
def attach(ctx: typer.Context):
    """Get a psql shell to the currently configured database."""
    db = get_database(config=ctx.obj.config.database)
    asyncio.run(db.attach())


@database_cli.command()
def migrate(
    ctx: typer.Context,
    until_revision: Annotated[Optional[str], typer.Option(help="Only apply revisions until this version")] = None,
):
    """Apply all database migrations."""
    db = get_database(config=ctx.obj.config.database)
    asyncio.run(
        db.apply_migrations(
            until_migration=until_revision,
            function_blacklist=DB_FUNCTION_BLACKLIST,
            function_blacklist_prefix=DB_FUNCTION_BLACKLIST_PREFIX,
        )
    )


async def _rebuild(cfg: Config):
    db = get_database(cfg.database)
    db_pool = await db.create_pool(n_connections=2)
    try:
        await reset_schema(db_pool=db_pool)
        await db.apply_migrations(
            function_blacklist=DB_FUNCTION_BLACKLIST,
            function_blacklist_prefix=DB_FUNCTION_BLACKLIST_PREFIX,
        )
    finally:
        await db_pool.close()


@database_cli.command()
def rebuild(ctx: typer.Context):
    """Wipe the database and apply all revisions."""
    asyncio.run(_rebuild(ctx.obj.config))


async def _reset(cfg: Config):
    db = get_database(cfg.database)
    db_pool = await db.create_pool()
    try:
        await reset_schema(db_pool=db_pool)
    finally:
        await db_pool.close()


@database_cli.command()
def reset(
    ctx: typer.Context,
):
    """Wipe the database."""
    asyncio.run(_reset(ctx.obj.config))


@database_cli.command()
def list_revisions(
    ctx: typer.Context,
):
    """List all available database revisions."""
    db = get_database(ctx.obj.config.database)
    list_revisions_(db)


@database_cli.command()
def reload_code(ctx: typer.Context):
    """List all available database revisions."""
    db = get_database(ctx.obj.config.database)
    asyncio.run(
        db.reload_code(function_blacklist=DB_FUNCTION_BLACKLIST, function_blacklist_prefix=DB_FUNCTION_BLACKLIST_PREFIX)
    )


@database_cli.command()
def load_dump(
    ctx: typer.Context,
    restore_config_path: Annotated[
        Path, typer.Option("--restore-config", help="Path to json file containing a restore config")
    ],
    dump_file: Annotated[Path, typer.Option("--db-dump", help="Path to database dump file")],
):
    """Load a database dump, removing all sensible configs."""
    restore_config = DatabaseRestoreConfig.model_validate_json(restore_config_path.read_text())
    db = get_database(ctx.obj.config.database)
    success = asyncio.run(load_test_dump(db, dump_file, restore_config))
    if not success:
        sys.exit(1)
