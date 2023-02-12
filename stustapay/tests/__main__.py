import asyncio

from .test_dbhook import DBHookTest


async def run():
    # testing a pytest without pytest to better figure out errors
    test = DBHookTest()
    await test.asyncSetUp()
    await test.test_hook()
    await test.asyncTearDown()


def main():
    asyncio.run(run())


if __name__ == "__main__":
    main()
