# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.schema.entry import NewEntryArea
from stustapay.core.schema.terminal import NewTerminal, Terminal, TerminalMode
from stustapay.core.schema.tree import Node
from stustapay.core.service.entry import EntryService
from stustapay.core.service.terminal import TerminalService


async def test_terminal_registration_flow(
    terminal_service: TerminalService,
    event_node: Node,
    event_admin_token: str,
    terminal_token: str,
):
    terminal_config = await terminal_service.get_terminal_config(token=terminal_token)
    assert terminal_config is not None

    # logout till from terminal
    await terminal_service.logout_terminal(token=terminal_token)

    # logout till from admin
    logged_out = await terminal_service.logout_terminal_id(
        token=event_admin_token, node_id=event_node.id, terminal_id=terminal_config.id
    )
    assert logged_out


async def test_terminal_self_service_roundtrip(
    terminal_service: TerminalService,
    event_node: Node,
    event_admin_token: str,
):
    terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name="Self Service", description="", self_service=True),
    )

    assert terminal.self_service is True

    fetched_terminal = await terminal_service.get_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal_id=terminal.id,
    )

    assert fetched_terminal is not None
    assert fetched_terminal.self_service is True

    updated_terminal = await terminal_service.update_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal_id=terminal.id,
        terminal=NewTerminal(name="Self Service", description="", self_service=False),
    )

    assert updated_terminal.self_service is False


async def test_terminal_config_exposes_self_service_flag(
    terminal_service: TerminalService,
    terminal_token: str,
    terminal: Terminal,
    event_admin_token: str,
    event_node: Node,
):
    updated_terminal = await terminal_service.update_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal_id=terminal.id,
        terminal=NewTerminal(name="Test Terminal", description="", self_service=True),
    )

    assert updated_terminal.self_service is True

    terminal_config = await terminal_service.get_terminal_config(token=terminal_token)
    assert terminal_config is not None
    assert terminal_config.self_service is True


async def test_entry_and_exit_terminals_clear_self_service(
    entry_service: EntryService,
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
):
    area = await entry_service.create_entry_area(
        token=event_admin_token,
        node_id=event_node.id,
        area=NewEntryArea(name="Main Entry", description="Gate A"),
    )

    entry_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Entry Terminal",
            description="",
            mode=TerminalMode.entry,
            entry_area_id=area.id,
            self_service=True,
        ),
    )

    assert entry_terminal.self_service is False

    exit_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(
            name="Exit Terminal",
            description="",
            mode=TerminalMode.exit,
            entry_area_id=area.id,
            self_service=True,
        ),
    )

    assert exit_terminal.self_service is False
