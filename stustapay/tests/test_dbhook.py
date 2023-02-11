import asyncio

from .common import BaseTestCase

from stustapay.core.dbhook import DBHook


class DBHookTest(BaseTestCase):
    async def test_hook(self):
        initial_run: bool = False
        triggered: bool = False

        async def trigger(payload):
            nonlocal initial_run, triggered
            # payload is none when the hook is run without a trigger first.
            if payload is None:
                initial_run = True
                return

            self.assertEqual(payload, "rolf")
            triggered = True
            return StopIteration

        hook = DBHook(self.db_conn, "testchannel", trigger)

        await hook.register()
        hook_task = asyncio.create_task(hook.run())
        await self.db_conn.execute("select pg_notify('testchannel', 'rolf');")
        await hook_task

        self.assertTrue(initial_run)
        self.assertTrue(triggered)
