import asyncio
import hashlib
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

import aiohttp
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

from stustapay.core.service.common.error import ServiceException
from stustapay.mdm.mdm_provider import DeviceInfo, DeviceLocation, DeviceStatus, MdmProvider

logger = logging.getLogger(__name__)

HEADWIND_AUTH_ENDPOINT = "/rest/public/jwt/login"
HEADWIND_DEVICE_LOG_ENDPOINT = "/rest/plugins/devicelog/log/private/search"
HEADWIND_DEVICE_INFO_ENDPOINT = "/rest/public/devices"
HEADWIND_LOCATION_LOG_MESSAGE_PREFIX = "Network location update:"
# Headwind wraps messageFilter with % wildcards server-side and matches via ILIKE.
HEADWIND_LOCATION_LOG_MESSAGE_FILTER = HEADWIND_LOCATION_LOG_MESSAGE_PREFIX
HEADWIND_LOCATION_LOG_PATTERN = re.compile(r"Network location update: lat=(?P<lat>[\d\.]+), lon=(?P<lon>[\d\.]+)")
HEADWIND_DEFAULT_LOG_PAGE_SIZE = 1000


class HeadwindError(ServiceException):
    id = "HeadwindError"

    def __init__(self, msg: str):
        self.msg = msg


class _HeadwindLoginResponse(BaseModel):
    id_token: str


def _validate_unix_timestamp(value: int | str | None) -> datetime | None:
    if value is None:
        return value
    if isinstance(value, str) and value.isdigit():
        value = int(value)
    if isinstance(value, (int, float)):
        num_value: float | int = value
        if value > 1_000_000_000_000:
            num_value /= 1000
        return datetime.fromtimestamp(num_value)
    raise ValidationError("Invalid Unix timestamp")


def _parse_location_log(log: "HeadwindDeviceLog") -> DeviceLocation | None:
    match = HEADWIND_LOCATION_LOG_PATTERN.match(log.message)
    if match is None:
        return None

    return DeviceLocation(
        latitude=float(match.group("lat")),
        longitude=float(match.group("lon")),
        last_update=log.create_time,
    )


class HeadwindDeviceLog(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="allow")

    application_id: int | None = Field(default=None, alias="applicationId")
    application_pkg: str | None = Field(default=None, alias="applicationPkg")
    common: bool | None = Field(default=None, alias="common")
    create_time: datetime = Field(alias="createTime")
    customer_id: int | None = Field(default=None, alias="customerId")
    device_id: int | None = Field(default=None, alias="deviceId")
    device_number: str | None = Field(default=None, alias="deviceNumber")
    id: int | None = Field(default=None, alias="id")
    identifier: str | None = Field(default=None, alias="identifier")
    ip_address: str | None = Field(default=None, alias="ipAddress")
    message: str = Field(alias="message")
    severity: str | None = Field(default=None, alias="severity")

    @field_validator("create_time", mode="before")
    @classmethod
    def _normalize_create_time(cls, value):
        return _validate_unix_timestamp(value)


class HeadwindDeviceInfo(BaseModel):
    imei: str | None = Field(default=None, alias="imei")
    model: str | None = None
    battery_level: int | None = Field(default=None, alias="batteryLevel")


class HeadwindDevice(BaseModel):
    """Subset of the Headwind MDM device attributes needed by the admin UI."""

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    id: int
    info: HeadwindDeviceInfo
    number: str = Field(alias="number")
    serial: str | None = Field(default=None, alias="serial")
    description: str | None = None
    status_code: str | None = Field(default=None, alias="statusCode")
    last_update: datetime | None = Field(default=None, alias="lastUpdate")
    public_ip: str | None = Field(default=None, alias="publicIp")

    @field_validator("last_update", mode="before")
    @classmethod
    def _normalize_last_update(cls, value):
        return _validate_unix_timestamp(value)


class HeadwindApi:
    def __init__(self, url: str, username: str, password: str):
        self.url = url.rstrip("/")
        self.username = username
        self.password = password
        self.token: str | None = None
        self.token_payload: dict[str, Any] | None = None

    def _build_url(self, endpoint: str) -> str:
        endpoint = endpoint.lstrip("/")
        return f"{self.url}/{endpoint}"

    def _decode_jwt(self, token: str) -> dict[str, Any]:
        try:
            return jwt.get_unverified_claims(token)
        except JWTError as exc:
            raise HeadwindError("Invalid JWT token payload from Headwind authentication") from exc

    def _is_token_expired(self) -> bool:
        if self.token is None or self.token_payload is None:
            return True
        exp = self.token_payload.get("exp")
        if exp is None:
            return False
        try:
            expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
        except Exception as exc:
            raise HeadwindError("Invalid token expiry value in Headwind JWT") from exc
        return datetime.now(timezone.utc) >= expires_at - timedelta(seconds=10)

    async def ensure_authenticated(self):
        if self.token is None or self._is_token_expired():
            await self.authenticate()

    def _get_headers(self) -> dict[str, str]:
        if self.token is None:
            raise HeadwindError("Not authenticated with Headwind MDM")
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}",
        }

    async def authenticate(self):
        url = self._build_url(HEADWIND_AUTH_ENDPOINT)
        password_hash = hashlib.md5(self.password.encode()).hexdigest().upper()

        async with aiohttp.ClientSession(trust_env=True) as session:
            try:
                async with session.post(
                    url,
                    json={"login": self.username, "password": password_hash},
                    headers={"Content-Type": "application/json"},
                    timeout=10,
                ) as response:
                    if response.status != 200:
                        text = await response.text()
                        raise HeadwindError(f"Headwind authentication failed: HTTP {response.status}: {text}")
                    body = await response.json(content_type=None)
                    validated = _HeadwindLoginResponse.model_validate(body)
                    self.token = validated.id_token
                    self.token_payload = self._decode_jwt(self.token)
            except asyncio.TimeoutError as exc:
                raise HeadwindError("Headwind authentication timed out") from exc
            except HeadwindError:
                raise
            except Exception as exc:
                raise HeadwindError(f"Headwind authentication failed: {exc}") from exc

    async def _get(self, endpoint: str, query: dict[str, Any] | None = None) -> Any:
        await self.ensure_authenticated()
        url = self._build_url(endpoint)
        async with aiohttp.ClientSession(trust_env=True, headers=self._get_headers()) as session:
            try:
                async with session.get(url, params=query, timeout=10) as response:
                    if response.status == 404:
                        return None
                    if not response.ok:
                        text = await response.text()
                        raise HeadwindError(f"Headwind API request failed: HTTP {response.status}: {text}")
                    return await response.json(content_type=None)
            except asyncio.TimeoutError as exc:
                raise HeadwindError("Headwind API request timed out") from exc
            except HeadwindError:
                raise
            except Exception as exc:
                raise HeadwindError(f"Unexpected Headwind API error: {exc}") from exc

    async def _post(self, endpoint: str, payload: dict[str, Any], timeout: int = 10) -> Any:
        await self.ensure_authenticated()
        url = self._build_url(endpoint)
        async with aiohttp.ClientSession(trust_env=True, headers=self._get_headers()) as session:
            try:
                async with session.post(url, json=payload, timeout=timeout) as response:
                    if not response.ok:
                        text = await response.text()
                        raise HeadwindError(f"Headwind API request failed: HTTP {response.status}: {text}")
                    return await response.json(content_type=None)
            except asyncio.TimeoutError as exc:
                raise HeadwindError("Headwind API request timed out") from exc
            except HeadwindError:
                raise
            except Exception as exc:
                raise HeadwindError(f"Unexpected Headwind API error: {exc}") from exc

    def _parse_log_search_response(self, response: Any) -> tuple[list[HeadwindDeviceLog], int]:
        if not isinstance(response, dict) or "data" not in response or "items" not in response["data"]:
            raise HeadwindError("Invalid response from Headwind device log endpoint")

        data = response["data"]
        logs = [HeadwindDeviceLog.model_validate(item) for item in data["items"]]
        total_items = data.get("totalItemsCount", len(logs))
        return logs, total_items

    async def search_device_logs(
        self,
        *,
        device_id: str | None = None,
        message_filter: str | None = None,
        page_num: int = 1,
        page_size: int = HEADWIND_DEFAULT_LOG_PAGE_SIZE,
    ) -> tuple[list[HeadwindDeviceLog], int]:
        payload: dict[str, Any] = {
            "pageSize": page_size,
            "pageNum": page_num,
            "sortValue": "createTime",
        }
        if device_id:
            payload["deviceFilter"] = device_id
        if message_filter:
            payload["messageFilter"] = message_filter

        response = await self._post(HEADWIND_DEVICE_LOG_ENDPOINT, payload, timeout=30)
        return self._parse_log_search_response(response)

    async def get_device_location(self, device_id: str) -> DeviceLocation:
        logs, _ = await self.search_device_logs(
            device_id=device_id,
            message_filter=HEADWIND_LOCATION_LOG_MESSAGE_FILTER,
            page_num=1,
            page_size=1,
        )
        if not logs:
            raise HeadwindError("No network location update found for device")

        location = _parse_location_log(logs[0])
        if location is None:
            raise HeadwindError(f"Failed to parse location from Headwind log message: {logs[0].message}")

        return location

    async def list_devices(
        self,
        *,
        page: int = 0,
        page_size: int = 200,
        search: str | None = None,
    ) -> list[DeviceInfo]:
        """
        Fetches a single page of devices from Headwind MDM.

        Headwind's API uses 1-based paging, so we convert from 0-based inputs.
        """

        page_num = max(page + 1, 1)
        payload: dict[str, Any] = {
            "pageSize": page_size,
            "pageNum": page_num,
        }
        if search:
            payload["search"] = search

        response = await self._post("/rest/private/devices/search", payload=payload)

        devices = [
            HeadwindDevice.model_validate(item) for item in response.get("data", {}).get("devices", {}).get("items", [])
        ]

        return [
            DeviceInfo(
                device_id=device.number,
                serial=device.serial,
                imei=device.info.imei,
                description=device.description,
                last_update=device.last_update,
                ip_address=device.public_ip,
                model=device.info.model,
                status=DeviceStatus.ONLINE
                if device.status_code == "green"
                else DeviceStatus.OFFLINE
                if device.status_code == "red"
                else DeviceStatus.UNKNOWN,
            )
            for device in devices
        ]


class HeadwindProvider(MdmProvider):
    def __init__(self, url: str, username: str, password: str):
        self.url = url
        self.username = username
        self.password = password
        self._api: HeadwindApi | None = None

    def _get_api(self) -> HeadwindApi:
        if self._api is None:
            self._api = HeadwindApi(
                url=self.url,
                username=self.username,
                password=self.password,
            )
        return self._api

    async def list_devices(self) -> list[DeviceInfo]:
        api = self._get_api()
        return await api.list_devices(page=0, page_size=1000, search=None)

    async def get_device_location(self, device_id: str) -> DeviceLocation:
        api = self._get_api()
        return await api.get_device_location(device_id)
