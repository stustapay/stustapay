# pylint: disable=attribute-defined-outside-init
import asyncio
import threading

from stustapay.core.service.common.dbhook import DBHook
from .common import BaseTestCase
from ..core.database import create_db_pool


class DBHookTest(BaseTestCase):
    async def test_hook(self) -> None:
        initial_run: bool = False
        received_payload: str = ""

        async def trigger(payload):
            nonlocal initial_run, received_payload
            # payload is none when the hook is run without a trigger first.
            if payload is None:
                initial_run = True
                return

            received_payload = payload
            return StopIteration

        def hook_thread(**hook_args):
            hook_loop = asyncio.new_event_loop()
            db_pool = hook_loop.run_until_complete(create_db_pool(self.test_config.database))
            hook = DBHook(pool=db_pool, **hook_args)
            hook_loop.run_until_complete(hook.run())

        # first round - with initial run
        ht = threading.Thread(
            target=hook_thread, kwargs={"channel": "testchannel", "event_handler": trigger, "initial_run": True}
        )
        ht.start()
        await asyncio.sleep(0.5)  # wait for connection listener to be set up
        await self.db_pool.execute("select pg_notify('testchannel', 'rolf');")
        ht.join()

        self.assertTrue(initial_run)
        self.assertEqual(received_payload, "rolf")

        # second round - without initial run
        initial_run = False
        received_payload = ""

        ht = threading.Thread(
            target=hook_thread, kwargs={"channel": "testchannel", "event_handler": trigger, "initial_run": False}
        )
        ht.start()
        await asyncio.sleep(0.5)  # wait for connection listener to be set up
        await self.db_pool.execute("select pg_notify('testchannel', 'lol');")
        ht.join()

        self.assertFalse(initial_run)
        self.assertEqual(received_payload, "lol")
