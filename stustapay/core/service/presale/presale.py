# pylint: disable=unexpected-keyword-arg
# pylint: disable=unused-argument
import logging
from typing import Optional

import asyncpg
from sftkit.database import Connection
from sftkit.error import NotFound
from sftkit.service import Service, with_db_transaction

from stustapay.bon.bon import BonJson
from stustapay.core.config import Config
from stustapay.core.schema.ticket import Ticket
from stustapay.core.service.auth import AuthService
from stustapay.core.service.config import ConfigService
from stustapay.core.service.presale.sumup import SumupService
from stustapay.core.service.tree.common import (
    fetch_event_node_for_node,
    fetch_restricted_event_settings_for_node,
)




class PresaleService(Service[Config]):
    def __init__(self, db_pool: asyncpg.Pool, config: Config, auth_service: AuthService, config_service: ConfigService):
        super().__init__(db_pool, config)
        self.auth_service = auth_service
        self.config_service = config_service
        self.logger = logging.getLogger("presale")
        self.sumup = SumupService(db_pool=db_pool, config=config, auth_service=auth_service)


    # @with_db_transaction(read_only=True)
    # async def presale_ticket(self, *, conn: Connection, ticket_id) -> Ticket | None:
    #     # is customer registered for payout
    #     return await conn.fetch_maybe_one(
    #         Ticket,
    #         """
    #         select t.* from ticket t where t.id = $1 and presale = true
    #         """,
    #         ticket_id,
    #     )
