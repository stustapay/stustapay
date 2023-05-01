"""
database notification subscriber
"""

import asyncio
import inspect
import logging
from typing import Callable, Optional, Awaitable, Union, Type

import asyncpg


class DBHook:
    """
    Implements a database hook to subscribe to one specific pg_notify notification channel.
    """

    HOOK_TIMELIMIT = 5

    def __init__(
        self, connection: asyncpg.Connection, channel: str, event_handler: Callable[[Optional[str]], Awaitable[None]]
    ):
        """
        connection: open database connection
        channel: subcription channel of the database
        event_handler: async function which receives the payload of the database notification as argument
        """
        self.connection = connection
        self.channel = channel
        self.event_handler = event_handler
        assert inspect.iscoroutinefunction(event_handler)

        self.events: asyncio.Queue[Union[str, Type[StopIteration]]] = asyncio.Queue(maxsize=256)
        self.logger = logging.getLogger(__name__)

        self.hooks_active = False

    async def register(self):
        if self.hooks_active:
            return

        self.connection.add_termination_listener(self.terminate_callback)
        await self.connection.add_listener(self.channel, self.notification_callback)

        self.hooks_active = True

    async def deregister(self):
        if not self.hooks_active:
            return

        await self.connection.remove_listener(self.channel, self.notification_callback)
        self.connection.remove_termination_listener(self.terminate_callback)
        self.hooks_active = False

    def stop(self):
        # proper way of clearing asyncio queue
        for _ in range(self.events.qsize()):
            self.events.get_nowait()
            self.events.task_done()
        self.events.put_nowait(StopIteration)

    async def run(self):
        await self.register()

        # run the handler once to process pending data
        await self.event_handler(None)

        try:
            # handle events
            while True:
                event = await self.events.get()
                if event is StopIteration:
                    break

                ret = await asyncio.wait_for(self.event_handler(event), self.HOOK_TIMELIMIT)
                if ret == StopIteration:
                    break
        finally:
            await self.deregister()

    def notification_callback(self, connection: asyncpg.Connection, pid: int, channel: str, payload: str):
        """
        runs whenever we get a psql notification through pg_notify
        """
        assert connection == self.connection
        assert channel == self.channel
        del pid  # unused
        self.events.put_nowait(payload)

    def terminate_callback(self, connection: asyncpg.Connection):
        """
        runs when the psql connection is closed
        """
        assert connection is self.connection
        self.logger.info("psql connection closed")

        self.stop()
