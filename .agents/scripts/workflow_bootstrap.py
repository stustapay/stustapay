#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

from changed_surfaces import add_path_arguments, analyze_paths, resolve_paths
from required_checks import build_checks


REPO_ROOT = Path(__file__).resolve().parents[2]
STATE_DIR = REPO_ROOT / ".agents" / "state"
STAGE_TO_STATE_FILE = {
    "intake": "plan.md",
    "review": "review.md",
    "qa": "qa.md",
    "ship": "ship.md",
}


@dataclass
class BootstrapReport:
    stage: str
    paths: list[str]
    state_path: str
    surface_report: dict
    checks_report: dict
    content: str


def _render_list(items: list[str], fallback: str) -> list[str]:
    return items or [fallback]


def render_stage_markdown(stage: str, report: BootstrapReport) -> str:
    surface_report = report.surface_report
    checks_report = report.checks_report
    surfaces = ", ".join(surface_report["surfaces"]) if surface_report["surfaces"] else "none identified"
    web_targets = ", ".join(surface_report["web_targets"]) if surface_report["web_targets"] else "none"
    paths = _render_list(report.paths, "No explicit paths detected yet.")
    notes = _render_list(surface_report["notes"], "No extra surface notes.")
    commands = _render_list(checks_report["commands"], "No automated verification commands identified yet.")
    manual_checks = _render_list(checks_report["manual_checks"], "No manual follow-up identified yet.")

    if stage == "intake":
        return "\n".join(
            [
                "# Plan",
                "",
                "## Goal",
                "- ",
                "",
                "## Acceptance Criteria",
                "- ",
                "",
                "## Affected Surfaces",
                f"- Surfaces: {surfaces}",
                f"- Web targets: {web_targets}",
                *[f"- Path: {path}" for path in paths],
                "",
                "## Contract and Generated Artifacts",
                f"- Contract sync required: {'yes' if surface_report['requires_contract_sync'] else 'no'}",
                "- Expected generated artifacts: ",
                *[f"- Note: {note}" for note in notes],
                "",
                "## Required Checks",
                *[f"- {command}" for command in commands],
                "",
                "## Open Questions",
                "- ",
                "",
                "## Manual Follow-up",
                *[f"- {item}" for item in manual_checks],
            ]
        )

    if stage == "review":
        return "\n".join(
            [
                "# Review",
                "",
                "## Findings",
                "- ",
                "",
                "## Generated Artifact Notes",
                f"- Contract sync required: {'yes' if surface_report['requires_contract_sync'] else 'no'}",
                *[f"- {note}" for note in notes],
                "",
                "## Risk Areas",
                f"- Touched surfaces: {surfaces}",
                f"- Web targets: {web_targets}",
                *[f"- Path: {path}" for path in paths],
                "",
                "## Missing Validation",
                *[f"- Command: {command}" for command in commands],
                *[f"- Manual: {item}" for item in manual_checks],
            ]
        )

    if stage == "qa":
        return "\n".join(
            [
                "# QA",
                "",
                "## Executed Checks",
                *[f"- {command}" for command in commands],
                "",
                "## Skipped Checks",
                "- ",
                "",
                "## Manual Verification",
                *[f"- {item}" for item in manual_checks],
                "",
                "## Remaining Risks",
                *[f"- {note}" for note in notes],
            ]
        )

    if stage == "ship":
        return "\n".join(
            [
                "# Ship",
                "",
                "## Release Summary",
                f"- Touched surfaces: {surfaces}",
                f"- Web targets: {web_targets}",
                "",
                "## Checks Run",
                *[f"- {command}" for command in commands],
                "",
                "## Checks Not Run",
                "- ",
                "",
                "## Generated Artifacts",
                f"- Contract sync required: {'yes' if surface_report['requires_contract_sync'] else 'no'}",
                *[f"- {note}" for note in notes],
                "",
                "## Manual Follow-up",
                *[f"- {item}" for item in manual_checks],
            ]
        )

    raise ValueError(f"Unsupported stage: {stage}")


def render_stage_text(stage: str, report: BootstrapReport) -> str:
    checks_report = report.checks_report
    surface_report = report.surface_report

    lines = [
        f"Stage: {stage}",
        f"State file: {report.state_path}",
        "Paths:",
        *[f"- {path}" for path in _render_list(report.paths, "No explicit paths detected yet.")],
        "Surfaces:",
        *[f"- {surface}" for surface in _render_list(surface_report["surfaces"], "none identified")],
    ]

    if surface_report["web_targets"]:
        lines.extend(["Web targets:", *[f"- {target}" for target in surface_report["web_targets"]]])

    lines.extend(
        [
            f"Contract sync required: {'yes' if surface_report['requires_contract_sync'] else 'no'}",
            "Commands:",
            *[f"- {command}" for command in _render_list(checks_report["commands"], "No automated verification commands identified yet.")],
            "Manual checks:",
            *[f"- {item}" for item in _render_list(checks_report["manual_checks"], "No manual follow-up identified yet.")],
        ]
    )

    if surface_report["notes"]:
        lines.extend(["Notes:", *[f"- {note}" for note in surface_report["notes"]]])

    lines.extend(["", "Scaffold:", report.content])
    return "\n".join(lines)


def build_report(stage: str, files: list[str] | None = None, scope: str = "all") -> BootstrapReport:
    paths = resolve_paths(files=files, scope=scope)
    surface_report = analyze_paths(paths)
    checks_report = build_checks(paths)
    state_path = str(STATE_DIR / STAGE_TO_STATE_FILE[stage])
    report = BootstrapReport(
        stage=stage,
        paths=paths,
        state_path=state_path,
        surface_report=asdict(surface_report),
        checks_report=asdict(checks_report),
        content="",
    )
    report.content = render_stage_markdown(stage, report)
    return report


def write_state_file(report: BootstrapReport, state_dir: Path = STATE_DIR) -> Path:
    path = state_dir / STAGE_TO_STATE_FILE[report.stage]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(report.content + "\n", encoding="utf-8")
    return path


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate stage-aware StuStaPay workflow scaffolding.")
    parser.add_argument("--stage", choices=tuple(STAGE_TO_STATE_FILE), required=True)
    add_path_arguments(parser)
    parser.add_argument("--output", choices=("text", "json", "markdown"), default="text")
    parser.add_argument("--write-state", action="store_true", help="Write the rendered scaffold to the matching .agents/state file.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    scope = "staged" if args.staged else args.scope
    report = build_report(stage=args.stage, files=args.files, scope=scope)

    if args.write_state:
        written_path = write_state_file(report)
        report.state_path = str(written_path)

    if args.output == "json":
        print(json.dumps(asdict(report), indent=2))
        return 0

    if args.output == "markdown":
        print(report.content)
        return 0

    print(render_stage_text(args.stage, report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
