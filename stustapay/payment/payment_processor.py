from stustapay.core import database
from stustapay.core.config import Config
from stustapay.core.database import get_database
from stustapay.core.service.auth import AuthService
from stustapay.core.service.order.sumup import SumupService


async def run(config: Config):
    db = get_database(config.database)
    db_pool = await db.create_pool()
    await database.check_revision_version(db)
    auth_service = AuthService(config=config, db_pool=db_pool)
    sumup_service = SumupService(config=config, db_pool=db_pool, auth_service=auth_service)
    await sumup_service.run_sumup_pending_order_processing()
