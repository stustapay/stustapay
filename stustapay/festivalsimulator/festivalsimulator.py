# pylint: disable=unexpected-keyword-arg,missing-kwoa,attribute-defined-outside-init
import asyncio
import logging
import random
import sys
import uuid
from dataclasses import dataclass
from datetime import datetime

import aiohttp
import asyncpg

from stustapay.core.config import Config
from stustapay.core.schema.order import Button
from stustapay.core.schema.terminal import Terminal as _Terminal
from stustapay.core.schema.terminal import TerminalConfig, TerminalRegistrationSuccess
from stustapay.framework.database import create_db_pool


def ith_chunk(lst: list, n_chunks: int, index: int):
    n = len(lst) // n_chunks
    end_range = (index + 1) * n if index < n_chunks - 1 else len(lst)
    return lst[index * n : end_range]


@dataclass
class Terminal:
    token: str
    terminal: _Terminal
    config: TerminalConfig

    def get_headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    def get_random_button_selection(self) -> list[dict]:
        assert self.config.till is not None
        if self.config.till.buttons is None:
            return []

        buttons = random.choices(self.config.till.buttons, k=random.randint(1, len(self.config.till.buttons)))

        return [
            Button(
                till_button_id=button.id, quantity=(-1 if button.is_returnable else 1) * random.randint(1, 4)
            ).model_dump()
            for button in buttons
        ]


class Simulator:
    def __init__(self, config: Config, bookings_per_second: float = 100.0):
        self.logger = logging.getLogger(__name__)
        self.config = config

        self.terminal_api_base_url = self.config.terminalserver.base_url
        self.admin_api_base_url = self.config.administration.base_url
        self.customer_api_base_url = self.config.customerportal.base_url
        self.bookings_per_second = bookings_per_second
        self.admin_tag_uid: int
        self.n_tills_total: int | None = None

        self.start_time = datetime.now()

        self.n_bookings = 0

        self.locked_customers: set[int] = set()

        self.db_pool: asyncpg.Pool

        self.n_entry_till_workers = 1
        self.n_sale_till_workers = 1
        self.n_topup_till_workers = 1

    async def sleep(self):
        to_sleep = 1.0 / self.bookings_per_second
        to_sleep = random.uniform(to_sleep * 0.5, to_sleep * 1.5) / 2.0
        await asyncio.sleep(to_sleep)

    async def sleep_topup(self):
        to_sleep = 10.0 / self.bookings_per_second
        to_sleep = random.uniform(to_sleep * 0.5, to_sleep * 1.5) / 2.0
        await asyncio.sleep(to_sleep)

    def inc_counter(self):
        self.n_bookings += 1

    def get_counter(self):
        return self.n_bookings

    def lock_customer(self, uid: int) -> bool:
        if uid in self.locked_customers:
            return False
        self.locked_customers.add(uid)
        return True

    def unlock_customer(self, uid: int):
        self.locked_customers.remove(uid)

    async def get_unused_cashiers(self):
        return self.unused_cashiers.pop()

    async def update_unused_cashiers(self):
        self.unused_cashiers = [
            int(row["user_tag_uid"])
            for row in await self.db_pool.fetch(
                "select u.user_tag_uid "
                "from user_with_tag u "
                "join account a on u.cashier_account_id = a.id "
                "left join till t on u.id = t.active_user_id "
                "where t.id is null"
            )
        ]

    async def get_unused_cash_registers(self):
        return [
            int(row["id"])
            for row in await self.db_pool.fetch(
                "select cr.id "
                "from cash_register cr "
                "left join usr u on u.cash_register_id = cr.id "
                "where u.id is null"
            )
        ]

    async def get_free_tags(self, limit=1):
        return [
            row["pin"]
            for row in await self.db_pool.fetch(
                "select pin from user_tag "
                "left join account a on user_tag.id = a.user_tag_id "
                "where a.id is null limit $1",
                limit,
            )
        ]

    async def get_customer_tags(self):
        return [
            int(row["uid"])
            for row in await self.db_pool.fetch(
                "select uid from user_tag join account a on user_tag.id = a.user_tag_id"
            )
        ]

    async def _register_terminal(self, till_id: int) -> Terminal:
        terminal_id = await self.db_pool.fetchval("select terminal_id from till where id = $1", till_id)
        registration_uuid = await self.db_pool.fetchval(
            "update terminal set registration_uuid = gen_random_uuid(), session_uuid = null "
            "where id = $1 "
            "returning registration_uuid",
            terminal_id,
        )

        async with aiohttp.ClientSession(base_url=self.terminal_api_base_url) as client:
            async with client.post(
                "/auth/register_terminal", json={"registration_uuid": str(registration_uuid)}
            ) as resp:
                if resp.status != 200:
                    self.logger.warning(f"Error registering terminal {resp.status = } payload = {await resp.text()}")
                    raise RuntimeError(f"Error registering terminal {resp.status = } payload = {await resp.text()}")
                success = TerminalRegistrationSuccess.model_validate(await resp.json())
            async with client.get("/config", headers={"Authorization": f"Bearer {success.token}"}) as resp:
                if resp.status != 200:
                    self.logger.error(
                        f"Error fetching terminal config, { resp.status = }, payload = {await resp.json()}"
                    )
                config = TerminalConfig.model_validate(await resp.json())
            return Terminal(token=success.token, terminal=success.terminal, config=config)

    async def _login_user(self, terminal: Terminal, user_tag_uid: int, role_id: int):
        async with aiohttp.ClientSession(base_url=self.terminal_api_base_url, headers=terminal.get_headers()) as client:
            async with client.post(
                "/user/login", json={"user_tag": {"uid": user_tag_uid}, "user_role_id": role_id}
            ) as resp:
                if resp.status == 503:
                    self.logger.warning(f"User with uid {user_tag_uid} problem logging in, {await resp.text()}")
                    await self.sleep()
                    await self._login_user(terminal=terminal, user_tag_uid=user_tag_uid, role_id=role_id)
                elif resp.status != 200:
                    self.logger.critical(
                        f"Failed to login {user_tag_uid} on terminal {terminal.terminal.name}. " f"{await resp.text()}"
                    )
                    return False

    async def voucher_granting(self):
        async with aiohttp.ClientSession(base_url=self.admin_api_base_url) as client:
            while True:
                rows = await self.db_pool.fetch("select * from account where user_tag_id is not null")
                if len(rows) == 0:  # no tickets were sold yet
                    await asyncio.sleep(1)
                    continue

                r = random.choice([(row["id"], row["vouchers"]) for row in rows])
                async with client.post(
                    f"/accounts/{r[0]}/update-voucher-amount?node_id={self.event_node_id}",
                    json={"new_voucher_amount": r[1] + random.randint(1, 8)},
                    headers=self.admin_headers,
                ) as resp:
                    if resp.status != 200:
                        self.logger.warning(
                            f"Error while updating voucher amount {resp.status = }, payload = {await resp.json()}"
                        )

                await asyncio.sleep(0.3)

    async def payout_registration(self):
        async with aiohttp.ClientSession(base_url=self.customer_api_base_url) as client:
            while True:

                # TODO: future: test if the user has not already locked in
                # get random user that has uid
                rows = await self.db_pool.fetch(
                    "select user_tag_pin from account_with_history where user_tag_uid is not null"
                )
                if len(rows) == 0:  # no tickets were sold yet
                    await asyncio.sleep(1)
                    continue

                pin = random.choice([(row["user_tag_pin"]) for row in rows])
                token = await self.login_customer(pin=pin)

                donation = random.choice(["no_donation", "partial_donation", "full_donation"])

                if donation == "full_donation":
                    async with client.post(
                        "/customer_all_donation",
                        headers={"Authorization": f"Bearer {token}"},
                    ) as resp:
                        if resp.status != 204:
                            self.logger.warning(f"Error while donating all with {resp.status = }")
                elif donation == "no_donation":
                    async with client.post(
                        "/customer_info",
                        json={
                            "iban": "DE89370400440532013000",
                            "account_name": "Max Muster",
                            "email": "max.muster@stusta.de",
                        },
                        headers={"Authorization": f"Bearer {token}"},
                    ) as resp:
                        if resp.status != 204:
                            self.logger.warning(f"Error while setting payout {resp.status = }")
                else:  # partial donation
                    balance = await self.db_pool.fetchval("select balance from customer where user_tag_pin = $1", pin)
                    async with client.post(
                        "/customer_info",
                        json={
                            "iban": "DE89370400440532013000",
                            "account_name": "Max Muster",
                            "email": "max.muster@stusta.de",
                            "donation": random.random() * float(balance),
                        },
                        headers={"Authorization": f"Bearer {token}"},
                    ) as resp:
                        if resp.status != 204:
                            self.logger.warning(f"Error while setting payout with donation {resp.status = }")

                await self.logout_customer(pin=pin, token=token)
                await asyncio.sleep(0.3)

    async def reporter(self):
        while True:
            curr_time = datetime.now()
            runtime = curr_time - self.start_time
            bookings = self.get_counter()
            bookings_per_second = bookings / runtime.total_seconds()
            self.logger.info(f"Current runtime: {runtime}. Bookings per second: {bookings_per_second}")

            await asyncio.sleep(10)

    async def _stock_up_cashier(self, cashier_tag_uid: int):
        till_id = await self.db_pool.fetchval(
            "select till.id from till join user_with_tag u on till.active_user_id = u.id where u.user_tag_uid = $1",
            cashier_tag_uid,
        )
        await self.db_pool.execute(
            "update till set active_user_id = null, active_user_role_id = null where id = $1", till_id
        )
        stocking_id = await self.db_pool.fetchval("select id from cash_register_stocking limit 1")
        has_cash_register = await self.db_pool.fetchval(
            "select exists (select from user_with_tag where user_tag_uid = $1 and cash_register_id is not null)",
            cashier_tag_uid,
        )
        terminal = random.choice(self.admin_terminals)
        async with aiohttp.ClientSession(base_url=self.terminal_api_base_url, headers=terminal.get_headers()) as client:
            if not has_cash_register:
                cash_register_ids = await self.get_unused_cash_registers()
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

    async def _login_cashier(self, terminal: Terminal, cashier_tag_uid: int, stock_up: bool = False) -> bool:
        await self._login_user(terminal=terminal, user_tag_uid=self.admin_tag_uid, role_id=self.finanzorga_role_id)
        async with aiohttp.ClientSession(base_url=self.terminal_api_base_url, headers=terminal.get_headers()) as client:
            if stock_up:
                await self._stock_up_cashier(cashier_tag_uid=cashier_tag_uid)

            async with client.post(
                "/user/login", json={"user_tag": {"uid": cashier_tag_uid}, "user_role_id": self.cashier_role_id}
            ) as resp:
                if resp.status != 200:
                    self.logger.critical(
                        f"Failed to login {cashier_tag_uid} as cashier on terminal {terminal.terminal.name}. "
                        f"{await resp.text()}"
                    )
                    return False

            return True

    async def _register_terminals(self, till_ids: list[int], stock_up=False) -> list[Terminal]:
        terminals: list[Terminal] = []
        for till_id in till_ids:
            terminal = await self._register_terminal(till_id=till_id)
            await asyncio.sleep(0.1)  # to avoid overloading the database

            assert terminal.config.till is not None
            if terminal.config.till.active_user_id is not None:
                is_cashier = await self.db_pool.fetchval(
                    "select exists(select from usr where id = $1 and cashier_account_id is not null)",
                    terminal.config.till.active_user_id,
                )
                if is_cashier:
                    self.logger.info("Terminal already has a logged in cashier")
                    terminals.append(terminal)
                    continue

            cashier_tag_uid = await self.get_unused_cashiers()
            if cashier_tag_uid is None:
                return terminals

            await self._login_user(terminal=terminal, user_tag_uid=self.admin_tag_uid, role_id=self.admin_role_id)

            login_success = await self._login_cashier(
                terminal=terminal, cashier_tag_uid=cashier_tag_uid, stock_up=stock_up
            )
            if not login_success:
                raise RuntimeError("Error logging in cashier")
            terminals.append(terminal)

        return terminals

    async def _preform_cashier_close_out(self, cashier_id: int) -> bool:
        async with aiohttp.ClientSession(base_url=self.admin_api_base_url) as client:
            self.logger.info(f"Closing out cashier with id {cashier_id = }")
            async with client.get(
                f"/cashiers/{cashier_id}?node_id={self.event_node_id}", headers=self.admin_headers
            ) as resp:
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
                f"/cashiers/{cashier_id}/close-out?node_id={self.event_node_id}",
                json=payload,
                headers=self.admin_headers,
            ) as resp:
                if resp.status != 200:
                    self.logger.warning(f"Closing out cashier failed: {resp.status = }, payload = {await resp.json()}")
                    return False

            return True

    async def perform_cashier_shift_change(self, terminal: Terminal, perform_close_out=False):
        async with aiohttp.ClientSession(base_url=self.terminal_api_base_url) as client:
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

            await self.update_unused_cashiers()
            cashier_tag_uid = await self.get_unused_cashiers()
            if cashier_tag_uid is None:
                self.logger.warning("Did not find a not logged in cashier")
                return

            await self._login_cashier(terminal=terminal, cashier_tag_uid=cashier_tag_uid, stock_up=perform_close_out)

    async def entry_till(self, worker_idx: int):
        rows = await self.db_pool.fetch("select id from till where name like '%Eintrittskasse%'")
        till_ids = ith_chunk([row["id"] for row in rows], self.n_entry_till_workers, worker_idx)
        terminals = await self._register_terminals(till_ids=till_ids, stock_up=True)

        async with aiohttp.ClientSession(base_url=self.terminal_api_base_url) as client:
            while True:
                terminal = random.choice(terminals)
                await self.sleep()
                n_customers = random.randint(1, 3)

                user_tag_pins = await self.get_free_tags(limit=n_customers)
                if len(user_tag_pins) == 0:
                    return

                customer_tags = []
                for user_tag_pin in user_tag_pins:
                    uid = random.randint(1, 100000000)
                    customer_tags.append(
                        {
                            "tag_uid": uid,
                            "tag_pin": user_tag_pin,
                        }
                    )

                self.inc_counter()
                payload = {
                    "uuid": str(uuid.uuid4()),
                    "payment_method": "cash",
                    "customer_tags": customer_tags,
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
                    await self.perform_cashier_shift_change(terminal=terminal, perform_close_out=True)

    async def topup_till(self, worker_idx: int):
        rows = await self.db_pool.fetch("select id from till where name like '%Aufladekasse%'")
        till_ids = ith_chunk([row["id"] for row in rows], self.n_topup_till_workers, worker_idx)
        terminals = await self._register_terminals(till_ids=till_ids, stock_up=True)

        async with aiohttp.ClientSession(base_url=self.terminal_api_base_url) as client:
            while True:
                terminal = random.choice(terminals)
                await self.sleep_topup()
                customer_tags = await self.get_customer_tags()
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
                    await self.perform_cashier_shift_change(terminal=terminal, perform_close_out=True)

    async def sale_till(self, worker_idx: int):
        rows = await self.db_pool.fetch(
            "select id from till "
            "where name like '%Weißbierinsel%' or name like '%Cocktailkasse%' or name like '%Weißbierkarussel%'",
        )
        till_ids = ith_chunk([row["id"] for row in rows], self.n_sale_till_workers, worker_idx)
        terminals = await self._register_terminals(till_ids=till_ids)

        async with aiohttp.ClientSession(base_url=self.terminal_api_base_url) as client:
            while True:
                terminal: Terminal = random.choice(terminals)
                await self.sleep()

                customer_tags = await self.get_customer_tags()
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
                                f"Error in check sale (terminal {terminal.config.name}), { resp.status = }, payload = {await resp.json()}"
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
                    await self.perform_cashier_shift_change(terminal=terminal, perform_close_out=False)

    async def login_admin(self) -> str:
        async with aiohttp.ClientSession(base_url=self.admin_api_base_url) as client:
            async with client.post("/auth/login", json={"username": "admin", "password": "admin"}) as resp:
                if resp.status != 200:
                    raise RuntimeError("Error trying to log in admin user")
                payload = await resp.json()
            return payload["success"]["token"]

    async def login_customer(self, pin: str) -> str:
        async with aiohttp.ClientSession(base_url=self.customer_api_base_url) as client:
            async with client.post("/auth/login", json={"pin": pin}) as resp:
                if resp.status == 503:
                    self.logger.warning(f"Customer with pin {pin} problem logging in, {await resp.text()}")
                    await self.sleep()
                    return await self.login_customer(pin)
                elif resp.status != 200:
                    raise RuntimeError(f"Error trying to log in customer with pin {pin}")
                payload = await resp.json()
            return payload["access_token"]

    async def logout_customer(self, pin: str, token: str):
        async with aiohttp.ClientSession(base_url=self.customer_api_base_url) as client:
            async with client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"}) as resp:
                if resp.status == 503:
                    self.logger.warning(f"Customer with pin {pin} problem logging out, {await resp.text()}")
                    await self.sleep()
                    await self.logout_customer(pin, token)
                elif resp.status != 204:
                    raise RuntimeError(f"Error trying to log out customer with pin {pin}")

    async def _prepare_admin_terminals(self):
        rows = await self.db_pool.fetch("select id from till where name like '%Admin%'")
        terminals = []
        for row in rows:
            terminal = await self._register_terminal(till_id=row["id"])
            async with aiohttp.ClientSession(
                base_url=self.terminal_api_base_url, headers=terminal.get_headers()
            ) as client:
                async with client.post(
                    "/user/login",
                    json={"user_tag": {"uid": self.admin_tag_uid}, "user_role_id": self.finanzorga_role_id},
                ) as resp:
                    if resp.status != 200:
                        self.logger.critical(
                            f"Failed to login admin on terminal {terminal.terminal.name}. {await resp.text()}"
                        )
                        raise RuntimeError(
                            f"Failed to login admin on terminal {terminal.terminal.name}. {await resp.text()}"
                        )
            terminals.append(terminal)
        return terminals

    async def initialize(self):
        self.db_pool = await create_db_pool(
            self.config.database,
            n_connections=(self.n_entry_till_workers + self.n_sale_till_workers + self.n_topup_till_workers),
        )

        self.event_node_id = await self.db_pool.fetchval(
            "select id from node where event_id is not null and name = $1", "SSC-Test"
        )

        self.admin_tag_uid = int(
            await self.db_pool.fetchval(
                "select user_tag_uid from user_with_tag where login = 'admin' and node_id = $1 limit 1",
                self.event_node_id,
            )
        )

        self.admin_role_id = await self.db_pool.fetchval(
            "select id from user_role where name = 'admin'",
        )
        self.finanzorga_role_id = await self.db_pool.fetchval(
            "select id from user_role where name = 'finanzorga' and node_id = $1",
            self.event_node_id,
        )
        self.cashier_role_id = await self.db_pool.fetchval(
            "select id from user_role where name = 'cashier' and node_id = $1", self.event_node_id
        )
        self.admin_token = await self.login_admin()
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.n_tills_total = await self.db_pool.fetchval("select count(*) from till")
        self.admin_terminals = await self._prepare_admin_terminals()

        await self.update_unused_cashiers()

    async def run(self):
        await self.initialize()
        tasks = (
            [asyncio.create_task(self.entry_till(i)) for i in range(self.n_entry_till_workers)]
            + [asyncio.create_task(self.sale_till(i)) for i in range(self.n_sale_till_workers)]
            + [asyncio.create_task(self.topup_till(i)) for i in range(self.n_topup_till_workers)]
            + [
                asyncio.create_task(self.voucher_granting()),
                asyncio.create_task(self.reporter()),
                asyncio.create_task(self.payout_registration()),
            ]
        )

        try:
            await asyncio.gather(*tasks)
        except KeyboardInterrupt:
            self.logger.info("Shutting down simulator ...")
            for task in tasks:
                task.cancel()
        except Exception:  # pylint: disable=bare-except
            self.logger.exception("An unknown error occurred while simulating")
            sys.exit(1)

        await self.db_pool.close()
