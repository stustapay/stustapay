#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass

from changed_surfaces import add_path_arguments, analyze_paths, resolve_paths


@dataclass
class ChecksReport:
    commands: list[str]
    manual_checks: list[str]
    report: dict


def build_checks(paths: list[str]) -> ChecksReport:
    surface_report = analyze_paths(paths)
    commands: list[str] = []
    manual_checks: list[str] = []

    if surface_report.requires_contract_sync:
        commands.append("make sync-contract")

    if "backend" in surface_report.surfaces:
        commands.append("make verify-backend")

    if "web" in surface_report.surfaces:
        if "administration" in surface_report.web_targets:
            commands.append("make verify-web-administration")
        if "customerportal" in surface_report.web_targets:
            commands.append("make verify-web-customerportal")
        manual_checks.append("Run browser QA for any touched web flow before shipping.")

    if "android" in surface_report.surfaces:
        commands.append("make verify-android")
        manual_checks.append("If NFC, SumUp, or terminal flows changed, keep a manual device checklist in `.agents/state/qa.md`.")

    if "config" in surface_report.surfaces:
        manual_checks.append("Inspect config, deploy, Docker, nginx, Pretix, and Debian diffs manually for environment and secret drift.")

    if "tooling" in surface_report.surfaces:
        manual_checks.append("Review developer and CI workflow changes for command breakage and update docs if behavior changed.")

    if "docs" in surface_report.surfaces:
        manual_checks.append("Confirm docs still match the shipped developer workflow.")

    return ChecksReport(
        commands=commands,
        manual_checks=manual_checks,
        report=asdict(surface_report),
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Recommend StuStaPay verification commands for changed files.")
    add_path_arguments(parser)
    parser.add_argument(
        "--from-git",
        action="store_true",
        help="Deprecated no-op. Current changes are read from git automatically when --files is omitted.",
    )
    parser.add_argument("--output", choices=("text", "json"), default="text")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    files = resolve_paths(files=args.files, scope="staged" if args.staged else args.scope)

    report = build_checks(files)

    if args.output == "json":
        print(json.dumps(asdict(report), indent=2))
        return 0

    print("Commands:")
    for command in report.commands:
        print(f"- {command}")

    if report.manual_checks:
        print("\nManual checks:")
        for item in report.manual_checks:
            print(f"- {item}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
