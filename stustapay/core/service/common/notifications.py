import asyncio
from typing import Callable


class Subscription:
    def __init__(self, on_unsubscribe: Callable[["Subscription"], None]):
        self.queue: asyncio.Queue = asyncio.Queue()
        self._on_unsubscribe = on_unsubscribe

    def unsubscribe(self):
        self._on_unsubscribe(self)
