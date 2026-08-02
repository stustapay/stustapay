# pylint: disable=protected-access,redefined-outer-name,unexpected-keyword-arg,missing-kwoa
from sftkit.database import Connection

from stustapay.core.schema.terminal import NewTerminal
from stustapay.core.schema.till import NewTill, Till, TillProfile
from stustapay.core.schema.tree import Node
from stustapay.core.schema.tse import NewTse, TseType
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.till.till import TillService
from stustapay.core.service.tse import create_tse
from stustapay.tse.handler import TSEHandler, TSEMasterData, TSESignature, TSESignatureRequest
from stustapay.tse.wrapper import TSEWrapper

MASTER_DATA = TSEMasterData(
    tse_serial="test-tse-serial",
    tse_hashalgo="ecdsa",
    tse_time_format="unixTime",
    tse_public_key="test-public-key",
    tse_certificate="test-certificate",
    tse_tse_description="Diebold Nixdorf USB TSE 0362",
    tse_certificate_date="20200101",
    tse_process_data_encoding="UTF-8",
)


class FakeTSEHandler(TSEHandler):
    def __init__(self, initial_client_ids: list[str]):
        self.client_ids = set(initial_client_ids)
        self._stopped = False

    async def start(self) -> bool:
        return True

    async def stop(self):
        self._stopped = True

    async def register_client_id(self, client_id: str):
        self.client_ids.add(client_id)

    async def deregister_client_id(self, client_id: str):
        self.client_ids.discard(client_id)

    async def sign(self, request: TSESignatureRequest) -> TSESignature:
        raise NotImplementedError()

    async def get_client_ids(self) -> list[str]:
        return sorted(self.client_ids)

    def get_master_data(self) -> TSEMasterData:
        return MASTER_DATA

    def is_stop_set(self) -> bool:
        return True

    def __str__(self):
        return "FakeTSEHandler"


async def test_tse_wrapper_deregisters_foreign_client_ids(
    db_connection: Connection,
    event_node: Node,
    till: Till,
    till_service: TillService,
    till_profile: TillProfile,
    event_admin_token: str,
    terminal_service: TerminalService,
):
    tse = await create_tse(
        conn=db_connection,
        node=event_node,
        new_tse=NewTse(
            name="test-tse-client-ids",
            serial=MASTER_DATA.tse_serial,
            type=TseType.diebold_nixdorf,
            ws_url="ws://localhost:1",
            ws_timeout=1.0,
            password="secret",
            first_operation=None,
        ),
    )
    await db_connection.execute("update till set tse_id = $1 where id = $2", tse.id, till.id)

    other_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name="other-terminal-tse-client-ids", description=""),
    )
    unassigned_till = await till_service.create_till(
        token=event_admin_token,
        node_id=event_node.id,
        till=NewTill(
            name="unassigned-till-tse-client-ids",
            active_profile_id=till_profile.id,
            terminal_id=other_terminal.id,
        ),
    )

    foreign_non_int = "VendorLeftoverClient"
    unknown_numeric = "42"
    handler = FakeTSEHandler(
        initial_client_ids=[str(till.id), str(unassigned_till.id), foreign_non_int, unknown_numeric]
    )
    wrapper = TSEWrapper(tse_id=tse.id, factory_function=lambda: handler)
    wrapper._tse_handler = handler

    await wrapper._tse_handler_loop(db_connection)

    assert handler.client_ids == {str(till.id)}
    assert wrapper._tills == {str(till.id)}

    history = await db_connection.fetch(
        "select till_id, what from till_tse_history where tse_id = $1 order by till_id, what",
        tse.id,
    )
    assert [(row["till_id"], row["what"]) for row in history] == [(unassigned_till.id, "deregister")]
