# pylint: disable=unexpected-keyword-arg,missing-kwoa
import argparse
import asyncio
import logging
import random
import threading
import time
from dataclasses import dataclass
from datetime import datetime

import aiohttp
import asyncpg

from stustapay.core.config import Config
from stustapay.core.database import create_db_pool
from stustapay.core.schema.order import Button
from stustapay.core.schema.terminal import TerminalConfig, TerminalRegistrationSuccess, ENTRY_BUTTON_ID
from stustapay.core.schema.till import Till
from stustapay.core.schema.user import CASHIER_ROLE_ID, ADMIN_ROLE_ID
from stustapay.core.subcommand import SubCommand
from stustapay.festivalsimulator.festivalsetup import (
    PROFILE_ID_TICKET,
    PROFILE_ID_TOPUP,
    PROFILE_ID_BEER,
    PROFILE_ID_COCKTAIL,
)


@dataclass
class Terminal:
    token: str
    till: Till
    config: TerminalConfig

    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    def get_random_button_selection(self) -> list[dict]:
        if self.config.buttons is None:
            return []

        buttons = random.choices(self.config.buttons, k=random.randint(1, len(self.config.buttons)))

        return [Button(till_button_id=button.id, quantity=random.randint(1, 4)).dict() for button in buttons]


class Simulator(SubCommand):
    def __init__(self, args, config: Config, **rest):
        del rest  # unused
        self.args = args
        self.logger = logging.getLogger(__name__)
        self.config = config

        self.base_url = self.config.terminalserver.base_url
        self.admin_tag_uid = None
        self.n_tills_total = None

        self.start_time = None

        self.counter_lock = threading.Lock()
        self.n_bookings = 0

        self.customer_lock = threading.Lock()
        self.locked_customers: set[int] = set()

        self.cashier_lock = threading.Lock()

    @staticmethod
    def argparse_register(subparser: argparse.ArgumentParser):
        subparser.add_argument(
            "-b", "--bookings-per-second", type=float, help="number of bookings per second", default=200.0
        )

    def sleep(self, n_tills: int):
        assert self.n_tills_total is not None

        to_sleep = (float(n_tills) / float(self.n_tills_total)) * (1.0 / self.args.bookings_per_second)
        to_sleep = random.uniform(to_sleep * 0.5, to_sleep * 1.5) / 2.0
        time.sleep(to_sleep)

    def inc_counter(self):
        with self.counter_lock:
            self.n_bookings += 1

    def get_counter(self):
        with self.counter_lock:
            return self.n_bookings

    def lock_customer(self, uid: int) -> bool:
        with self.customer_lock:
            if uid in self.locked_customers:
                return False
            self.locked_customers.add(uid)
            return True

    def unlock_customer(self, uid: int):
        with self.customer_lock:
            self.locked_customers.remove(uid)

    @staticmethod
    async def get_unused_cashiers(db_pool: asyncpg.Pool):
        return [
            int(row["user_tag_uid"])
            for row in await db_pool.fetch(
                "select usr.user_tag_uid "
                "from usr "
                "join account a on usr.cashier_account_id = a.id "
                "left join till t on usr.id = t.active_user_id "
                "where t.id is null"
            )
        ]

    @staticmethod
    async def get_free_tags(db_pool: asyncpg.Pool, limit=1):
        return [
            int(row["uid"])
            for row in await db_pool.fetch(
                "select uid from user_tag "
                "left join account a on user_tag.uid = a.user_tag_uid "
                "where a.id is null limit $1",
                limit,
            )
        ]

    @staticmethod
    async def get_customer_tags(db_pool: asyncpg.Pool):
        return [
            int(row["uid"])
            for row in await db_pool.fetch("select uid from user_tag join account a on user_tag.uid = a.user_tag_uid")
        ]

    async def _register_terminal(self, registration_uuid: str) -> Terminal:
        async with aiohttp.ClientSession(base_url=self.base_url) as client:
            resp = await client.post("/auth/register_terminal", json={"registration_uuid": registration_uuid})
            success = TerminalRegistrationSuccess.parse_obj(await resp.json())
            resp = await client.get("/config", headers={"Authorization": f"Bearer {success.token}"})
            config = TerminalConfig.parse_obj(await resp.json())
            return Terminal(token=success.token, till=success.till, config=config)

    async def reporter(self):
        while True:
            curr_time = datetime.now()
            runtime = curr_time - self.start_time
            bookings = self.get_counter()
            bookings_per_second = bookings / runtime.total_seconds()
            self.logger.info(f"Current runtime: {runtime}. Bookings per second: {bookings_per_second}")

            time.sleep(10)

    async def _register_terminals(
        self, db_pool: asyncpg.Pool, registration_uuids: list[str], stock_up=False
    ) -> list[Terminal]:
        stocking_id = await db_pool.fetchval("select id from cash_register_stocking limit 1")
        terminals: list[Terminal] = []
        for i, registration_uuid in enumerate(registration_uuids):
            terminal = await self._register_terminal(registration_uuid)
            with self.cashier_lock:
                cashier_tag_uids = await self.get_unused_cashiers(db_pool=db_pool)
                if len(cashier_tag_uids) == 0:
                    return terminals
                cashier_tag_uid = cashier_tag_uids[0]
                async with aiohttp.ClientSession(base_url=self.base_url, headers=terminal.get_headers()) as client:
                    resp = await client.post(
                        "/user/login", json={"user_tag": {"uid": self.admin_tag_uid}, "user_role_id": ADMIN_ROLE_ID}
                    )
                    assert resp.status == 200

                    if stock_up:
                        register_id = await db_pool.fetchval(
                            "insert into cash_register (name) values ($1) returning id",
                            f"Blechkasse {i} - {terminal.till.name}",
                        )
                        resp = await client.post(
                            "/stock-up-cash-register",
                            json={
                                "cashier_tag_uid": cashier_tag_uid,
                                "register_stocking_id": stocking_id,
                                "cash_register_id": register_id,
                            },
                        )
                        assert resp.status == 200

                    resp = await client.post(
                        "/user/login", json={"user_tag": {"uid": cashier_tag_uid}, "user_role_id": CASHIER_ROLE_ID}
                    )
                    assert resp.status == 200
                terminals.append(terminal)
        return terminals

    async def entry_till(self):
        db_pool = await create_db_pool(self.config.database)
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                "select registration_uuid from till where active_profile_id = $1", PROFILE_ID_TICKET
            )
            terminals = await self._register_terminals(
                db_pool=db_pool, registration_uuids=[str(row["registration_uuid"]) for row in rows], stock_up=True
            )

        async with aiohttp.ClientSession(base_url=self.base_url) as client:
            while True:
                terminal = random.choice(terminals)
                self.sleep(n_tills=len(terminals))
                n_customers = 1
                user_tags = await self.get_free_tags(db_pool=db_pool, limit=n_customers)
                if len(user_tags) == 0:
                    return

                self.inc_counter()
                payload = {
                    "customer_tag_uids": user_tags,
                    "payment_method": "cash",
                    "tickets": [{"till_button_id": ENTRY_BUTTON_ID, "quantity": n_customers}],
                }
                resp = await client.post("/order/check-ticket-sale", json=payload, headers=terminal.get_headers())
                if resp.status != 200:
                    self.logger.warning(f"Error in check ticket sale, { resp.status = }, payload = {await resp.json()}")
                    continue
                resp = await client.post("/order/book-ticket-sale", json=payload, headers=terminal.get_headers())
                if resp.status != 200:
                    self.logger.warning(f"Error in book ticket sale, { resp.status = }, payload = {await resp.json()}")
                    continue

    async def topup_till(self):
        db_pool = await create_db_pool(self.config.database)
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("select registration_uuid from till where active_profile_id = $1", PROFILE_ID_TOPUP)
            terminals = await self._register_terminals(
                db_pool=db_pool, registration_uuids=[str(row["registration_uuid"]) for row in rows], stock_up=True
            )

        async with aiohttp.ClientSession(base_url=self.base_url) as client:
            while True:
                terminal = random.choice(terminals)
                self.sleep(n_tills=len(terminals))
                customer_tags = await self.get_customer_tags(db_pool=db_pool)
                if len(customer_tags) == 0:
                    continue

                customer_tag_uid = random.choice(customer_tags)
                is_locked = self.lock_customer(customer_tag_uid)
                if not is_locked:
                    continue

                self.inc_counter()
                payload = {
                    "customer_tag_uid": customer_tag_uid,
                    "payment_method": "cash",
                    "amount": random.randint(10, 50),
                }
                resp = await client.post("/order/check-topup", json=payload, headers=terminal.get_headers())
                if resp.status != 200:
                    self.logger.warning(f"Error in check topup, { resp.status = }, payload = {await resp.json()}")
                    self.unlock_customer(customer_tag_uid)
                    continue
                resp = await client.post("/order/book-topup", json=payload, headers=terminal.get_headers())
                if resp.status != 200:
                    self.logger.warning(f"Error in book topup, { resp.status = }, payload = {await resp.json()}")
                    self.unlock_customer(customer_tag_uid)
                    continue
                self.unlock_customer(customer_tag_uid)

    async def sale_till(self):
        db_pool = await create_db_pool(self.config.database)
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                "select registration_uuid from till where active_profile_id = $1 or active_profile_id = $2",
                PROFILE_ID_BEER,
                PROFILE_ID_COCKTAIL,
            )
            terminals = await self._register_terminals(
                db_pool=db_pool,
                registration_uuids=[str(row["registration_uuid"]) for row in rows],
            )

        async with aiohttp.ClientSession(base_url=self.base_url) as client:
            while True:
                terminal: Terminal = random.choice(terminals)
                self.sleep(n_tills=len(terminals))

                customer_tags = await self.get_customer_tags(db_pool=db_pool)
                if len(customer_tags) == 0:
                    continue

                customer_tag_uid = random.choice(customer_tags)
                is_locked = self.lock_customer(customer_tag_uid)
                if not is_locked:
                    continue

                self.inc_counter()
                payload = {
                    "customer_tag_uid": customer_tag_uid,
                    "buttons": terminal.get_random_button_selection(),
                }
                resp = await client.post("/order/check-sale", json=payload, headers=terminal.get_headers())
                if resp.status != 200:
                    if "Not enough funds" not in await resp.text():
                        self.logger.warning(f"Error in check sale, { resp.status = }, payload = {await resp.json()}")
                    self.unlock_customer(customer_tag_uid)
                    continue
                resp = await client.post("/order/book-sale", json=payload, headers=terminal.get_headers())
                if resp.status != 200:
                    self.logger.warning(f"Error in book sale, { resp.status = }, payload = {await resp.json()}")
                    self.unlock_customer(customer_tag_uid)
                    continue
                self.unlock_customer(customer_tag_uid)

    async def run(self):
        db_pool = await create_db_pool(self.config.database)

        self.start_time = datetime.now()

        self.admin_tag_uid = int(
            await db_pool.fetchval("select user_tag_uid from user_with_roles where $1=any(role_names)", "admin")
        )
        self.n_tills_total = await db_pool.fetchval("select count(*) from till")

        entry_till_thread = threading.Thread(target=lambda: asyncio.run(self.entry_till()))
        topup_till_thread = threading.Thread(target=lambda: asyncio.run(self.topup_till()))
        sale_till_thread = threading.Thread(target=lambda: asyncio.run(self.sale_till()))
        reporter_thread = threading.Thread(target=lambda: asyncio.run(self.reporter()))

        entry_till_thread.start()
        topup_till_thread.start()
        sale_till_thread.start()
        reporter_thread.start()

        entry_till_thread.join()
        topup_till_thread.join()
        sale_till_thread.join()
        reporter_thread.join()
