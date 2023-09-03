import asyncio
import contextlib
import curses
# import functools
import logging
from curses import wrapper
from datetime import datetime

import asyncpg

from stustapay.core.database import Connection, create_db_pool
from stustapay.core.subcommand import SubCommand
from .config import Config

LOGGER = logging.getLogger(__name__)

ROW = 4
COL = 1
HEIGHT = 8


def add_status_line(status, line, attr):
    status.move(1, 1)
    status.insertln()
    status.addstr(1, 1, str(datetime.now()) + ": " + line, attr)
    status.box()
    status.addstr(0, 0, "STATUS", curses.A_REVERSE)
    status.refresh()


async def draw_meters(meters, db):
    tses = await db.fetch("select * from tse order by id")
    for i in range(len(tses)):
        meters[i].clear()
        if tses[i]["status"] == "new":
            colorscheme = curses.color_pair(2)
        elif tses[i]["status"] == "active":
            colorscheme = curses.color_pair(4)
        elif tses[i]["status"] == "disabled":
            colorscheme = curses.color_pair(1)
        elif tses[i]["status"] == "failed":
            colorscheme = curses.color_pair(5)

        # assigned tills
        assigned_tills = list()
        tills = await db.fetch("select id from till where tse_id=$1 order by id", tses[i]["tse_id"])
        for till in tills:
            assigned_tills.append(till["id"])

        # last signctr und transactionnr
        last_order = await db.fetchrow(
            "select tse_signaturenr, tse_transaction from tse_signature where tse_id=$1 and signature_status='done' order by id desc limit 1",
            tses[i]["tse_id"],
        )
        if last_order:
            transactionnr = last_order["tse_transaction"]
            signctr = last_order["tse_signaturenr"]
        else:
            transactionnr = None
            signctr = None

        meters[i].box()
        meters[i].bkgd(" ", colorscheme)
        meters[i].addstr(0, 0, f"name: {tses[i]['tse_name']}")
        meters[i].addstr(1, 1, f"Status: {tses[i]['tse_status']}", colorscheme)
        meters[i].addstr(2, 1, f"Serial: {tses[i]['tse_serial']}", colorscheme)
        meters[i].addstr(3, 1, f"Last Transaction Nr: {transactionnr}, Signature Nr: {signctr}", colorscheme)
        meters[i].addstr(4, 1, f"Assigned Tills: {assigned_tills}", colorscheme)
        meters[i].refresh()


async def window_main(stdscr, db):
    # Clear screen
    stdscr.clear()
    curses.init_pair(1, curses.COLOR_RED, curses.COLOR_BLACK)
    curses.init_pair(2, curses.COLOR_GREEN, curses.COLOR_BLACK)
    curses.init_pair(3, curses.COLOR_GREEN, curses.COLOR_WHITE)
    curses.init_pair(4, curses.COLOR_WHITE, curses.COLOR_GREEN)
    curses.init_pair(5, curses.COLOR_WHITE, curses.COLOR_RED)
    stdscr.nodelay(True)

    LEN_min = 100
    (MAX_LINES, MAX_COLS) = stdscr.getmaxyx()

    if MAX_LINES < (ROW * HEIGHT + 11) or MAX_COLS < (COL * LEN_min + 1):
        stdscr.addstr(0, 0, f"window to small, only {MAX_LINES} x {MAX_COLS}", curses.A_BLINK | curses.color_pair(1))
        stdscr.refresh()
        stdscr.getkey()
        exit(1)

    LEN = MAX_COLS - 1

    meters = []
    tses = await db.fetch("select * from tse order by id")
    # tills = await db.fetch("select * from tse order by tse_id")
    if len(tses) > ROW * COL:
        stdscr.addstr(0, 0, "to many tses", curses.A_BLINK | curses.color_pair(1))
        stdscr.refresh()
        stdscr.getkey()
        exit(1)

    for i in range(len(tses)):
        meters.append(stdscr.subwin(HEIGHT, LEN, 2 + int(i / COL) * HEIGHT, (i % COL) * LEN))
        meters[i].box()
        meters[i].refresh()

    await draw_meters(meters, db)

    status_bar = stdscr.subwin(10, COL * LEN, ROW * HEIGHT, 0)
    add_status_line(status_bar, "started, waiting for data", 0)

    stdscr.refresh()

    keypress = None

    while True:
        keypress = stdscr.getch()
        if keypress == curses.ERR:
            pass
        elif keypress == curses.KEY_RESIZE:
            pass
        else:
            if chr(keypress) == "q":
                break

        await draw_meters(meters, db)

        stdscr.addstr(0, 0, datetime.now().isoformat(timespec="seconds"), curses.color_pair(3))
        stdscr.refresh()
        await asyncio.sleep(2.5)

    return


class TseSwitchover(SubCommand):
    @staticmethod
    def argparse_register(subparser):
        subparser.add_argument("-s", "--show", action="store_true", default=False, help="only show status")
        subparser.add_argument("-n", "--nc", action="store_true", default=False, help="curses interface")
        subparser.add_argument("--disable", action="store_true", default=False, help="disable a failed TSE")
        subparser.add_argument("--tse", type=str, default=None, help="TSE name to disable")

    def __init__(self, args, config: Config, **rest):
        del rest  # unused

        self.config = config
        self.show = args.show
        self.nc = args.nc
        self.tse_to_disable = args.tse
        self.disable = args.disable
        self.db_pool: asyncpg.Pool = None
        # contains event objects for each object that is waiting for new events.

    async def run(self) -> None:
        pool = await create_db_pool(self.config.database)
        self.db_pool = pool

        async with contextlib.AsyncExitStack() as aes:
            psql: Connection = await aes.enter_async_context(pool.acquire())

            if self.nc:
                await wrapper(window_main, self.db_pool)
                return  # program end

            if self.disable:
                if self.tse_to_disable is None:
                    LOGGER.error("No TSE to disable specified")
                    raise ValueError("No TSE to disable specified")
                if ";" in self.tse_to_disable:
                    raise ValueError("Illegal character in TSE name")
                tse = await psql.fetchrow("select * from tse where tse_name=$1", self.tse_to_disable)
                if tse is None:
                    LOGGER.error(f"TSE with name {self.tse_to_disable} not found")
                    raise ValueError
                print("TSE to disable")
                for key, item in tse.items():
                    print(f"{key}: {item}")
                print("-------------------------------------------------------")

                manualfailed = ""

                if tse["tse_status"] != "failed":
                    print(f"TSE is currently in status {tse['tse_status']}")
                    print("Only a TSE in status 'failed' can be disabled")
                    print("Do you want to set the TSE to status 'failed' anyway and then disable it?")
                    manualfailed = input("Type 'yes' in uppercase: ")
                    if manualfailed != "YES":
                        print("Aborting...\n..\n.")
                        return
                    print("will set the TSE to 'failed'. but nothing was done yet. You can still abort.")

                # print assigned tills
                print("These tills are currently assigned to this TSE:\n\n")
                tills = await psql.fetch(
                    "select till.id as id, name, active_user_id, display_name from till join cashier on till.active_user_id=cashier.id where tse_id=$1 order by id",
                    tse["tse_id"],
                )
                for till in tills:
                    print(
                        f"{till['id']:5}:  {till['name']:50}, Logged in user: {till['active_user_id']} {till['display_name']}"
                    )

                print("ALL OF THESE TILLS NEED TO BE LOGGED OUT!")
                input("confirm with enter when done...")

                # check again for logout
                tills = await psql.fetch(
                    "select till.id as id, name, active_user_id, display_name from till join cashier on till.active_user_id=cashier.id where tse_id=$1 order by id",
                    tse["tse_id"],
                )
                still_logged_in_tills = 0
                force_logout = ""
                for till in tills:
                    print(
                        f"{till['id']:5}:  {till['name']:50}, Logged in user: {till['active_user_id']} {till['display_name']}"
                    )
                    if till["active_user_id"] is not None:
                        still_logged_in_tills += 1
                if still_logged_in_tills > 0:
                    print(f"ERROR: There are still {still_logged_in_tills} tills with logged in users!")
                    print("DO YOU WANT TO FORCE A LOGOUT NOW!")
                    force_logout = input("Type 'yes' in uppercase to FORCE A LOGOUT on these tills: ")
                    if force_logout != "YES":
                        print("Cannot switch TSE with still logged in chashiers.")
                        print("Aborting...")
                        return
                    print("Will perform a forced logout of users later, but nothing was done yet. You can still abort.")
                else:
                    print("All cashiers are logged out.")

                # are you really sure?
                print(f"Disabling TSE {self.tse_to_disable}, Serial {tse['tse_serial']}")
                print("THIS CAN NOT BE UNDONE")
                print("DO YOU REALY WANT TO PROCEED?")
                confirmation = input("THIS IS THE LAST CONFIRMATION! Type 'yes' in uppercase: ")
                if confirmation != "YES":
                    print("Aborting...\n..\n.")
                    return

                # disable TSE
                print("setting TSE to disabled")
                if manualfailed == "YES":
                    print("disabeling no matter what state the TSE has")
                    await psql.execute("update tse set tse_status='disabled' where tse_name=$1", self.tse_to_disable)
                else:
                    print("disabeling only if in state failed")
                    await psql.execute(
                        "update tse set tse_status='disabled' where tse_name=$1 and tse_status='failed'",
                        self.tse_to_disable,
                    )

                # check
                tse = await psql.fetchrow("select * from tse where tse_name=$1", self.tse_to_disable)
                if tse["tse_status"] == "disabled":
                    print("SUCCESS: TSE set to 'disabled'")
                else:
                    print("ERROR: could not set TSE to 'disabled', perhaps it was not in state failed")
                    print("Aborting till reasignment")
                    return

                # check login status for tills again to prevent, that somebody has logged in in the meantime
                still_logged_in_tills = 0
                tills = await psql.fetch(
                    "select till.id as id, name, active_user_id, display_name from till join cashier on till.active_user_id=cashier.id where tse_id=$1 order by id",
                    tse["tse_id"],
                )
                for till in tills:
                    print(
                        f"{till['id']:5}:  {till['name']:50}, Logged in user: {till['active_user_id']} {till['display_name']}"
                    )
                    if till["active_user_id"] is not None:
                        still_logged_in_tills += 1
                if still_logged_in_tills > 0:
                    print(f"ERROR: There are still {still_logged_in_tills} tills with logged in users!")
                    print("DO YOU WANT TO FORCE A LOGOUT NOW!")
                    force_logout = input("Type 'yes' in uppercase to FORCE A LOGOUT on these tills NOW: ")
                    if force_logout != "YES":
                        print(
                            "Cannot switch TSE with still logged in chashiers, but TSE was already set to 'disabled'."
                        )
                        print("Aborting...")
                        return
                    print("Will perform a forced logout of users later, but nothing was done yet. You can still abort.")

                # force logout
                if force_logout == "YES":
                    print("Forcing logout of cashiers for the assigned tills...")
                    force_logout_result = await psql.fetch(
                        "update till set active_user_id = null, active_user_role_id = null where tse_id = $1 returning id",
                        tse["tse_id"],
                    )
                    if force_logout_result is not None:
                        print("SUCCESS: Forced logout of still logged in cashiers.")
                    else:
                        print("?????: No forced logout necessary because no tills assigned???.")

                # reset till to tse assignment
                print("Resetting till to TSE assignment")
                await psql.execute("update till set tse_id=NULL where tse_id=$1", tse["tse_id"])

                # check
                print("checking...")
                tills = await psql.fetch("select id, name from till where tse_id=$1 order by id", tse["tse_id"])
                if tills:
                    print("ERROR: There are still tills assigned to this TSE:")
                    for till in tills:
                        print(f"{till['id']:5}:  {till['name']:50}")
                    print("Aborted, need manual checking of status")
                    return
                elif not tills:
                    print("SUCCESS: No more tills are assigned to this TSE")
                else:
                    raise RuntimeError("Error, this should not happen")

                print("done")

            if self.show:
                tses = await psql.fetch("select * from tse")
                print("TSE master data:")
                for tse in tses:
                    for key, item in tse.items():
                        print(f"{key}: {item}")
                        print("-------------------------------------------------------")
                    print("=======================================================")

            LOGGER.info("exiting")

        await pool.close()
