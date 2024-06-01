# pylint: disable=attribute-defined-outside-init
import asyncio
import threading

import asyncpg
import pytest

from stustapay.core.config import Config
from stustapay.core.service.common.dbhook import DBHook
from stustapay.framework.database import create_db_pool


@pytest.mark.skip("currently does not work")
async def test_hook(config: Config, setup_test_db_pool: asyncpg.Pool):
    initial_run: bool = False
    received_payload: str = ""

    async def trigger(payload):
        nonlocal initial_run, received_payload
        # payload is none when the hook is run without a trigger first.
        if payload is None:
            initial_run = True
            return

        received_payload = payload

    hook: DBHook | None = None

    def hook_thread(**hook_args):
        nonlocal hook
        hook_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(hook_loop)
        db_pool = asyncio.run(create_db_pool(config.database))
        hook = DBHook(pool=db_pool, **hook_args)
        asyncio.run(hook.run())

    # first round - with initial run
    ht = threading.Thread(
        target=hook_thread, kwargs={"channel": "testchannel", "event_handler": trigger, "initial_run": True}
    )
    ht.start()
    await asyncio.sleep(0.5)  # wait for connection listener to be set up
    await setup_test_db_pool.execute("select pg_notify('testchannel', 'rolf');")
    assert hook is not None
    await asyncio.sleep(0.2)  # wait for the notification to arrive
    hook.stop()
    ht.join()

    assert initial_run
    assert received_payload == "rolf"

    # second round - without initial run
    initial_run = False
    received_payload = ""

    ht = threading.Thread(
        target=hook_thread, kwargs={"channel": "testchannel", "event_handler": trigger, "initial_run": False}
    )
    ht.start()
    await asyncio.sleep(0.5)  # wait for connection listener to be set up
    await setup_test_db_pool.execute("select pg_notify('testchannel', 'lol');")
    assert hook is not None
    await asyncio.sleep(0.2)  # wait for the notification to arrive
    hook.stop()
    ht.join()

    assert not initial_run
    assert received_payload == "lol"
