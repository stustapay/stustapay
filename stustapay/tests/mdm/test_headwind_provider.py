from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from stustapay.mdm.headwind_provider import HeadwindApi, HeadwindDeviceLog, HeadwindError, _parse_location_log
from stustapay.mdm.mdm_provider import DeviceLocation


def test_parse_location_log():
    log = HeadwindDeviceLog.model_validate(
        {
            "createTime": datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp() * 1000,
            "deviceNumber": "device-1",
            "message": "Network location update: lat=48.123, lon=11.456",
        }
    )

    location = _parse_location_log(log)

    assert location is not None
    assert location.latitude == 48.123
    assert location.longitude == 11.456


@pytest.mark.asyncio
async def test_list_device_locations_fetches_each_device():
    api = HeadwindApi(url="https://example.com", username="user", password="pass")

    async def get_location(device_id: str) -> DeviceLocation:
        if device_id == "device-2":
            raise HeadwindError("No network location update found for device")
        return DeviceLocation(latitude=48.1, longitude=11.1, last_update=None)

    api.get_device_location = AsyncMock(side_effect=get_location)

    locations = await api.list_device_locations({"device-1", "device-2", "device-3"})

    assert set(locations) == {"device-1", "device-3"}
    assert api.get_device_location.await_count == 3
