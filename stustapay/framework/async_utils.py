import asyncio
import threading
from functools import wraps
import traceback

from stustapay.framework.database import create_db_pool


def with_db_pool(func):
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        db_pool = await create_db_pool(self.config.database)
        try:
            return await func(self, *args, db_pool=db_pool, **kwargs)
        finally:
            await db_pool.close()

    return wrapper


class AsyncThread:
    def __init__(self, coroutine_callable):
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._run)
        self.callable = coroutine_callable

    def _run(self):
        async def runner():
            try:
                await self.callable()
            except:  # pylint: disable=bare-except
                pass
                traceback.print_exc()
            print("runner exited")

        asyncio.set_event_loop(self.loop)
        self.loop.create_task(runner())
        self.loop.run_forever()

    def run_coroutine(self, coro):
        self.loop.create_task(coro)

    def start(self):
        self.thread.start()

    def join(self):
        self.thread.join()

    def stop(self):
        for task in asyncio.all_tasks(self.loop):
            task.cancel()
        self.loop.stop()
