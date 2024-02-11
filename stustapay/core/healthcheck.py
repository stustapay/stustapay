import asyncio
import getpass
import logging
import os
import traceback
from datetime import datetime
from pathlib import Path

import asyncpg
from pydantic import BaseModel

from stustapay.core.database import check_revision_version


class Healtcheck(BaseModel):
    timestamp: str
    service_name: str
    healthy: bool


def get_healthcheck_dir() -> Path:
    prod_path = Path("/run/stustapay") / str(getpass.getuser())
    if not prod_path.is_dir():
        prod_path = Path("/run/user") / str(os.getuid()) / "stustapay"
        prod_path.mkdir(exist_ok=True, parents=True)
    return prod_path


async def write_healtcheck_status(db_pool: asyncpg.Pool, healthcheck_dir: Path, service_name: str):
    try:
        await check_revision_version(db_pool=db_pool)
        healthy = True
    except:  # pylint: disable=bare-except
        healthy = False

    try:
        status = Healtcheck(timestamp=datetime.now().isoformat(), service_name=service_name, healthy=healthy)
        status_file_name = healthcheck_dir / f"{service_name}.json"
        status_file_name.parent.mkdir(parents=True, exist_ok=True)
        with status_file_name.open("w+") as f:
            f.write(status.model_dump_json())
    except:  # pylint: disable=bare-except
        logging.error(f"An unexpected error occured during healthcheck {traceback.format_exc()}")


async def run_healthcheck(db_pool: asyncpg.Pool, service_name: str):
    try:
        healthcheck_dir = get_healthcheck_dir()
    except:  # pylint: disable=bare-except
        logging.error(f"An unexpected error while trying to obtain the healtcheck output dir {traceback.format_exc()}")
        return

    try:
        while True:
            await write_healtcheck_status(db_pool=db_pool, service_name=service_name, healthcheck_dir=healthcheck_dir)
            await asyncio.sleep(30)
    except asyncio.CancelledError:
        return
