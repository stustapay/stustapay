import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone

from stustapay.mdm.mdm_provider import DeviceInfo, DeviceLocation


@dataclass
class MdmEventSnapshot:
    devices: dict[str, DeviceInfo]
    locations: dict[str, DeviceLocation]
    devices_updated_at: datetime | None
    last_error: str | None = None


class MdmCache:
    """Process-local cache of MDM device and location snapshots keyed by event node id."""

    def __init__(self):
        self._snapshots: dict[int, MdmEventSnapshot] = {}
        self._lock = asyncio.Lock()

    async def update_devices(
        self,
        event_node_id: int,
        *,
        devices: dict[str, DeviceInfo],
        last_error: str | None = None,
    ) -> None:
        async with self._lock:
            existing = self._snapshots.get(event_node_id)
            device_ids = set(devices.keys())
            locations = (
                {device_id: location for device_id, location in existing.locations.items() if device_id in device_ids}
                if existing is not None
                else {}
            )
            self._snapshots[event_node_id] = MdmEventSnapshot(
                devices=devices,
                locations=locations,
                devices_updated_at=datetime.now(timezone.utc),
                last_error=last_error,
            )

    async def update_device_location(
        self,
        event_node_id: int,
        device_id: str,
        location: DeviceLocation,
    ) -> None:
        async with self._lock:
            existing = self._snapshots.get(event_node_id)
            if existing is None:
                existing = MdmEventSnapshot(devices={}, locations={}, devices_updated_at=None)
            locations = dict(existing.locations)
            locations[device_id] = location
            self._snapshots[event_node_id] = MdmEventSnapshot(
                devices=existing.devices,
                locations=locations,
                devices_updated_at=existing.devices_updated_at,
                last_error=existing.last_error,
            )

    async def set_last_error(self, event_node_id: int, error: str) -> None:
        async with self._lock:
            existing = self._snapshots.get(event_node_id)
            if existing is None:
                return
            self._snapshots[event_node_id] = MdmEventSnapshot(
                devices=existing.devices,
                locations=existing.locations,
                devices_updated_at=existing.devices_updated_at,
                last_error=error,
            )

    def get_snapshot(self, event_node_id: int) -> MdmEventSnapshot | None:
        return self._snapshots.get(event_node_id)
