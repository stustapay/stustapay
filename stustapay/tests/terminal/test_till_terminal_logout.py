# pylint: disable=attribute-defined-outside-init,unexpected-keyword-arg,missing-kwoa

import secrets

from stustapay.core.schema.terminal import NewTerminal
from stustapay.core.schema.till import NewTill
from stustapay.core.schema.tree import Node
from stustapay.core.schema.user import ADMIN_ROLE_ID, UserTag
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.till.till import TillService


async def _assert_logged_out(terminal_service: TerminalService, terminal_token: str):
    user = await terminal_service.get_current_user(token=terminal_token)
    assert user is None


async def _assert_logged_in(terminal_service: TerminalService, terminal_token: str):
    user = await terminal_service.get_current_user(token=terminal_token)
    assert user is not None


async def test_remove_from_terminal_logs_out_user(
    terminal_service: TerminalService,
    till_service: TillService,
    till,
    terminal,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
):
    await _assert_logged_in(terminal_service, terminal_token)
    await till_service.remove_from_terminal(token=event_admin_token, node_id=event_node.id, till_id=till.id)
    await _assert_logged_out(terminal_service, terminal_token)


async def test_switch_terminal_logs_out_user(
    terminal_service: TerminalService,
    till_service: TillService,
    till,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
):
    await _assert_logged_in(terminal_service, terminal_token)
    other_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name=secrets.token_hex(8), description=""),
    )
    await till_service.switch_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        till_id=till.id,
        new_terminal_id=other_terminal.id,
    )
    await _assert_logged_out(terminal_service, terminal_token)


async def test_switch_till_logs_out_user(
    terminal_service: TerminalService,
    till_service: TillService,
    till,
    terminal,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
):
    await _assert_logged_in(terminal_service, terminal_token)
    other_till = await till_service.create_till(
        token=event_admin_token,
        node_id=event_node.id,
        till=NewTill(
            name=secrets.token_hex(8),
            active_profile_id=till.active_profile_id,
            terminal_id=None,
        ),
    )
    await terminal_service.switch_till(
        token=event_admin_token,
        node_id=event_node.id,
        terminal_id=terminal.id,
        new_till_id=other_till.id,
    )
    await _assert_logged_out(terminal_service, terminal_token)


async def test_switch_till_without_assigned_till_logs_out_user(
    terminal_service: TerminalService,
    till_service: TillService,
    till_profile,
    event_admin_token: str,
    event_node: Node,
    event_admin_tag,
):
    terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name=secrets.token_hex(8), description=""),
    )
    registration = await terminal_service.register_terminal(registration_uuid=terminal.registration_uuid)
    await terminal_service.login_user(
        token=registration.token, user_tag=UserTag(uid=event_admin_tag.uid), user_role_id=ADMIN_ROLE_ID
    )
    await _assert_logged_in(terminal_service, registration.token)

    unassigned_till = await till_service.create_till(
        token=event_admin_token,
        node_id=event_node.id,
        till=NewTill(
            name=secrets.token_hex(8),
            active_profile_id=till_profile.id,
            terminal_id=None,
        ),
    )

    await terminal_service.switch_till(
        token=event_admin_token,
        node_id=event_node.id,
        terminal_id=terminal.id,
        new_till_id=unassigned_till.id,
    )

    await _assert_logged_out(terminal_service, registration.token)


async def test_update_till_assign_terminal_logs_out_user(
    terminal_service: TerminalService,
    till_service: TillService,
    till_profile,
    event_admin_token: str,
    event_node: Node,
    event_admin_tag,
):
    terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name=secrets.token_hex(8), description=""),
    )
    registration = await terminal_service.register_terminal(registration_uuid=terminal.registration_uuid)
    await terminal_service.login_user(
        token=registration.token, user_tag=UserTag(uid=event_admin_tag.uid), user_role_id=ADMIN_ROLE_ID
    )
    await _assert_logged_in(terminal_service, registration.token)

    unassigned_till = await till_service.create_till(
        token=event_admin_token,
        node_id=event_node.id,
        till=NewTill(
            name=secrets.token_hex(8),
            active_profile_id=till_profile.id,
            terminal_id=None,
        ),
    )

    await till_service.update_till(
        token=event_admin_token,
        node_id=event_node.id,
        till_id=unassigned_till.id,
        till=NewTill(
            name=unassigned_till.name,
            description=unassigned_till.description,
            active_shift=unassigned_till.active_shift,
            active_profile_id=unassigned_till.active_profile_id,
            terminal_id=terminal.id,
        ),
    )

    await _assert_logged_out(terminal_service, registration.token)


async def test_update_till_change_terminal_logs_out_old_terminal_user(
    terminal_service: TerminalService,
    till_service: TillService,
    till,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
):
    await _assert_logged_in(terminal_service, terminal_token)

    other_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name=secrets.token_hex(8), description=""),
    )

    await till_service.update_till(
        token=event_admin_token,
        node_id=event_node.id,
        till_id=till.id,
        till=NewTill(
            name=till.name,
            description=till.description,
            active_shift=till.active_shift,
            active_profile_id=till.active_profile_id,
            terminal_id=other_terminal.id,
        ),
    )

    await _assert_logged_out(terminal_service, terminal_token)


async def test_update_till_remove_terminal_logs_out_user(
    terminal_service: TerminalService,
    till_service: TillService,
    till,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
):
    await _assert_logged_in(terminal_service, terminal_token)

    await till_service.update_till(
        token=event_admin_token,
        node_id=event_node.id,
        till_id=till.id,
        till=NewTill(
            name=till.name,
            description=till.description,
            active_shift=till.active_shift,
            active_profile_id=till.active_profile_id,
            terminal_id=None,
        ),
    )

    await _assert_logged_out(terminal_service, terminal_token)


async def test_update_till_without_terminal_change_keeps_user_logged_in(
    terminal_service: TerminalService,
    till_service: TillService,
    till,
    terminal_token: str,
    event_admin_token: str,
    event_node: Node,
):
    await _assert_logged_in(terminal_service, terminal_token)

    await till_service.update_till(
        token=event_admin_token,
        node_id=event_node.id,
        till_id=till.id,
        till=NewTill(
            name=f"{till.name}-updated",
            description=till.description,
            active_shift=till.active_shift,
            active_profile_id=till.active_profile_id,
            terminal_id=till.terminal_id,
        ),
    )

    await _assert_logged_in(terminal_service, terminal_token)
