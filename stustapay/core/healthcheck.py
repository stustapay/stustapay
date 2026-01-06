import asyncio
import getpass
import logging
import os
import tempfile
import traceback
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel
from sftkit.database import Database

from stustapay.core.database import check_revision_version


class Healtcheck(BaseModel):
    timestamp: str
    service_name: str
    healthy: bool


def get_healthcheck_dir() -> Path:
    override = os.environ.get("STUSTAPAY_HEALTHCHECK_DIR")
    if override:
        prod_path = Path(override)
        try:
            prod_path.mkdir(exist_ok=True, parents=True)
            return prod_path
        except OSError:
            pass

    if os.name == "nt":
        prod_path = Path("./run/stustapay")
        prod_path.mkdir(exist_ok=True, parents=True)
        return prod_path

    candidates: list[Path] = []
    xdg_runtime_dir = os.environ.get("XDG_RUNTIME_DIR")
    if xdg_runtime_dir:
        candidates.append(Path(xdg_runtime_dir) / "stustapay")
    candidates.append(Path("/run/stustapay") / str(getpass.getuser()))
    candidates.append(Path("/run/user") / str(os.getuid()) / "stustapay")
    candidates.append(Path(tempfile.gettempdir()) / "stustapay" / str(getpass.getuser()))

    for prod_path in candidates:
        try:
            prod_path.mkdir(exist_ok=True, parents=True)
            return prod_path
        except OSError:
            continue

    prod_path = Path("./run/stustapay")
    prod_path.mkdir(exist_ok=True, parents=True)
    return prod_path


async def write_healtcheck_status(db: Database, healthcheck_dir: Path, service_name: str):
    try:
        await check_revision_version(db)
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


async def run_healthcheck(db: Database, service_name: str):
    try:
        healthcheck_dir = get_healthcheck_dir()
    except:  # pylint: disable=bare-except
        logging.error(f"An unexpected error while trying to obtain the healtcheck output dir {traceback.format_exc()}")
        return

    try:
        while True:
            await write_healtcheck_status(db, service_name=service_name, healthcheck_dir=healthcheck_dir)
            await asyncio.sleep(30)
    except asyncio.CancelledError:
        return
