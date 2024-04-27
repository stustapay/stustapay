# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

from stustapay.core.schema.tree import Node
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
