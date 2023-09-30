import csv
import json
import logging
from pathlib import Path
from typing import Optional

from pydantic import BaseModel

from stustapay.core.config import Config
from stustapay.core.schema.till import NewCashRegister, NewTill
from stustapay.core.service.till.register import create_cash_register
from stustapay.core.service.till.till import create_till
from stustapay.framework.database import create_db_pool

logger = logging.getLogger(__name__)


class TagSecretSchema(BaseModel):
    key0: str
    key1: str
    description: str


async def load_tag_secret(config: Config, node_id: int, secret_file: Path, dry_run: bool):
    db_pool = await create_db_pool(config.database)
    try:
        if not secret_file.exists() or not secret_file.is_file():
            logger.error(f"Secret file: {secret_file} does not exist")
            return

        with open(secret_file, "r") as f:
            secret = TagSecretSchema.model_validate_json(json.load(f))

        logger.info(f"Creating secret '{secret.description}'")

        key0 = secret.key0.replace(" ", "")
        key1 = secret.key1.replace(" ", "")

        secret_id = None
        if not dry_run:
            secret_id = await db_pool.fetchval(
                "insert into user_tag_secret (key0, key1, description, node_id) "
                "values (decode($1, 'hex'), decode($2, 'hex'), $3, $4) returning id",
                key0,
                key1,
                secret.description,
                node_id,
            )

        logger.info(f"Created secret '{secret.description}. ID {secret_id = }")
    finally:
        await db_pool.close()


async def load_tags(
    config: Config, node_id: int, csv_file: Path, restriction_type: Optional[str], tag_secret_id: int, dry_run: bool
):
    db_pool = await create_db_pool(config.database)
    try:
        if not csv_file.exists() or not csv_file.is_file():
            logger.error(f"CSV file: {csv_file} does not exist")
            return

        restriction_rows = await db_pool.fetch("select * from restriction_type")
        restrictions = [row["name"] for row in restriction_rows]
        if restriction_type is not None and restriction_type not in restrictions:
            logger.error(f"Restriction type '{restriction_type}' does not exist")
            return

        with open(csv_file, "r") as csvfile:
            csv_reader = csv.reader(csvfile, delimiter=",")
            next(csv_reader, None)
            async with db_pool.acquire() as conn:
                async with conn.transaction():
                    for row in csv_reader:
                        if any(x == "" for x in row):
                            logger.warning(f"Skipping row in csv: {row}")
                            continue

                        logger.debug(f"loading tag data into db: {row}")

                        if not dry_run:
                            # row is: [serial number,ID,PIN code,UID]
                            await conn.execute(
                                "insert into user_tag(node_id, uid, pin, serial, restriction, secret) "
                                "values ($1, $2, $3, $4, $5, $6)",
                                node_id,
                                int(row[3], 16),  # UID
                                row[2],  # PIN
                                row[1],  # ID
                                restriction_type,
                                tag_secret_id,
                            )
    finally:
        await db_pool.close()


async def create_cash_registers(config: Config, node_id: int, n_registers: int, name_format: str, dry_run: bool):
    db_pool = await create_db_pool(config.database)
    try:
        async with db_pool.acquire() as conn:
            async with conn.transaction():
                for i in range(n_registers):
                    register_name = name_format.format(i=i + 1)
                    logger.info(f"Creating cash register: '{register_name}'")

                    if not dry_run:
                        await create_cash_register(
                            conn=conn, node_id=node_id, new_register=NewCashRegister(name=register_name)
                        )
    finally:
        await db_pool.close()


async def create_tills(config: Config, node_id: int, n_tills: int, name_format: str, profile_id: int, dry_run: bool):
    db_pool = await create_db_pool(config.database)
    try:
        async with db_pool.acquire() as conn:
            async with conn.transaction():
                for i in range(n_tills):
                    till_name = name_format.format(i=i + 1)
                    logger.info(f"Creating till: '{till_name}'")

                    if not dry_run:
                        await create_till(
                            conn=conn, node_id=node_id, till=NewTill(name=till_name, active_profile_id=profile_id)
                        )
    finally:
        await db_pool.close()
