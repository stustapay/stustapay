import asyncio
import base64
import binascii
import contextlib
import json
import logging
import typing

import aiohttp
import pytz
from dateutil import parser

from stustapay.core.util import create_task_protected
from stustapay.tse.diebold_nixdorf_usb.config import DieboldNixdorfUSBTSEConfig
from stustapay.tse.handler import (
    TSEHandler,
    TSEMasterData,
    TSESignature,
    TSESignatureRequest,
)

LOGGER = logging.getLogger(__name__)


class RequestError(RuntimeError):
    def __init__(self, name: str, request: dict, response: dict):
        self.name = name
        try:
            self.code: typing.Optional[int] = int(response["Code"])
        except (KeyError, ValueError):
            self.code = None
        self.description = response.get("Description")
        super().__init__(f"{name!r}: request {request} failed: {self.description} (code {self.code})")


class DieboldNixdorfUSBTSE(TSEHandler):
    def __init__(self, name: str, config: DieboldNixdorfUSBTSEConfig):
        self.websocket_url = config.ws_url
        self.websocket_timeout = config.ws_timeout
        self.background_task: typing.Optional[asyncio.Task] = None
        self.request_id = 0
        self.pending_requests: dict[int, asyncio.Future[dict]] = {}
        self.password: str = config.password
        self.serial_number: str = config.serial_number
        self._stop = asyncio.Event()  # set this to request all tasks to stop
        self._ws: typing.Optional[aiohttp.ClientWebSocketResponse] = None
        self._name = name
        self._signature_algorithm: typing.Optional[str] = None
        self._log_time_format: typing.Optional[str] = None
        self._public_key: typing.Optional[str] = None  # base64
        self._certificate: typing.Optional[str] = None  # long string

    async def start(self) -> bool:
        start_result: asyncio.Future[bool] = asyncio.Future()
        self.background_task = create_task_protected(self.run(start_result), f"run_task {self}", self._stop.set)
        return await start_result

    async def stop(self):
        # TODO cleanly cancel the background task
        self._stop.set()
        await self.background_task

    async def get_device_data(self, name: str, *args, **kwargs) -> str:
        result = await self.request("GetDeviceData", Name=name, *args, **kwargs)
        return result["Value"]

    async def run(self, start_result: asyncio.Future[bool]):
        async with contextlib.AsyncExitStack() as stack:
            try:
                session = await stack.enter_async_context(
                    aiohttp.ClientSession(
                        timeout=aiohttp.ClientTimeout(total=self.websocket_timeout, connect=self.websocket_timeout)
                    )
                )

                try:
                    LOGGER.info(f"{self._name!r}: connecting to {self.websocket_url}")
                    self._ws = await stack.enter_async_context(session.ws_connect(self.websocket_url))
                except aiohttp.ClientError as exc:
                    LOGGER.error(f"{self._name!r}: Failed to connect to DN USB TSE: {exc}")
                    start_result.set_result(False)
                    return
                assert self._ws is not None

                receive_task = create_task_protected(self.receive_loop(), f"receive_loop_task {self}", self._stop.set)

                async def await_receive_task():
                    await receive_task

                stack.push_async_callback(await_receive_task)
                stack.push_async_callback(self._ws.close)

                await self.request("SetDefaultClientID", ClientID="DummyDefaultClientId")

                device_info = await self.request("GetDeviceInfo")
                if self.serial_number != device_info["DeviceInfo"]["SerialNumber"]:
                    raise RuntimeError(
                        f"wrong serial number: expected {self.serial_number}, but device has serial number {device_info['DeviceInfo']['SerialNumber']}"
                    )
                self._log_time_format = device_info["DeviceInfo"]["TimeFormat"]
                if self._log_time_format == "UnixTime":
                    self._log_time_format = "unixTime"  # ¯\_(ツ)_/¯

                device_status = await self.request("GetDeviceStatus")
                self._signature_algorithm = device_status["Parameters"]["SignatureAlgorithm"]
                self._public_key = await self.get_device_data("PublicKey", Format="Base64")
                self._certificate = await self.get_device_data("Certificates", Format="Base64")

                start_result.set_result(True)
            except:
                start_result.set_result(False)
                raise

            while not self._stop.is_set():
                await self.request("PingPong")
                try:
                    await asyncio.wait_for(self._stop.wait(), timeout=2)
                except asyncio.TimeoutError:
                    pass

    async def request(self, command: str, *, timeout: float = 5, **kwargs) -> dict:
        assert self._ws is not None

        request_id = self.request_id
        self.request_id += 1

        request = dict(Command=command, PingPong=request_id)
        request.update(kwargs)

        LOGGER.info(f"{self}: >> {request}")

        await self._ws.send_str(f"\x02{json.dumps(request)}\x03\n")
        future: asyncio.Future[dict] = asyncio.Future()
        self.pending_requests[request_id] = future
        try:
            response = await asyncio.wait_for(future, timeout=timeout)
            LOGGER.info(f"{self}: << {response}")
            command_back = response.pop("Command")
            if command_back != command:
                raise RuntimeError(f"{self}: wrong command returned while processing {request}: {response}")
            status = response.pop("Status")
            if status != "ok":
                raise RequestError(self._name, request, response)
            return response
        except asyncio.TimeoutError:
            error_message = f"{self}: timeout while waiting for response to {request}"
            LOGGER.error(error_message)
            raise asyncio.TimeoutError(error_message) from None

    async def request_with_password(self, *args, **kwargs):
        kwargs["Password"] = base64.b64encode(self.password.encode("utf-8")).decode("ascii")
        return await self.request(*args, **kwargs)

    async def receive_loop(self) -> None:
        """
        Receives and processes websocket messages.
        Messages that we receive from the websocket are expected to be responses to requests
        that we sent through the request() method.
        """
        assert self._ws is not None

        msg_queue = asyncio.Queue[typing.Optional[aiohttp.WSMessage]]()

        async def receive_internal():
            async for msg in self._ws:
                msg_queue.put_nowait(msg)

        async def wait_for_stop():
            await self._stop.wait()
            msg_queue.put_nowait(None)

        create_task_protected(receive_internal(), f"receive_internal {self}", self._stop.set)
        create_task_protected(wait_for_stop(), f"wait_for_stop {self}", self._stop.set)

        while True:
            msg = await msg_queue.get()
            if msg is None:
                break

            if msg.type != aiohttp.WSMsgType.TEXT:
                if msg.type == aiohttp.WSMsgType.CLOSED:
                    LOGGER.info(f"{self}: Websocket closed")
                    break
                msg_type = aiohttp.WSMsgType(msg.type).name
                raise TypeError(f"{self}: Unexpected WS message {msg_type!r}")
            msg_data: str = msg.data

            if not msg_data.startswith("\x02") or not msg_data.endswith("\x03\n"):
                LOGGER.error(f"{self}: Badly-formatted message: {msg!r}")
                continue
            try:
                data = json.loads(msg_data[1:-2])
            except json.decoder.JSONDecodeError:
                LOGGER.error(f"{self}: Invalid JSON: {msg!r}")
                continue
            if not isinstance(data, dict):
                LOGGER.error(f"{self}: JSON data is not a dict: {data!r}")
                continue
            message_id = data.pop("PingPong")
            if not isinstance(message_id, int):
                LOGGER.error(f"{self}: JSON data has no int PingPong field: {msg!r}")
                continue
            future = self.pending_requests.pop(message_id)
            if future is None:
                LOGGER.error(f"{self}: Response does not match any pending request: {msg!r}")
                continue
            future.set_result(data)

    async def register_client_id(self, client_id: str):
        await self.request_with_password("RegisterClientID", ClientID=client_id)

    async def deregister_client_id(self, client_id: str):
        await self.request_with_password("DeregisterClientID", ClientID=client_id)

    async def sign(self, request: TSESignatureRequest) -> TSESignature:
        LOGGER.info(f"{self}: signing {request}")
        start_result = await self.request_with_password("StartTransaction", ClientID=request.till_id)
        transaction_number = start_result["TransactionNumber"]
        finish_result = await self.request_with_password(
            "FinishTransaction",
            TransactionNumber=transaction_number,
            ClientID=request.till_id,
            Typ=request.process_type,
            Data=request.process_data,
        )
        return TSESignature(
            tse_transaction=transaction_number,
            tse_signaturenr=finish_result["SignatureCounter"],
            tse_start=parser.isoparse(start_result["LogTime"]).astimezone(pytz.utc).isoformat().split("+")[0]
            + ".000Z",  # convert to isoformat in UTC YYYY-mm-ddTHH:MM:ss.000Z
            tse_end=parser.isoparse(finish_result["LogTime"]).astimezone(pytz.utc).isoformat().split("+")[0] + ".000Z",
            tse_signature=base64.b64encode(binascii.unhexlify(finish_result["Signature"])).decode("ascii"),
        )

    def get_master_data(self) -> TSEMasterData:
        assert self._signature_algorithm is not None
        assert self._log_time_format is not None
        assert self._public_key is not None
        assert self._certificate is not None
        return TSEMasterData(
            tse_serial=self.serial_number,
            tse_hashalgo=self._signature_algorithm,
            tse_time_format=self._log_time_format,
            tse_public_key=self._public_key,
            tse_certificate=self._certificate,
            tse_process_data_encoding="UTF-8",
        )

    async def get_client_ids(self) -> list[str]:
        result = await self.request_with_password("GetDeviceStatus")
        try:
            result = result["ClientIDs"]
        except KeyError:
            raise RuntimeError(f"{self._name!r}: GetDeviceStatus did not return ClientIDs") from None
        if not isinstance(result, list) or any(not isinstance(x, str) for x in result):
            raise RuntimeError(f"{self}: GetDeviceStatus returned bad result: {result}")
        try:
            # hide the default dummy client id
            result.remove("DummyDefaultClientId")
        except ValueError:
            raise RuntimeError("TSE does not have 'DummyDefaultClientId' registered") from None
        clientid_to_ignore = set()
        for entry in result:
            if entry.startswith("DN TSEProduction"):
                clientid_to_ignore.add(entry)
        for entry in clientid_to_ignore:
            result.remove(entry)

        return result

    def is_stop_set(self):
        return self._stop.is_set()

    def __str__(self):
        return self._name
