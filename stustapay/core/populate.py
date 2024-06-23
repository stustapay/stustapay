import logging

from stustapay.core.config import Config
from stustapay.core.database import get_database
from stustapay.core.schema.till import NewCashRegister, NewTill
from stustapay.core.service.till.register import create_cash_register
from stustapay.core.service.till.till import create_till
from stustapay.core.service.tree.common import fetch_node

logger = logging.getLogger(__name__)


async def create_cash_registers(config: Config, node_id: int, n_registers: int, name_format: str, dry_run: bool):
    db = get_database(config.database)
    db_pool = await db.create_pool()
    try:
        async with db_pool.acquire() as conn:
            async with conn.transaction(isolation="serializable"):
                node = await fetch_node(conn=conn, node_id=node_id)
                assert node is not None
                for i in range(n_registers):
                    register_name = name_format.format(i=i + 1)
                    logger.info(f"Creating cash register: '{register_name}'")

                    if not dry_run:
                        await create_cash_register(
                            conn=conn, node=node, new_register=NewCashRegister(name=register_name)
                        )
    finally:
        await db_pool.close()


async def create_tills(config: Config, node_id: int, n_tills: int, name_format: str, profile_id: int, dry_run: bool):
    db = get_database(config.database)
    db_pool = await db.create_pool()
    try:
        async with db_pool.acquire() as conn:
            async with conn.transaction(isolation="serializable"):
                for i in range(n_tills):
                    till_name = name_format.format(i=i + 1)
                    logger.info(f"Creating till: '{till_name}'")

                    if not dry_run:
                        await create_till(
                            conn=conn, node_id=node_id, till=NewTill(name=till_name, active_profile_id=profile_id)
                        )
    finally:
        await db_pool.close()
