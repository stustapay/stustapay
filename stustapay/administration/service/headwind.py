"""
Utilities for communicating with the Headwind MDM REST API.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

import aiohttp
from pydantic import BaseModel, ConfigDict, Field
from sftkit.error import ServiceException

from stustapay.core.config import Config, HeadwindConfig

logger = logging.getLogger(__name__)

# Module-level cache for Headwind JWT token when using login/password_md5.
# This is shared across HeadwindClient instances so we don't re-login on every request.
_JWT_TOKEN: str | None = None


def _safe_json_keys(payload: Any) -> list[str]:
    """
    Return sorted top-level keys for logging without leaking values.
    """
    if isinstance(payload, dict):
        return sorted(str(key) for key in payload.keys())
    return []


def _redacted_http_body_preview(text: str, *, max_len: int = 256) -> str:
    """
    Truncate and sanitize HTTP body text for logs (no full tokens or error payloads).
    """
    cleaned = "".join(ch if ch.isprintable() and ch not in "\r\n\t" else " " for ch in text)
    cleaned = " ".join(cleaned.split())
    if len(cleaned) <= max_len:
        preview = cleaned
    else:
        preview = f"{cleaned[:max_len]}…"
    return f"len={len(text)} preview={preview!r}"


class HeadwindError(ServiceException):
    """Raised when the Headwind API returns an error."""

    id = "HeadwindError"

    def __init__(self, msg: str, *, status: int | None = None):
        self.msg = msg
        self.status = status

    def __str__(self) -> str:
        return self.msg


class HeadwindDevice(BaseModel):
    """Subset of the Headwind MDM device attributes needed by the admin UI."""

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    id: int | str
    device_number: str | None = Field(default=None, alias="deviceNumber")
    serial: str | None = Field(default=None, alias="serial")
    imei: str | None = Field(default=None, alias="imei")
    description: str | None = None
    configuration_name: str | None = Field(default=None, alias="configurationName")
    last_update: int | str | None = Field(default=None, alias="lastUpdate")
    last_ip: str | None = Field(default=None, alias="lastIp")
    model: str | None = None
    manufacturer: str | None = None


class HeadwindManagedConfigPayload(BaseModel):
    terminal_name: str
    wifi_ssid: str | None = None
    wifi_passphrase: str | None = None


def build_headwind_custom3(
    *,
    terminal_name: str,
    wifi_ssid: str | None = None,
    wifi_passphrase: str | None = None,
) -> str:
    if not wifi_ssid or not wifi_passphrase:
        return terminal_name

    payload = HeadwindManagedConfigPayload(
        terminal_name=terminal_name,
        wifi_ssid=wifi_ssid,
        wifi_passphrase=wifi_passphrase,
    )
    return payload.model_dump_json(exclude_none=True)


class HeadwindClient:
    """
    Minimal async client around the Headwind REST API.

    The client is intentionally lightweight so we can call it from request handlers
    without keeping a long-lived http session open.
    """

    def __init__(self, config: HeadwindConfig):
        self._config = config

    @property
    def enabled(self) -> bool:
        return self._config.enabled

    def _raise_if_disabled(self):
        if not self._config.enabled:
            raise HeadwindError("Headwind integration is disabled in the configuration")

    async def _ensure_jwt_token(self) -> str:
        """
        Ensure that a JWT token is available. If cached token exists, return it.
        Otherwise, perform login to obtain a new token.
        """
        if _JWT_TOKEN:
            return _JWT_TOKEN

        await self._perform_login()
        if not _JWT_TOKEN:
            raise HeadwindError("Headwind JWT login did not return a token")
        return _JWT_TOKEN

    async def _perform_login(self) -> None:
        """
        Perform a JWT login against /rest/public/jwt/login to obtain an access token.
        """
        login = self._config.login
        password_md5 = self._config.password_md5

        url = self._build_url("/rest/public/jwt/login")
        payload = {
            "login": login,
            "password": password_md5,
        }

        timeout = aiohttp.ClientTimeout(total=self._config.request_timeout_seconds)
        try:
            async with aiohttp.ClientSession(trust_env=True, timeout=timeout) as session:
                async with session.post(url, json=payload, headers={"Accept": "application/json"}) as response:
                    text = await response.text()

                    if not response.ok:
                        logger.error(
                            "Headwind JWT login error status=%s url=%s response_len=%s",
                            response.status,
                            url,
                            len(text),
                        )
                        raise HeadwindError(
                            f"Headwind JWT login returned HTTP {response.status}",
                            status=response.status,
                        )
                    if not text:
                        raise HeadwindError("Headwind JWT login returned empty response")
                    token: str | None = None
                    try:
                        data = json.loads(text)
                    except json.JSONDecodeError:
                        data = None

                    if isinstance(data, dict):
                        # Try common fields first, including id_token used by Headwind
                        token = data.get("token") or data.get("jwt") or data.get("id_token")

                        # Try nested "data" object
                        if token is None and isinstance(data.get("data"), dict):
                            nested = data["data"]
                            token = nested.get("token") or nested.get("jwt") or nested.get("id_token")
                            if token is None:
                                # Fallback: first string value in nested dict
                                for value in nested.values():
                                    if isinstance(value, str) and value:
                                        token = value
                                        break

                        # Final fallback: first string value anywhere at top level
                        if token is None:
                            for value in data.values():
                                if isinstance(value, str) and value:
                                    token = value
                                    break

                    # If JSON parsing failed or no token was found in parsed JSON,
                    # do a simple substring extraction for "id_token":"...".
                    if not token and '"id_token"' in text:
                        try:
                            # Very simple and robust extraction: find the substring after "id_token":" and
                            # take characters up to the next double quote.
                            prefix = '"id_token":"'
                            start = text.index(prefix) + len(prefix)
                            end = text.index('"', start)
                            candidate = text[start:end]
                            if candidate:
                                token = candidate
                        except ValueError:
                            # If this naive extraction fails, we'll fall through and raise below.
                            pass
                    if not token:
                        logger.error(
                            "Headwind JWT login response did not contain a token; response_type=%s keys=%s",
                            type(data).__name__,
                            _safe_json_keys(data),
                        )
                        raise HeadwindError(
                            "Headwind JWT login response did not contain a token"
                        )
                    globals()["_JWT_TOKEN"] = token
                    logger.info("Headwind JWT login succeeded")
        except asyncio.TimeoutError as exc:
            logger.error("Headwind JWT login to %s timed out: %s", url, exc)
            raise HeadwindError("Headwind JWT login request timed out") from exc
        except aiohttp.ClientError as exc:
            logger.error("Headwind JWT login client error for %s: %s", url, exc)
            raise HeadwindError("Headwind JWT login client error") from exc

    def _build_url(self, path: str) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        base = self._config.base_url.rstrip("/")
        suffix = path if path.startswith("/") else f"/{path}"
        return f"{base}{suffix}"

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json_payload: Any | None = None,
        _retry_on_unauthorized: bool = True,
    ) -> Any:
        self._raise_if_disabled()

        url = self._build_url(path)

        # Obtain JWT token (will use cached token if available)
        auth_token = await self._ensure_jwt_token()

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {auth_token}",
        }

        timeout = aiohttp.ClientTimeout(total=self._config.request_timeout_seconds)
        try:
            async with aiohttp.ClientSession(
                trust_env=True,
                timeout=timeout,
            ) as session:
                http_method = method.lower()
                requester = getattr(session, http_method, None)
                if requester is None:
                    raise HeadwindError(f"Unsupported HTTP method {method}")

                async with requester(url, params=params, json=json_payload, headers=headers) as response:
                    text = await response.text()

                    # If the JWT token is no longer valid, try to refresh once.
                    # Some Headwind setups return 401, others 403 for invalid/expired tokens.
                    if response.status in (401, 403) and _retry_on_unauthorized:
                        logger.info(
                            "Headwind API returned %s, refreshing JWT token and retrying request",
                            response.status,
                        )
                        # Clear cached token and force a re-login
                        # (module-level cache shared across HeadwindClient instances)
                        globals()["_JWT_TOKEN"] = None
                        await self._perform_login()
                        return await self._request(
                            method,
                            path,
                            params=params,
                            json_payload=json_payload,
                            _retry_on_unauthorized=False,
                        )

                    if not response.ok:
                        logger.error(
                            "Headwind API error status=%s url=%s body=%s",
                            response.status,
                            url,
                            _redacted_http_body_preview(text),
                        )
                        raise HeadwindError(
                            f"Headwind API returned HTTP {response.status}",
                            status=response.status,
                        )
                    if not text:
                        return None
                    try:
                        return json.loads(text)
                    except json.JSONDecodeError as exc:
                        logger.error(
                            "Headwind API returned non-JSON response: %s",
                            _redacted_http_body_preview(text),
                        )
                        raise HeadwindError("Headwind API returned a non-JSON payload") from exc
        except asyncio.TimeoutError as exc:
            logger.error("Headwind API request to %s timed out: %s", url, exc)
            raise HeadwindError("Headwind API request timed out") from exc
        except aiohttp.ClientError as exc:
            logger.error("Headwind API client error for %s: %s", url, exc)
            raise HeadwindError("Headwind API client error") from exc

    async def list_devices(
        self,
        *,
        page: int = 0,
        page_size: int = 200,
        search: str | None = None,
    ) -> list[HeadwindDevice]:
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

        method = self._config.device_search_method.upper()
        if method not in {"GET", "POST"}:
            raise HeadwindError(f"Unsupported device search method {method}")

        response = await self._request(
            method,
            self._config.device_search_path,
            params=payload if method == "GET" else None,
            json_payload=payload if method == "POST" else None,
        )

        devices = self._extract_device_list(response)
        return [HeadwindDevice.model_validate(device) for device in devices]

    async def get_device_by_id(self, device_id: int | str) -> dict[str, Any] | None:
        """
        Search for a device by ID using the search endpoint.
        Returns the full device object if found, None otherwise.
        """
        # Convert to int if it's a string that looks like a number
        try:
            numeric_id = int(device_id)
        except (ValueError, TypeError):
            numeric_id = device_id
        
        # Search for the device using the search endpoint
        response = await self._request(
            "POST",
            self._config.device_search_path,
            json_payload={
                "pageSize": 1000,
                "pageNum": 1,
            },
        )
        
        devices = self._extract_device_list(response)
        
        # Find the device with matching ID
        for device in devices:
            device_id_value = device.get("id")
            try:
                if int(device_id_value) == int(numeric_id):
                    return device
            except (ValueError, TypeError):
                if str(device_id_value) == str(numeric_id):
                    return device
        
        return None

    async def update_device_custom_attributes(
        self,
        *,
        device_id: int | str,
        custom1: str | None = None,
        custom2: str | None = None,
        custom3: str | None = None,
    ) -> Any:
        """
        Update custom attributes (CUSTOM1, CUSTOM2, CUSTOM3) for a device.
        
        These custom attributes can be used as placeholders in application settings
        configured in Headwind web UI (e.g., using %CUSTOM1%, %CUSTOM2%).
        
        This method fetches the full device object first, then updates only the custom
        attributes, as Headwind MDM requires the complete device object for updates.
        
        Args:
            device_id: The device ID (will be converted to int if possible)
            custom1: Value for CUSTOM1 placeholder
            custom2: Value for CUSTOM2 placeholder
            custom3: Value for CUSTOM3 placeholder
        """
        
        # Convert to int if it's a string that looks like a number
        try:
            numeric_id = int(device_id)
        except (ValueError, TypeError):
            numeric_id = device_id
        
        # Fetch the full device object
        device = await self.get_device_by_id(numeric_id)
        if device is None:
            raise HeadwindError(f"Device with ID {numeric_id} not found")
        
        # Update only the custom attributes
        if custom1 is not None:
            device["custom1"] = custom1
        if custom2 is not None:
            device["custom2"] = custom2
        if custom3 is not None:
            device["custom3"] = custom3
        
        # Ensure ID is an integer
        device["id"] = numeric_id
        
        # Convert 'info' field to JSON string if it's an object
        # Headwind expects info as a JSON-encoded string, not an object
        if "info" in device and isinstance(device["info"], dict):
            device["info"] = json.dumps(device["info"])
        
        return await self._request(
            "PUT",
            "/rest/private/devices",
            json_payload=device,
        )

    @staticmethod
    def _extract_device_list(response: Any) -> list[dict[str, Any]]:
        if response is None:
            return []
        if isinstance(response, list):
            return response
        if isinstance(response, dict):
            # Try common top-level keys for direct lists
            for key in ("content", "items", "rows", "results", "list"):
                value = response.get(key)
                if isinstance(value, list):
                    return value
            
            # Headwind MDM specific: nested structure data.devices.items
            data = response.get("data")
            if isinstance(data, dict):
                devices = data.get("devices")
                if isinstance(devices, dict):
                    items = devices.get("items")
                    if isinstance(items, list):
                        return items
                # Also try data directly (in case structure varies)
                if isinstance(data, list):
                    return data
            
            # Try devices at top level
            devices = response.get("devices")
            if isinstance(devices, dict):
                items = devices.get("items")
                if isinstance(items, list):
                    return items
            if isinstance(devices, list):
                return devices
        
        raise HeadwindError("Headwind API returned an unexpected device response format")


def get_headwind_client(config: Config) -> HeadwindClient:
    """
    Convenience helper for dependency injection within FastAPI routers.
    """

    return HeadwindClient(config.headwind)
