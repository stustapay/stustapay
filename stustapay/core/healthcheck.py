import asyncio
import logging
import os
import traceback
from datetime import datetime
from pathlib import Path

import asyncpg

from stustapay.core.database import check_revision_version
from stustapay.core.util import BaseModel


class Healtcheck(BaseModel):
    timestamp: str
    service_name: str
    healthy: bool


async def write_healtcheck_status(db_pool: asyncpg.Pool, service_name: str):
    try:
        await check_revision_version(db_pool=db_pool)
        healthy = True
    except:  # pylint: disable=bare-except
        healthy = False

    try:
        status = Healtcheck(timestamp=datetime.now().isoformat(), service_name=service_name, healthy=healthy)
        status_file_name = Path("/run/user") / str(os.getuid()) / "stustapay" / f"{service_name}.json"
        status_file_name.parent.mkdir(parents=True, exist_ok=True)
        with status_file_name.open("w+") as f:
            f.write(status.json())
    except:  # pylint: disable=bare-except
        logging.error(f"An unexpected error occured during healthcheck {traceback.format_exc()}")


async def run_healthcheck(db_pool: asyncpg.Pool, service_name: str):
    while True:
        await write_healtcheck_status(db_pool=db_pool, service_name=service_name)
        await asyncio.sleep(30)
