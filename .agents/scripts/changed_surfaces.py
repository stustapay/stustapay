#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
from dataclasses import asdict, dataclass
from pathlib import PurePosixPath
from typing import Iterable


@dataclass
class SurfaceReport:
    paths: list[str]
    surfaces: list[str]
    web_targets: list[str]
    requires_contract_sync: bool
    notes: list[str]


GIT_SCOPES = ("all", "staged", "unstaged")


def _normalize(path: str) -> str:
    normalized = PurePosixPath(path.strip()).as_posix()
    while normalized.startswith("./"):
        normalized = normalized[2:]
    return normalized


def _run_git_paths(cmd: list[str]) -> list[str]:
    proc = subprocess.run(
        cmd,
        check=True,
        text=True,
        capture_output=True,
    )
    return [line for line in proc.stdout.splitlines() if line.strip()]


def add_path_arguments(parser: argparse.ArgumentParser) -> argparse.ArgumentParser:
    parser.add_argument("--files", nargs="*", help="Explicit files to analyze.")
    parser.add_argument(
        "--scope",
        choices=GIT_SCOPES,
        default="all",
        help="Git change scope to analyze when --files is omitted. 'unstaged' includes untracked files.",
    )
    parser.add_argument(
        "--staged",
        action="store_true",
        help="Deprecated alias for --scope staged.",
    )
    return parser


def _resolve_scope(args: argparse.Namespace) -> str:
    return "staged" if getattr(args, "staged", False) else getattr(args, "scope", "all")


def load_paths_from_git(scope: str = "all") -> list[str]:
    if scope not in GIT_SCOPES:
        raise ValueError(f"Unsupported git scope: {scope}")

    paths: set[str] = set()

    if scope in {"all", "staged"}:
        paths.update(_run_git_paths(["git", "diff", "--cached", "--name-only"]))

    if scope in {"all", "unstaged"}:
        paths.update(_run_git_paths(["git", "diff", "--name-only"]))
        paths.update(_run_git_paths(["git", "ls-files", "--others", "--exclude-standard"]))

    return sorted(paths)


def resolve_paths(files: list[str] | None = None, scope: str = "all") -> list[str]:
    if files:
        return [_normalize(path) for path in files]
    return [_normalize(path) for path in load_paths_from_git(scope=scope)]


def _load_paths(args: argparse.Namespace) -> list[str]:
    if args.files:
        return [_normalize(path) for path in args.files]
    return resolve_paths(scope=_resolve_scope(args))


def analyze_paths(paths: Iterable[str]) -> SurfaceReport:
    normalized = sorted({_normalize(path) for path in paths if path.strip()})
    surfaces: set[str] = set()
    web_targets: set[str] = set()
    notes: list[str] = []
    requires_contract_sync = False

    for path in normalized:
        if path.startswith("stustapay/") or path == "pyproject.toml":
            surfaces.add("backend")

        if path.startswith("stustapay/administration/") or path.startswith("stustapay/customer_portal/") or path.startswith(
            "stustapay/terminalserver/"
        ):
            requires_contract_sync = True

        if path.startswith("web/apps/administration/"):
            surfaces.add("web")
            web_targets.add("administration")

        if path.startswith("web/apps/customerportal/"):
            surfaces.add("web")
            web_targets.add("customerportal")

        if path.startswith("web/libs/") or path in {
            "web/.eslintrc.json",
            "web/nx.json",
            "web/package-lock.json",
            "web/package.json",
            "web/tsconfig.base.json",
        }:
            surfaces.add("web")
            web_targets.update({"administration", "customerportal"})

        if path.startswith("app/"):
            surfaces.add("android")

        if path.startswith("api/"):
            surfaces.add("openapi")
            requires_contract_sync = True

        if path.startswith("app/api/") or path == "app/build.gradle":
            requires_contract_sync = True

        if path.startswith(("etc/", "docker/", "debian/", "pretix/")) or path in {"server_local.yaml", "config.yaml"}:
            surfaces.add("config")

        if path.startswith("tools/") or path.startswith(".agents/") or path in {"AGENTS.md", "Makefile"}:
            surfaces.add("tooling")

        if path.startswith("docs/") or path == "README.md":
            surfaces.add("docs")

    if requires_contract_sync:
        notes.append("Backend contract or generated client surface touched. Run `make sync-contract` and review generated diffs separately.")

    if web_targets == {"administration", "customerportal"}:
        notes.append("Shared web code changed. Verify both web applications.")

    if "android" in surfaces and requires_contract_sync:
        notes.append("Android API client may need regeneration via `cd app && ./gradlew api`.")

    return SurfaceReport(
        paths=normalized,
        surfaces=sorted(surfaces),
        web_targets=sorted(web_targets),
        requires_contract_sync=requires_contract_sync,
        notes=notes,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summarize impacted StuStaPay surfaces from changed files.")
    add_path_arguments(parser)
    parser.add_argument("--output", choices=("text", "json"), default="text")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    report = analyze_paths(_load_paths(args))

    if args.output == "json":
        print(json.dumps(asdict(report), indent=2))
        return 0

    print("Paths:")
    for path in report.paths:
        print(f"- {path}")

    print("\nSurfaces:")
    for surface in report.surfaces:
        print(f"- {surface}")

    if report.web_targets:
        print("\nWeb targets:")
        for target in report.web_targets:
            print(f"- {target}")

    print(f"\nRequires contract sync: {'yes' if report.requires_contract_sync else 'no'}")

    if report.notes:
        print("\nNotes:")
        for note in report.notes:
            print(f"- {note}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
