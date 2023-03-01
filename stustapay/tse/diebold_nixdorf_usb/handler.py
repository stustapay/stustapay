#!/usr/bin/env python

import asyncio
import aiohttp
import json
import logging
import typing

from ..handler import TSEHandler
from .config import DieboldNixdorfUSBTSEConfig

LOGGER = logging.getLogger(__name__)


class DieboldNixdorfUSBTSE(TSEHandler):
    def __init__(self, config: DieboldNixdorfUSBTSEConfig):
        self.websocket_url = config.diebold_nixdorf_usb_ws_url
        self.background_task: typing.Optional[asyncio.Task] = None
        self.request_id = 0
        self.pending_requests: dict[int, asyncio.Future[dict]] = {}

    async def start(self):
        self.background_task = asyncio.create_task(self.run())

    async def stop(self):
        # TODO cleanly cancel the background task
        await self.background_task

    async def run(self):
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(self.websocket_url) as ws:
                receive_task = asyncio.create_task(self.recieve_loop(ws))
                while True:
                    await self.request("PingPong", ws=ws)

    async def request(self, command: str, *, ws, timeout: float = 5, **kwargs) -> dict:
        request_id = self.request_id
        self.request_id += 1

        request = dict(Command=command, PingPong=request_id)
        request.update(kwargs)

        LOGGER.info(f"{self}: sending request {request}")
        await ws.send_str(f"\x02{json.dumps(kwargs)}\x03")
        future: asyncio.Future[dict] = asyncio.Future()
        self.pending_requests[request_id] = future
        try:
            # This code is incorrect, as it does not return the result of the future but rather two sets of awaitables
            # done, pending = await asyncio.wait()
            # response = await asyncio.wait(future, timeout=timeout)
            response = await future
            LOGGER.info(f"{self}: got response {response}")
            return response
        except asyncio.TimeoutError:
            error_message = f"{self}: timeout while waiting for response to {request}"
            LOGGER.error(error_message)
            raise asyncio.TimeoutError(error_message)

    async def recieve_loop(self, ws):
        """
        Receives and processes websocket messages.
        Messages that we receive from the websocket are expected to be responses to requests
        that we sent through the request() method.
        """
        async for msg in ws:
            msg: aiohttp.WSMessage
            if msg.type == aiohttp.WSMsgType.TEXT:
                msg.data: str
                if not msg.data or msg.data[0] != "\x02" or msg.data[-1] != "\x03":
                    LOGGER.error(f"{self}: Badly-formatted message: {msg}")
                    continue
                try:
                    data = json.loads(msg.data[1:-1])
                except json.decoder.JSONDecodeError:
                    LOGGER.error(f"{self}: Invalid JSON: {msg}")
                    continue
                if not isinstance(data, dict):
                    LOGGER.error(f"{self}: JSON data is not a dict: {msg}")
                    continue
                message_id = data.pop("PingPong")
                if not isinstance(message_id, int):
                    LOGGER.error(f"{self}: JSON data has no int PingPong field: {msg}")
                    continue
                future = self.pending_requests.pop(message_id)
                if future is None:
                    LOGGER.error(f"{self}: Response does not match any pending request: {msg}")
                    continue
                future.set_result(data)
            elif msg.type == aiohttp.WSMsgType.CLOSE:
                LOGGER.info(f"{self}: websocket connection has been closed: {msg}")
                # TODO recover?
            elif msg.type == aiohttp.WSMsgType.ERROR:
                LOGGER.error(f"{self}: websocket connection has errored: {msg}")
                # TODO recover?
            else:
                LOGGER.error(f"{self}: unexpected websocket message type: {msg}")

    async def send(self, ws):
        for i in range(100000):
            ping = {"Command": "PingPong"}
            await ws.send_str(f"\x02{json.dumps(ping)}\x03")
            print(i)
            await asyncio.sleep(0.0001)
        await ws.close()
