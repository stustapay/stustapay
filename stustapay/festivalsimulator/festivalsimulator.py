# pylint: disable=unexpected-keyword-arg,missing-kwoa,attribute-defined-outside-init
import argparse
import asyncio
import logging
import random
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime

import aiohttp
import asyncpg

from stustapay.core.config import Config
from stustapay.core.database import create_db_pool
from stustapay.core.schema.order import Button
from stustapay.core.schema.terminal import TerminalConfig, TerminalRegistrationSuccess
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

        return [
            Button(till_button_id=button.id, quantity=(-1 if button.is_returnable else 1) * random.randint(1, 4)).dict()
            for button in buttons
        ]


class Simulator(SubCommand):
    def __init__(self, args, config: Config, **rest):
        del rest  # unused
        self.args = args
        self.logger = logging.getLogger(__name__)
        self.config = config

        self.base_url = self.config.terminalserver.base_url
        self.admin_url = self.config.administration.base_url
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
            "-b", "--bookings-per-second", type=float, help="number of bookings per second", default=100.0
        )

    def sleep(self):
        to_sleep = 1.0 / self.args.bookings_per_second
        to_sleep = random.uniform(to_sleep * 0.5, to_sleep * 1.5) / 2.0
        time.sleep(to_sleep)

    def sleep_topup(self):
        to_sleep = 10.0 / self.args.bookings_per_second
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
    async def get_unused_cash_registers(db_pool: asyncpg.Pool):
        return [
            int(row["id"])
            for row in await db_pool.fetch(
                "select cr.id "
                "from cash_register cr "
                "left join usr u on u.cash_register_id = cr.id "
                "where u.id is null"
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

    async def _register_terminal(self, db_pool: asyncpg.Pool, till_id: int) -> Terminal:
        registration_uuid = await db_pool.fetchval(
            "update till set registration_uuid = gen_random_uuid(), session_uuid = null "
            "where id = $1 "
            "returning registration_uuid",
            till_id,
        )

        async with aiohttp.ClientSession(base_url=self.base_url) as client:
            async with client.post(
                "/auth/register_terminal", json={"registration_uuid": str(registration_uuid)}
            ) as resp:
                if resp.status != 200:
                    self.logger.warning(f"Error registering terminal {resp.status = } payload = {await resp.text()}")
                    raise RuntimeError("foobar")
                success = TerminalRegistrationSuccess.parse_obj(await resp.json())
            async with client.get("/config", headers={"Authorization": f"Bearer {success.token}"}) as resp:
                if resp.status != 200:
                    self.logger.error(
                        f"Error fetching terminal config, { resp.status = }, payload = {await resp.json()}"
                    )
                config = TerminalConfig.parse_obj(await resp.json())
            return Terminal(token=success.token, till=success.till, config=config)

    async def voucher_granting(self):
        db_pool = await create_db_pool(self.config.database, n_connections=1)
        async with aiohttp.ClientSession(base_url=self.admin_url) as client:
            while True:
                rows = await db_pool.fetch("select * from account where user_tag_uid is not null")
                if len(rows) == 0:  # no tickets were sold yet
                    time.sleep(1)
                    continue

                r = random.choice([(row["id"], row["vouchers"]) for row in rows])
                async with client.post(
                    f"/accounts/{r[0]}/update-voucher-amount",
                    json={"new_voucher_amount": r[1] + random.randint(1, 8)},
                    headers=self.admin_headers,
                ) as resp:
                    if resp.status != 200:
                        self.logger.warning(
                            f"Error while updating voucher amount {resp.status = }, payload = {await resp.json()}"
                        )

                time.sleep(0.3)

    async def reporter(self):
        while True:
            curr_time = datetime.now()
            runtime = curr_time - self.start_time
            bookings = self.get_counter()
            bookings_per_second = bookings / runtime.total_seconds()
            self.logger.info(f"Current runtime: {runtime}. Bookings per second: {bookings_per_second}")

            time.sleep(10)

    async def _login_cashier(
        self, db_pool: asyncpg.Pool, terminal: Terminal, cashier_tag_uid: int, stock_up: bool = False
    ) -> bool:
        stocking_id = await db_pool.fetchval("select id from cash_register_stocking limit 1")
        async with aiohttp.ClientSession(base_url=self.base_url, headers=terminal.get_headers()) as client:
            async with client.post(
                "/user/login", json={"user_tag": {"uid": self.admin_tag_uid}, "user_role_id": ADMIN_ROLE_ID}
            ) as resp:
                assert resp.status == 200

            has_cash_register = await db_pool.fetchval(
                "select exists (select from usr where user_tag_uid = $1 and cash_register_id is not null)",
                cashier_tag_uid,
            )
            if stock_up and not has_cash_register:
                cash_register_ids = await self.get_unused_cash_registers(db_pool=db_pool)
                if len(cash_register_ids) == 0:
                    self.logger.warning("Did not find enough cash registers to stock all cashiers")
                    return False
                register_id = random.choice(cash_register_ids)
                async with client.post(
                    "/stock-up-cash-register",
                    json={
                        "cashier_tag_uid": cashier_tag_uid,
                        "register_stocking_id": stocking_id,
                        "cash_register_id": register_id,
                    },
                ) as resp:
                    if resp.status != 200:
                        self.logger.warning(
                            f"Error while stocking up cashier {resp.status = }, payload = {await resp.json()}"
                        )
                    assert resp.status == 200

            async with client.post(
                "/user/login", json={"user_tag": {"uid": cashier_tag_uid}, "user_role_id": CASHIER_ROLE_ID}
            ) as resp:
                assert resp.status == 200

            return True

    async def _register_terminals(self, db_pool: asyncpg.Pool, till_ids: list[int], stock_up=False) -> list[Terminal]:
        terminals: list[Terminal] = []
        for till_id in till_ids:
            terminal = await self._register_terminal(db_pool=db_pool, till_id=till_id)

            if terminal.till.active_user_id is not None:
                is_cashier = await db_pool.fetchval(
                    "select exists(select from usr where id = $1 and cashier_account_id is not null)",
                    terminal.till.active_user_id,
                )
                if is_cashier:
                    self.logger.info("Terminal already has a logged in cashier")
                    terminals.append(terminal)
                    continue

            with self.cashier_lock:
                cashier_tag_uids = await self.get_unused_cashiers(db_pool=db_pool)
                if len(cashier_tag_uids) == 0:
                    return terminals
                cashier_tag_uid = cashier_tag_uids[0]

                login_success = await self._login_cashier(
                    db_pool=db_pool, terminal=terminal, cashier_tag_uid=cashier_tag_uid, stock_up=stock_up
                )
                if not login_success:
                    raise RuntimeError("Error logging in cashier")
            terminals.append(terminal)

        return terminals

    async def _preform_cashier_close_out(self, cashier_id: int) -> bool:
        async with aiohttp.ClientSession(base_url=self.admin_url) as client:
            self.logger.info(f"Closing out cashier with id {cashier_id = }")
            async with client.get(f"/cashiers/{cashier_id}", headers=self.admin_headers) as resp:
                if resp.status != 200:
                    self.logger.info(
                        f"Failed to get cashier detail for {cashier_id = }, {resp.status = } payload = {await resp.json()}"
                    )
                    return False

                drawer_balance = (await resp.json())["cash_drawer_balance"]
                if drawer_balance == 0:
                    self.logger.info(f"Skipping cashier close out ({cashier_id = }) since drawer balance is zero")
                    return True

            payload = {
                "comment": "some shift this was",
                "actual_cash_drawer_balance": drawer_balance
                + round(random.uniform(-drawer_balance * 0.1, drawer_balance * 0.1)),
                "closing_out_user_id": random.randint(1, 5),  # one of 5 finanzorgas
            }
            async with client.post(
                f"/cashiers/{cashier_id}/close-out", json=payload, headers=self.admin_headers
            ) as resp:
                if resp.status != 200:
                    self.logger.warning(f"Closing out cashier failed: {resp.status = }, payload = {await resp.json()}")
                    return False

            return True

    async def perform_cashier_shift_change(self, db_pool: asyncpg.Pool, terminal: Terminal, perform_close_out=False):
        with self.cashier_lock:
            async with aiohttp.ClientSession(base_url=self.base_url) as client:
                async with client.get("/user", headers=terminal.get_headers()) as resp:
                    if resp.status != 200:
                        self.logger.warning(
                            f"Current user fetching failed, {resp.status = }, payload = {await resp.json()}"
                        )
                        return
                    cashier_id = (await resp.json())["id"]

                async with client.post("/user/logout", headers=terminal.get_headers()) as resp:
                    if resp.status != 204:
                        self.logger.warning(f"Terminal log out failed, {resp.status = }, payload = {await resp.json()}")
                        return

                if perform_close_out:
                    await self._preform_cashier_close_out(cashier_id=cashier_id)

                cashier_tag_uids = await self.get_unused_cashiers(db_pool=db_pool)
                if len(cashier_tag_uids) == 0:
                    self.logger.warning("Did not find a not logged in cashier")
                    return

                await self._login_cashier(
                    db_pool=db_pool, terminal=terminal, cashier_tag_uid=cashier_tag_uids[0], stock_up=perform_close_out
                )

    async def entry_till(self):
        db_pool = await create_db_pool(self.config.database, n_connections=2)
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("select id from till where id != 1 and active_profile_id = $1", PROFILE_ID_TICKET)
            terminals = await self._register_terminals(
                db_pool=db_pool, till_ids=[row["id"] for row in rows], stock_up=True
            )

        async with aiohttp.ClientSession(base_url=self.base_url) as client:
            while True:
                terminal = random.choice(terminals)
                self.sleep()
                n_customers = random.randint(1, 3)
                user_tags = await self.get_free_tags(db_pool=db_pool, limit=n_customers)
                if len(user_tags) == 0:
                    return

                self.inc_counter()
                payload = {
                    "uuid": str(uuid.uuid4()),
                    "payment_method": "cash",
                    "customer_tag_uids": user_tags,
                }
                async with client.post(
                    "/order/check-ticket-sale", json=payload, headers=terminal.get_headers()
                ) as resp:
                    if resp.status != 200:
                        self.logger.warning(
                            f"Error in check ticket sale, { resp.status = }, payload = {await resp.json()}"
                        )
                        continue
                async with client.post("/order/book-ticket-sale", json=payload, headers=terminal.get_headers()) as resp:
                    if resp.status != 200:
                        self.logger.warning(
                            f"Error in book ticket sale, { resp.status = }, payload = {await resp.json()}"
                        )
                        continue

                if random.randint(0, 100) == 0:
                    await self.perform_cashier_shift_change(db_pool=db_pool, terminal=terminal, perform_close_out=True)

    async def topup_till(self):
        db_pool = await create_db_pool(self.config.database, n_connections=2)
        async with db_pool.acquire() as conn:
            rows = await conn.fetch("select id from till where id != 1 and active_profile_id = $1", PROFILE_ID_TOPUP)
            terminals = await self._register_terminals(
                db_pool=db_pool, till_ids=[row["id"] for row in rows], stock_up=True
            )

        async with aiohttp.ClientSession(base_url=self.base_url) as client:
            while True:
                terminal = random.choice(terminals)
                self.sleep_topup()
                customer_tags = await self.get_customer_tags(db_pool=db_pool)
                if len(customer_tags) == 0:
                    continue

                customer_tag_uid = random.choice(customer_tags)
                is_locked = self.lock_customer(customer_tag_uid)
                if not is_locked:
                    continue

                self.inc_counter()
                payload = {
                    "uuid": str(uuid.uuid4()),
                    "customer_tag_uid": customer_tag_uid,
                    "payment_method": "cash",
                    "amount": random.randint(10, 50),
                }
                async with client.post("/order/check-topup", json=payload, headers=terminal.get_headers()) as resp:
                    if resp.status != 200:
                        if "More than" not in await resp.text():
                            self.logger.warning(
                                f"Error in check topup, { resp.status = }, payload = {await resp.json()}"
                            )
                        self.unlock_customer(customer_tag_uid)
                        continue
                async with client.post("/order/book-topup", json=payload, headers=terminal.get_headers()) as resp:
                    if resp.status != 200:
                        self.logger.warning(f"Error in book topup, { resp.status = }, payload = {await resp.json()}")
                        self.unlock_customer(customer_tag_uid)
                        continue
                self.unlock_customer(customer_tag_uid)

                if random.randint(0, 100) == 0:
                    await self.perform_cashier_shift_change(db_pool=db_pool, terminal=terminal, perform_close_out=True)

    async def sale_till(self):
        db_pool = await create_db_pool(self.config.database, n_connections=2)
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                "select id from till where id != 1 and (active_profile_id = $1 or active_profile_id = $2)",
                PROFILE_ID_BEER,
                PROFILE_ID_COCKTAIL,
            )
            terminals = await self._register_terminals(
                db_pool=db_pool,
                till_ids=[row["id"] for row in rows],
            )

        async with aiohttp.ClientSession(base_url=self.base_url) as client:
            while True:
                terminal: Terminal = random.choice(terminals)
                self.sleep()

                customer_tags = await self.get_customer_tags(db_pool=db_pool)
                if len(customer_tags) == 0:
                    continue

                customer_tag_uid = random.choice(customer_tags)
                is_locked = self.lock_customer(customer_tag_uid)
                if not is_locked:
                    continue

                self.inc_counter()
                payload = {
                    "uuid": str(uuid.uuid4()),
                    "customer_tag_uid": customer_tag_uid,
                    "buttons": terminal.get_random_button_selection(),
                }
                async with client.post("/order/check-sale", json=payload, headers=terminal.get_headers()) as resp:
                    if resp.status != 200:
                        if "Not enough funds" not in await resp.text():
                            self.logger.warning(
                                f"Error in check sale, { resp.status = }, payload = {await resp.json()}"
                            )
                        self.unlock_customer(customer_tag_uid)
                        continue
                async with client.post("/order/book-sale", json=payload, headers=terminal.get_headers()) as resp:
                    if resp.status != 200:
                        self.logger.warning(f"Error in book sale, { resp.status = }, payload = {await resp.json()}")
                        self.unlock_customer(customer_tag_uid)
                        continue
                self.unlock_customer(customer_tag_uid)

                if random.randint(0, 100) == 0:
                    await self.perform_cashier_shift_change(db_pool=db_pool, terminal=terminal, perform_close_out=False)

    async def login_admin(self) -> str:
        async with aiohttp.ClientSession(base_url=self.admin_url) as client:
            async with client.post("/auth/login", data={"username": "admin", "password": "admin"}) as resp:
                if resp.status != 200:
                    raise RuntimeError("Error trying to log in admin user")
                payload = await resp.json()
            return payload["access_token"]

    async def run(self):
        db_pool = await create_db_pool(self.config.database, n_connections=1)

        self.start_time = datetime.now()

        self.admin_tag_uid = int(
            await db_pool.fetchval("select user_tag_uid from user_with_roles where $1=any(role_names) limit 1", "admin")
        )
        self.admin_token = await self.login_admin()
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.n_tills_total = await db_pool.fetchval("select count(*) from till")

        entry_till_thread = threading.Thread(target=lambda: asyncio.run(self.entry_till()))
        topup_till_thread = threading.Thread(target=lambda: asyncio.run(self.topup_till()))
        sale_till_thread = threading.Thread(target=lambda: asyncio.run(self.sale_till()))
        voucher_thread = threading.Thread(target=lambda: asyncio.run(self.voucher_granting()))
        reporter_thread = threading.Thread(target=lambda: asyncio.run(self.reporter()))

        entry_till_thread.start()
        topup_till_thread.start()
        sale_till_thread.start()
        voucher_thread.start()
        reporter_thread.start()

        entry_till_thread.join()
        topup_till_thread.join()
        sale_till_thread.join()
        voucher_thread.join()
        reporter_thread.join()
