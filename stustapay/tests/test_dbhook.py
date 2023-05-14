# pylint: disable=attribute-defined-outside-init
import asyncio

from stustapay.core.service.common.dbhook import DBHook
from .common import BaseTestCase


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

        # first round - with initial run
        hook = DBHook(self.db_conn, "testchannel", trigger, initial_run=True)

        await hook.register()
        hook_task = asyncio.create_task(hook.run())
        await self.db_conn.execute("select pg_notify('testchannel', 'rolf');")
        await hook_task

        self.assertTrue(initial_run)
        self.assertEqual(received_payload, "rolf")

        await hook.deregister()

        # second round - without initial run
        initial_run = False
        received_payload = ""
        hook = DBHook(self.db_conn, "testchannel", trigger, initial_run=False)

        await hook.register()
        hook_task = asyncio.create_task(hook.run())
        await self.db_conn.execute("select pg_notify('testchannel', 'lol');")
        await hook_task

        self.assertFalse(initial_run)
        self.assertEqual(received_payload, "lol")
        await hook.deregister()
