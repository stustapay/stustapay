import abc
import enum
from dataclasses import dataclass
from datetime import datetime


class DeviceStatus(enum.Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    UNKNOWN = "unknown"


@dataclass
class DeviceInfo:
    device_id: str
    serial: str | None
    imei: str | None
    description: str | None
    last_update: datetime | None
    ip_address: str | None
    model: str | None
    status: DeviceStatus


@dataclass
class DeviceLocation:
    latitude: float
    longitude: float
    last_update: datetime | None


class MdmProvider(abc.ABC):
    @abc.abstractmethod
    async def list_devices(self) -> list[DeviceInfo]:
        """Get the info of a device by its ID."""

    @abc.abstractmethod
    async def get_device_location(self, device_id: str) -> DeviceLocation:
        """Get the location of a device by its ID."""
