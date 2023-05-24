import contextlib

# import functools
import logging

import asyncpg
import asyncio

from ..core.subcommand import SubCommand
from .config import Config

from stustapay.core.database import create_db_pool

from curses import wrapper
import curses
from datetime import datetime

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
    tses = await db.fetch("select * from tse order by tse_id")
    for i in range(len(tses)):
        meters[i].clear()
        if tses[i]["tse_status"] == "new":
            colorscheme = curses.color_pair(2)
        elif tses[i]["tse_status"] == "active":
            colorscheme = curses.color_pair(4)
        elif tses[i]["tse_status"] == "disabled":
            colorscheme = curses.color_pair(1)
        elif tses[i]["tse_status"] == "failed":
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
    tses = await db.fetch("select * from tse order by tse_id")
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
            psql: asyncpg.Connection = await aes.enter_async_context(pool.acquire())

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
                    print("Do you want to set the TSE to status failed anyway and then disable it")
                    manualfailed = input("Type 'yes' in uppercase: ")
                    if manualfailed != "YES":
                        print("Aborting...\n..\n.")
                        return
                    print("setting TSE to failed")
                    await psql.execute("update tse set tse_status='failed' where tse_name=$1", self.tse_to_disable)

                # print assigned tills
                print("These tills are currently assigned to this TSE:\n\n")
                tills = await psql.fetch("select id, name from till where tse_id=$1 order by id", tse["tse_id"])
                for till in tills:
                    print(f"{till['id']:5}:  {till['name']:50}")

                print("ALL OF THESE TILLS NEED TO BE LOGGED OUT!")
                input("confirm with enter when ready...")
                # are you really sure?
                print(f"Disabling TSE {self.tse_to_disable}, Serial {tse['tse_serial']}")
                print("THIS CAN NOT BE UNDONE")
                print("DO YOU REALY WANT TO PROCEED?")
                confirmation = input("This is the last confirmation! Type 'yes' in uppercase: ")
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
                    print("SUCCESS: TSE set to disabled")
                else:
                    print("ERROR: could not set TSE to disabled, perhaps it was not in state failed")
                    print("Aborting till reasignment")
                    return

                # reset till to tse assignment
                print("resetting till to TSE assignment")
                await psql.execute("update till set tse_id=NULL where tse_id=$1", tse["tse_id"])

                # check
                print("checking...")
                tills = await psql.fetch("select id, name from till where tse_id=$1 order by id", tse["tse_id"])
                if tills:
                    print("there are still tills assigned to this TSE:")
                    for till in tills:
                        print(f"{till['id']:5}:  {till['name']:50}")
                        print("Aborted")
                        return
                elif not tills:
                    print("success, no more tills are assigned to this TSE")
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
