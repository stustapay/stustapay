from __future__ import annotations

import argparse
import os
import signal
import subprocess
import sys
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


@dataclass
class ProcessSpec:
    name: str
    cmd: List[str]
    cwd: Optional[Path] = None


def build_processes(
    config_path: Path,
    backend_only: bool,
    web_only: bool,
    include_workers: bool,
) -> List[ProcessSpec]:
    processes: List[ProcessSpec] = []

    if not web_only:
        base_backend_cmd = [
            sys.executable,
            "-m",
            "stustapay",
            "-c",
            str(config_path),
            "-vvv",
        ]

        processes.extend(
            [
                ProcessSpec(
                    name="terminalserver-api",
                    cmd=base_backend_cmd + ["terminalserver-api"],
                ),
                ProcessSpec(
                    name="administration-api",
                    cmd=base_backend_cmd + ["administration-api"],
                ),
                ProcessSpec(
                    name="customerportal-api",
                    cmd=base_backend_cmd + ["customerportal-api"],
                ),
            ]
        )

        if include_workers:
            processes.extend(
                [
                    ProcessSpec(
                        name="payment-processor",
                        cmd=base_backend_cmd + ["payment-processor"],
                    ),
                    ProcessSpec(
                        name="ticket-processor",
                        cmd=base_backend_cmd + ["ticket-processor"],
                    ),
                ]
            )

    if not backend_only:
        web_dir = Path(__file__).resolve().parent.parent / "web"
        if not (web_dir / "package.json").is_file():
            print(
                f"[dev] web directory at {web_dir} does not look initialised "
                "(missing package.json). Skipping web frontend.",
                file=sys.stderr,
            )
        else:
            web_nx_bin = web_dir / "node_modules" / ".bin" / "nx"
            if not web_nx_bin.is_file():
                print(
                    "[dev] Web install is incomplete (missing node_modules/.bin/nx). "
                    "Fix: run `cd web && npm ci` from the repo root, then retry.",
                    file=sys.stderr,
                )
                sys.exit(1)
            processes.append(
                ProcessSpec(
                    name="web-admin",
                    cmd=["npm", "run", "start"],
                    cwd=web_dir,
                )
            )

    return processes


def stream_output(proc: subprocess.Popen[str], name: str) -> None:
    assert proc.stdout is not None
    for line in proc.stdout:
        print(f"[{name}] {line.rstrip()}")


def run_processes(processes: List[ProcessSpec]) -> int:
    procs: List[subprocess.Popen[str]] = []
    threads: List[threading.Thread] = []

    try:
        for spec in processes:
            print(f"[dev] starting {spec.name}: {' '.join(spec.cmd)}")
            proc = subprocess.Popen(
                spec.cmd,
                cwd=str(spec.cwd) if spec.cwd is not None else None,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            procs.append(proc)

            t = threading.Thread(
                target=stream_output,
                args=(proc, spec.name),
                daemon=True,
            )
            t.start()
            threads.append(t)

        # Wait for first process to exit; if any exits with non-zero,
        # we shut everything down.
        exit_code = 0
        while procs:
            for proc in list(procs):
                ret = proc.poll()
                if ret is not None:
                    if ret != 0:
                        exit_code = ret
                        print(
                            f"[dev] process {proc.args} exited with code {ret}, "
                            "stopping all others.",
                            file=sys.stderr,
                        )
                    procs.remove(proc)
            if procs:
                try:
                    # Avoid busy loop.
                    signal.pause()
                except AttributeError:
                    # Windows does not have signal.pause; fall back to join timeout.
                    for t in threads:
                        t.join(timeout=0.1)
        return exit_code
    except KeyboardInterrupt:
        print("[dev] received KeyboardInterrupt, terminating processes...")
        return 0
    finally:
        for proc in procs:
            if proc.poll() is None:
                try:
                    proc.terminate()
                except OSError:
                    pass
        for proc in procs:
            try:
                proc.wait(timeout=10)
            except Exception:
                try:
                    proc.kill()
                except OSError:
                    pass


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Start StuStaPay backend services and web admin for local development.",
    )
    parser.add_argument(
        "--config-path",
        "-c",
        type=Path,
        default=Path("config.yaml"),
        help="Path to the StuStaPay config.yaml (default: ./config.yaml).",
    )
    parser.add_argument(
        "--backend-only",
        action="store_true",
        help="Start only backend services (no web frontend).",
    )
    parser.add_argument(
        "--web-only",
        action="store_true",
        help="Start only the web admin frontend.",
    )
    parser.add_argument(
        "--include-workers",
        action="store_true",
        help="Also start background workers (payment-processor, ticket-processor).",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)

    config_path: Path = args.config_path
    if not config_path.is_file():
        print(
            "[dev] config file not found at "
            f"{config_path}. Please create one (e.g. by copying etc/config.yaml) "
            "and adjust it for your local setup.",
            file=sys.stderr,
        )
        return 1

    # Ensure we run from the repo root so relative paths behave as expected.
    repo_root = Path(__file__).resolve().parent.parent
    os.chdir(repo_root)

    processes = build_processes(
        config_path=config_path,
        backend_only=args.backend_only,
        web_only=args.web_only,
        include_workers=args.include_workers,
    )
    if not processes:
        print(
            "[dev] nothing to start (did you specify both --backend-only and "
            "--web-only without any matching services?).",
            file=sys.stderr,
        )
        return 1

    print("[dev] starting development environment. Press Ctrl+C to stop.")
    return run_processes(processes)


if __name__ == "__main__":
    raise SystemExit(main())

