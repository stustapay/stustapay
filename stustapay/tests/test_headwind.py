import json

from stustapay.administration.service.headwind import build_headwind_custom3
from stustapay.core.schema.terminal import HeadwindDeviceMapping, NewTerminal, Terminal
from stustapay.core.schema.tree import NewNode, Node
from stustapay.core.service.terminal import TerminalService
from stustapay.core.service.tree.service import TreeService


def test_build_headwind_custom3_uses_legacy_terminal_name_without_wifi():
    assert build_headwind_custom3(terminal_name="Terminal A") == "Terminal A"


def test_build_headwind_custom3_includes_wifi_payload_when_present():
    payload = build_headwind_custom3(
        terminal_name="Terminal A",
        wifi_ssid="festival-wifi",
        wifi_passphrase="secret1234",
    )

    assert json.loads(payload) == {
        "terminal_name": "Terminal A",
        "wifi_ssid": "festival-wifi",
        "wifi_passphrase": "secret1234",
    }


async def test_record_headwind_wifi_push_result(
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node,
    terminal: Terminal,
):
    mapping = await terminal_service.upsert_headwind_mapping(
        token=event_admin_token,
        node_id=event_node.id,
        terminal_id=terminal.id,
        headwind_device_id="device-1",
        headwind_device_number="1",
        headwind_device_name="Device 1",
        headwind_device_serial="serial-1",
        headwind_device_model="model-1",
    )

    result: HeadwindDeviceMapping = await terminal_service.record_headwind_wifi_push_result(
        token=event_admin_token,
        node_id=event_node.id,
        mapping_id=mapping.id,
        success=False,
        error_message="wifi update failed",
    )

    assert result.last_wifi_pushed_at is not None
    assert result.last_wifi_push_status == "error"
    assert result.last_wifi_push_error == "wifi update failed"


async def test_event_node_lists_and_updates_child_headwind_mappings(
    terminal_service: TerminalService,
    tree_service: TreeService,
    event_admin_token: str,
    event_node: Node,
):
    child_node = await tree_service.create_node(
        token=event_admin_token,
        node_id=event_node.id,
        new_node=NewNode(name="Sub Event Terminal Ops", description=""),
    )
    child_terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=child_node.id,
        terminal=NewTerminal(name="Child Terminal", description=""),
    )

    terminals = await terminal_service.list_terminals(token=event_admin_token, node_id=event_node.id)
    assert child_terminal.id in {terminal.id for terminal in terminals}

    mapping = await terminal_service.upsert_headwind_mapping(
        token=event_admin_token,
        node_id=event_node.id,
        terminal_id=child_terminal.id,
        headwind_device_id="child-device-1",
        headwind_device_number="1",
        headwind_device_name="Child Device",
        headwind_device_serial="serial-child-1",
        headwind_device_model="model-child-1",
    )

    mappings = await terminal_service.list_headwind_mappings(token=event_admin_token, node_id=event_node.id)
    assert mapping.id in {item.id for item in mappings}

    result: HeadwindDeviceMapping = await terminal_service.record_headwind_wifi_push_result(
        token=event_admin_token,
        node_id=event_node.id,
        mapping_id=mapping.id,
        success=True,
        error_message=None,
    )

    assert result.last_wifi_pushed_at is not None
    assert result.last_wifi_push_status == "success"
    assert result.last_wifi_push_error is None
