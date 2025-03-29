from stustapay.core import database
from stustapay.core.config import Config
from stustapay.core.database import get_database
from stustapay.ticket_shop.pretix import PretixTicketProvider


async def run(config: Config):
    db = get_database(config.database)
    db_pool = await db.create_pool()
    await database.check_revision_version(db)
    pretix = PretixTicketProvider(config=config, db_pool=db_pool)
    await pretix.synchronize_tickets()
