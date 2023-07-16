import asyncio
import logging
import os
import signal
import sys
import traceback
from typing import Awaitable, Callable, Optional


# convenience infinity.
INF = float("inf")

LOGGER = logging.getLogger(__name__)


def _to_string_nullable(t) -> Optional[str]:
    return str(t) if t is not None else None


def log_setup(setting: int, default=1):
    """
    Perform setup for the logger.
    Run before any logging.log thingy is called.

    if setting is 0: the default is used, which is WARNING.
    else: setting + default is used.
    """

    levels = (
        logging.ERROR,
        logging.WARNING,
        logging.INFO,
        logging.DEBUG,
        logging.NOTSET,
    )

    factor = clamp(default + setting, 0, len(levels) - 1)
    level = levels[factor]

    logging.basicConfig(level=level, format="[%(asctime)s] %(message)s")
    logging.captureWarnings(True)


def clamp(number: int, smallest: int, largest: int) -> int:
    """return number but limit it to the inclusive given value range"""
    return max(smallest, min(number, largest))


async def run_as_fg_process(args, **kwargs):
    """
    the "correct" way of spawning a new subprocess:
    signals like C-c must only go
    to the child process, and not to this python.

    the args are the same as subprocess.Popen

    returns Popen().wait() value

    Some side-info about "how ctrl-c works":
    https://unix.stackexchange.com/a/149756/1321

    fun fact: this function took a whole night
              to be figured out.
    """

    # import here to only use the dependency if really necessary (not available on Windows)
    import termios

    old_pgrp = os.tcgetpgrp(sys.stdin.fileno())
    old_attr = termios.tcgetattr(sys.stdin.fileno())

    user_preexec_fn = kwargs.pop("preexec_fn", None)

    def new_pgid():
        if user_preexec_fn:
            user_preexec_fn()

        # set a new process group id
        os.setpgid(os.getpid(), os.getpid())

        # generally, the child process should stop itself
        # before exec so the parent can set its new pgid.
        # (setting pgid has to be done before the child execs).
        # however, Python 'guarantee' that `preexec_fn`
        # is run before `Popen` returns.
        # this is because `Popen` waits for the closure of
        # the error relay pipe '`errpipe_write`',
        # which happens at child's exec.
        # this is also the reason the child can't stop itself
        # in Python's `Popen`, since the `Popen` call would never
        # terminate then.
        # `os.kill(os.getpid(), signal.SIGSTOP)`

    try:
        # fork the child
        child = await asyncio.create_subprocess_exec(*args, preexec_fn=new_pgid, **kwargs)

        # we can't set the process group id from the parent since the child
        # will already have exec'd. and we can't SIGSTOP it before exec,
        # see above.
        # `os.setpgid(child.pid, child.pid)`

        # set the child's process group as new foreground
        os.tcsetpgrp(sys.stdin.fileno(), child.pid)
        # revive the child,
        # because it may have been stopped due to SIGTTOU or
        # SIGTTIN when it tried using stdout/stdin
        # after setpgid was called, and before we made it
        # forward process by tcsetpgrp.
        os.kill(child.pid, signal.SIGCONT)

        # wait for the child to terminate
        ret = await child.wait()

    finally:
        # we have to mask SIGTTOU because tcsetpgrp
        # raises SIGTTOU to all current background
        # process group members (i.e. us) when switching tty's pgrp
        # it we didn't do that, we'd get SIGSTOP'd
        hdlr = signal.signal(signal.SIGTTOU, signal.SIG_IGN)
        # make us tty's foreground again
        os.tcsetpgrp(sys.stdin.fileno(), old_pgrp)
        # now restore the handler
        signal.signal(signal.SIGTTOU, hdlr)
        # restore terminal attributes
        termios.tcsetattr(sys.stdin.fileno(), termios.TCSADRAIN, old_attr)

    return ret


async def run_task_protected(task: Awaitable, name: str, on_exit: Optional[Callable] = None):
    LOGGER.info(f"Task {name} started")
    try:
        await task
    except Exception:
        LOGGER.error(f"{name} failed\n{traceback.format_exc()}")
    finally:
        LOGGER.info(f"Task {name} STOPPED")
        if on_exit is not None:
            on_exit()


def create_task_protected(task: Awaitable, name: str, on_exit: Optional[Callable] = None):
    return asyncio.create_task(run_task_protected(task, name, on_exit), name=name)


HANDLED_SIGNALS = (
    signal.SIGINT,  # Unix signal 2. Sent by Ctrl+C.
    signal.SIGTERM,  # Unix signal 15. Sent by `kill <pid>`.
)


def setup_signal_handlers(loop: asyncio.AbstractEventLoop, callback):
    for sig in HANDLED_SIGNALS:
        loop.add_signal_handler(sig, callback)
        signal.signal(sig, callback)


def cancel_all_running_tasks():
    tasks = asyncio.all_tasks()
    # current = asyncio.current_task()
    # tasks.remove(current)
    for task in tasks:
        task.cancel()
