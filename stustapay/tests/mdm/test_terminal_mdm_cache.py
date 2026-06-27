from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from sftkit.database import Connection
from sftkit.error import InvalidArgument, NotFound

from stustapay.core.schema.terminal import NewTerminal
from stustapay.core.schema.tree import Node
from stustapay.core.service.terminal import TerminalService
from stustapay.mdm.mdm_provider import DeviceInfo, DeviceLocation, DeviceStatus


def _sample_device(device_id: str) -> DeviceInfo:
    return DeviceInfo(
        device_id=device_id,
        serial=f"serial-{device_id}",
        imei=None,
        description=None,
        last_update=None,
        ip_address=None,
        model=None,
        status=DeviceStatus.ONLINE,
    )


@pytest.mark.asyncio
async def test_fetch_mdm_event_node_ids_skips_read_only_events(
    db_connection: Connection,
    terminal_service: TerminalService,
    event_node: Node,
):
    await db_connection.execute(
        "update event set headwind_enabled = true, headwind_url = $1, headwind_username = $2, headwind_password = $3 "
        "where id = (select event_id from node where id = $4)",
        "https://mdm.example.com",
        "user",
        "pass",
        event_node.id,
    )

    active_ids = await terminal_service._fetch_mdm_event_node_ids(conn=db_connection)
    assert event_node.id in active_ids

    await db_connection.execute("update node set read_only = true where id = $1", event_node.id)

    read_only_ids = await terminal_service._fetch_mdm_event_node_ids(conn=db_connection)
    assert event_node.id not in read_only_ids


@pytest.mark.asyncio
async def test_poll_mdm_for_event_updates_cache(terminal_service: TerminalService, event_node: Node):
    devices = [_sample_device("device-1"), _sample_device("device-2")]

    async def get_location(device_id: str) -> DeviceLocation:
        if device_id == "device-2":
            raise RuntimeError("No network location update found for device")
        return DeviceLocation(latitude=48.1, longitude=11.1, last_update=None)

    mock_provider = AsyncMock()
    mock_provider.list_devices.return_value = devices
    mock_provider.get_device_location.side_effect = get_location

    with (
        patch(
            "stustapay.core.service.terminal.fetch_restricted_event_settings_for_node",
            new=AsyncMock(
                return_value=type(
                    "Settings",
                    (),
                    {
                        "headwind_enabled": True,
                        "headwind_url": "https://mdm.example.com",
                        "headwind_username": "user",
                        "headwind_password": "pass",
                    },
                )()
            ),
        ),
        patch("stustapay.core.service.terminal._create_mdm_provider", return_value=mock_provider),
    ):
        await terminal_service._poll_mdm_for_event(conn=AsyncMock(), event_node_id=event_node.id)

    snapshot = terminal_service.mdm_cache.get_snapshot(event_node.id)
    assert snapshot is not None
    assert set(snapshot.devices) == {"device-1", "device-2"}
    assert set(snapshot.locations) == {"device-1"}
    assert snapshot.last_error is None
    assert mock_provider.get_device_location.await_count == 2


@pytest.mark.asyncio
async def test_list_mdm_devices_with_mappings_uses_cache(
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    await db_connection.execute(
        "update event set headwind_enabled = true, headwind_url = $1, headwind_username = $2, headwind_password = $3 "
        "where id = (select event_id from node where id = $4)",
        "https://mdm.example.com",
        "user",
        "pass",
        event_node.id,
    )

    await terminal_service.mdm_cache.update_devices(
        event_node.id,
        devices={"device-1": _sample_device("device-1")},
    )

    devices = await terminal_service.list_mdm_devices_with_mappings(token=event_admin_token, node_id=event_node.id)
    assert len(devices) == 1
    assert devices[0].device.device_id == "device-1"
    assert devices[0].device.location_last_update is None
    assert devices[0].mapping is None


@pytest.mark.asyncio
async def test_list_mdm_devices_with_mappings_includes_location_last_update(
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    await db_connection.execute(
        "update event set headwind_enabled = true, headwind_url = $1, headwind_username = $2, headwind_password = $3 "
        "where id = (select event_id from node where id = $4)",
        "https://mdm.example.com",
        "user",
        "pass",
        event_node.id,
    )

    location_time = datetime(2024, 6, 1, 12, 0, 0, tzinfo=timezone.utc)
    await terminal_service.mdm_cache.update_devices(
        event_node.id,
        devices={"device-1": _sample_device("device-1")},
    )
    await terminal_service.mdm_cache.update_device_location(
        event_node.id,
        "device-1",
        DeviceLocation(latitude=48.1, longitude=11.1, last_update=location_time),
    )

    devices = await terminal_service.list_mdm_devices_with_mappings(token=event_admin_token, node_id=event_node.id)
    assert len(devices) == 1
    assert devices[0].device.location_last_update == location_time


@pytest.mark.asyncio
async def test_list_mdm_devices_with_mappings_returns_empty_before_first_poll(
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    await db_connection.execute(
        "update event set headwind_enabled = true, headwind_url = $1, headwind_username = $2, headwind_password = $3 "
        "where id = (select event_id from node where id = $4)",
        "https://mdm.example.com",
        "user",
        "pass",
        event_node.id,
    )

    devices = await terminal_service.list_mdm_devices_with_mappings(token=event_admin_token, node_id=event_node.id)
    assert devices == []


@pytest.mark.asyncio
async def test_get_mdm_device_location_reads_from_cache(
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    await db_connection.execute(
        "update event set headwind_enabled = true, headwind_url = $1, headwind_username = $2, headwind_password = $3 "
        "where id = (select event_id from node where id = $4)",
        "https://mdm.example.com",
        "user",
        "pass",
        event_node.id,
    )

    await terminal_service.mdm_cache.update_devices(
        event_node.id,
        devices={"device-1": _sample_device("device-1")},
    )
    await terminal_service.mdm_cache.update_device_location(
        event_node.id,
        "device-1",
        DeviceLocation(latitude=48.2, longitude=11.3, last_update=None),
    )

    location = await terminal_service.get_mdm_device_location(
        token=event_admin_token,
        node_id=event_node.id,
        mdm_device_id="device-1",
    )
    assert location.latitude == 48.2
    assert location.longitude == 11.3


@pytest.mark.asyncio
async def test_get_mdm_device_location_not_found_without_cache(
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    await db_connection.execute(
        "update event set headwind_enabled = true, headwind_url = $1, headwind_username = $2, headwind_password = $3 "
        "where id = (select event_id from node where id = $4)",
        "https://mdm.example.com",
        "user",
        "pass",
        event_node.id,
    )

    with pytest.raises(NotFound):
        await terminal_service.get_mdm_device_location(
            token=event_admin_token,
            node_id=event_node.id,
            mdm_device_id="device-1",
        )


@pytest.mark.asyncio
async def test_list_terminal_locations_uses_cache(
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
    db_connection: Connection,
):
    await db_connection.execute(
        "update event set headwind_enabled = true, headwind_url = $1, headwind_username = $2, headwind_password = $3 "
        "where id = (select event_id from node where id = $4)",
        "https://mdm.example.com",
        "user",
        "pass",
        event_node.id,
    )

    terminal = await terminal_service.create_terminal(
        token=event_admin_token,
        node_id=event_node.id,
        terminal=NewTerminal(name="Mapped Terminal", description=""),
    )
    await terminal_service.change_mdm_device_to_terminal_mapping(
        token=event_admin_token,
        node_id=event_node.id,
        mdm_device_id="device-1",
        terminal_id=terminal.id,
    )

    await terminal_service.mdm_cache.update_devices(
        event_node.id,
        devices={"device-1": _sample_device("device-1")},
    )
    await terminal_service.mdm_cache.update_device_location(
        event_node.id,
        "device-1",
        DeviceLocation(latitude=48.5, longitude=11.7, last_update=None),
    )

    locations = await terminal_service.list_terminal_locations(token=event_admin_token, node_id=event_node.id)
    assert len(locations) == 1
    assert locations[0].terminal_id == terminal.id
    assert locations[0].mdm_device_id == "device-1"
    assert locations[0].latitude == 48.5
    assert locations[0].longitude == 11.7


@pytest.mark.asyncio
async def test_mdm_endpoints_require_configuration(
    terminal_service: TerminalService,
    event_admin_token: str,
    event_node: Node,
):
    with pytest.raises(InvalidArgument):
        await terminal_service.list_mdm_devices_with_mappings(token=event_admin_token, node_id=event_node.id)

    with pytest.raises(InvalidArgument):
        await terminal_service.get_mdm_device_location(
            token=event_admin_token,
            node_id=event_node.id,
            mdm_device_id="device-1",
        )

    with pytest.raises(InvalidArgument):
        await terminal_service.list_terminal_locations(token=event_admin_token, node_id=event_node.id)
