"""
database notification subscriber
"""

import asyncio
import contextlib
import inspect
import logging
from typing import Awaitable, Callable, Optional, Type, Union

import asyncpg.exceptions


class DBHook:
    """
    Implements a database hook to subscribe to one specific pg_notify notification channel.
    """

    def __init__(
        self,
        pool: asyncpg.Pool,
        channel: str,
        event_handler: Callable[[Optional[str]], Awaitable[Optional[StopIteration]]],
        initial_run: bool = False,
        hook_timeout: int = 5,
    ):
        """
        connection: open database connection
        channel: subcription channel of the database
        event_handler: async function which receives the payload of the database notification as argument
        initial_run: true if we shall call the handler once after startup with None as argument.
        """
        self.db_pool = pool
        self.channel = channel
        self.event_handler = event_handler
        assert inspect.iscoroutinefunction(event_handler)
        self.initial_run = initial_run
        self.timelimit = hook_timeout

        self.events: asyncio.Queue[Union[str, Type[StopIteration]]] = asyncio.Queue(maxsize=2048)
        self.logger = logging.getLogger(__name__)

    @contextlib.asynccontextmanager
    async def acquire_conn(self):
        async with self.db_pool.acquire() as conn:
            await self._register(conn=conn)
            try:
                yield conn
            finally:
                await self._deregister(conn=conn)

    async def _register(self, conn: asyncpg.Connection):
        await conn.add_listener(self.channel, self.notification_callback)

    async def _deregister(self, conn: asyncpg.Connection):
        await conn.remove_listener(self.channel, self.notification_callback)

    def stop(self):
        # proper way of clearing asyncio queue
        for _ in range(self.events.qsize()):
            self.events.get_nowait()
            self.events.task_done()
        self.events.put_nowait(StopIteration)

    async def run(self):
        while True:
            try:
                async with self.acquire_conn():
                    if self.initial_run:
                        # run the handler once to process pending data
                        ret = await self.event_handler(None)
                        if ret is StopIteration:
                            return

                    # handle events
                    while True:
                        event = await self.events.get()
                        if event is StopIteration:
                            return

                        ret = await asyncio.wait_for(self.event_handler(event), self.timelimit)
                        if ret == StopIteration:
                            return
            except asyncio.exceptions.TimeoutError:
                self.logger.error("Timout occurred during DBHook.run")
            except (KeyboardInterrupt, SystemExit):
                return
            except Exception:
                import traceback

                self.logger.error(f"Error occurred during DBHook.run: {traceback.format_exc()}")
                await asyncio.sleep(1)

    def notification_callback(self, connection: asyncpg.Connection, pid: int, channel: str, payload: str):
        """
        runs whenever we get a psql notification through pg_notify
        """
        del connection, pid
        assert channel == self.channel
        self.events.put_nowait(payload)
