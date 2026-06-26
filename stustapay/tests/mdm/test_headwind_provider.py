from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from stustapay.mdm.headwind_provider import HeadwindApi, HeadwindDeviceLog, HeadwindError, _parse_location_log


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
async def test_get_device_location_fetches_latest_log():
    api = HeadwindApi(url="https://example.com", username="user", password="pass")
    api.search_device_logs = AsyncMock(
        return_value=(
            [
                HeadwindDeviceLog.model_validate(
                    {
                        "createTime": datetime(2024, 1, 1, tzinfo=timezone.utc).timestamp() * 1000,
                        "message": "Network location update: lat=48.1, lon=11.1",
                    }
                )
            ],
            1,
        )
    )

    location = await api.get_device_location("device-1")

    assert location.latitude == 48.1
    assert location.longitude == 11.1
    api.search_device_logs.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_device_location_raises_when_no_log_found():
    api = HeadwindApi(url="https://example.com", username="user", password="pass")
    api.search_device_logs = AsyncMock(return_value=([], 0))

    with pytest.raises(HeadwindError, match="No network location update found"):
        await api.get_device_location("device-1")
