import json

from stustapay.administration.service.headwind import build_headwind_custom3
from stustapay.core.schema.terminal import HeadwindDeviceMapping
from stustapay.core.schema.terminal import Terminal
from stustapay.core.service.terminal import TerminalService


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
