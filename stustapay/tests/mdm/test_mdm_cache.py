import pytest

from stustapay.mdm.cache import MdmCache
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
        status=DeviceStatus.UNKNOWN,
    )


def _sample_location(latitude: float, longitude: float) -> DeviceLocation:
    return DeviceLocation(latitude=latitude, longitude=longitude, last_update=None)


@pytest.mark.asyncio
async def test_mdm_cache_update_devices_and_read():
    cache = MdmCache()
    devices = {"device-1": _sample_device("device-1")}

    await cache.update_devices(42, devices=devices)

    snapshot = cache.get_snapshot(42)
    assert snapshot is not None
    assert snapshot.devices == devices
    assert snapshot.locations == {}
    assert snapshot.devices_updated_at is not None
    assert snapshot.last_error is None


@pytest.mark.asyncio
async def test_mdm_cache_update_device_location_individually():
    cache = MdmCache()
    devices = {"device-1": _sample_device("device-1"), "device-2": _sample_device("device-2")}

    await cache.update_devices(42, devices=devices)
    await cache.update_device_location(42, "device-1", _sample_location(48.1, 11.1))
    await cache.update_device_location(42, "device-2", _sample_location(48.2, 11.2))

    snapshot = cache.get_snapshot(42)
    assert snapshot is not None
    assert snapshot.devices == devices
    assert snapshot.locations["device-1"].latitude == 48.1
    assert snapshot.locations["device-2"].longitude == 11.2


@pytest.mark.asyncio
async def test_mdm_cache_update_devices_prunes_stale_locations():
    cache = MdmCache()
    await cache.update_devices(42, devices={"device-1": _sample_device("device-1")})
    await cache.update_device_location(42, "device-1", _sample_location(48.1, 11.1))
    await cache.update_device_location(42, "device-2", _sample_location(48.2, 11.2))

    await cache.update_devices(42, devices={"device-1": _sample_device("device-1")})

    snapshot = cache.get_snapshot(42)
    assert snapshot is not None
    assert set(snapshot.locations) == {"device-1"}


@pytest.mark.asyncio
async def test_mdm_cache_set_last_error_preserves_data():
    cache = MdmCache()
    devices = {"device-1": _sample_device("device-1")}

    await cache.update_devices(42, devices=devices)
    await cache.update_device_location(42, "device-1", _sample_location(48.1, 11.1))
    snapshot_before = cache.get_snapshot(42)
    assert snapshot_before is not None

    await cache.set_last_error(42, "poll failed")

    snapshot_after = cache.get_snapshot(42)
    assert snapshot_after is not None
    assert snapshot_after.devices == devices
    assert snapshot_after.locations == snapshot_before.locations
    assert snapshot_after.devices_updated_at == snapshot_before.devices_updated_at
    assert snapshot_after.last_error == "poll failed"


@pytest.mark.asyncio
async def test_mdm_cache_set_last_error_without_snapshot_is_noop():
    cache = MdmCache()
    await cache.set_last_error(99, "poll failed")
    assert cache.get_snapshot(99) is None
