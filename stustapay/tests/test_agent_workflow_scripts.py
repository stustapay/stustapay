from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest


SCRIPT_DIR = Path(__file__).resolve().parents[2] / ".agents" / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import changed_surfaces  # noqa: E402
import required_checks  # noqa: E402
import workflow_bootstrap  # noqa: E402


def test_changed_surfaces_marks_shared_web_and_contract_sync() -> None:
    report = changed_surfaces.analyze_paths(
        [
            "stustapay/terminalserver/api.py",
            "web/libs/models/src/index.ts",
            "app/app/src/main/java/de/stustapay/stustapay/ui/Main.kt",
        ]
    )

    assert report.surfaces == ["android", "backend", "web"]
    assert report.web_targets == ["administration", "customerportal"]
    assert report.requires_contract_sync is True


def test_required_checks_selects_administration_only() -> None:
    report = required_checks.build_checks(
        [
            "web/apps/administration/src/app/routes/dashboard.tsx",
        ]
    )

    assert report.commands == ["make verify-web-administration"]
    assert report.manual_checks == ["Run browser QA for any touched web flow before shipping."]


def test_required_checks_adds_sync_for_generated_contract_files() -> None:
    report = required_checks.build_checks(
        [
            "api/terminalserver.json",
            "app/api/src/main/kotlin/de/stustapay/api/apis/UserApi.kt",
        ]
    )

    assert report.commands == ["make sync-contract", "make verify-android"]


def test_changed_surfaces_keeps_dot_paths_for_tooling() -> None:
    report = changed_surfaces.analyze_paths(
        [
            ".agents/scripts/changed_surfaces.py",
        ]
    )

    assert report.surfaces == ["tooling"]


def test_load_paths_from_git_defaults_to_all_scopes(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = {
        ("git", "diff", "--cached", "--name-only"): ["staged.py", "shared.py"],
        ("git", "diff", "--name-only"): ["unstaged.py", "shared.py"],
        ("git", "ls-files", "--others", "--exclude-standard"): ["new.py"],
    }

    def fake_run_git_paths(cmd: list[str]) -> list[str]:
        return responses[tuple(cmd)]

    monkeypatch.setattr(changed_surfaces, "_run_git_paths", fake_run_git_paths)

    assert changed_surfaces.load_paths_from_git() == ["new.py", "shared.py", "staged.py", "unstaged.py"]


def test_load_paths_from_git_honors_explicit_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    responses = {
        ("git", "diff", "--cached", "--name-only"): ["staged.py"],
        ("git", "diff", "--name-only"): ["unstaged.py"],
        ("git", "ls-files", "--others", "--exclude-standard"): ["new.py"],
    }

    def fake_run_git_paths(cmd: list[str]) -> list[str]:
        return responses[tuple(cmd)]

    monkeypatch.setattr(changed_surfaces, "_run_git_paths", fake_run_git_paths)

    assert changed_surfaces.load_paths_from_git(scope="staged") == ["staged.py"]
    assert changed_surfaces.load_paths_from_git(scope="unstaged") == ["new.py", "unstaged.py"]


def test_changed_surfaces_marks_shared_web_config_as_both_targets() -> None:
    report = changed_surfaces.analyze_paths(
        [
            "web/tsconfig.base.json",
            "web/.eslintrc.json",
        ]
    )

    assert report.surfaces == ["web"]
    assert report.web_targets == ["administration", "customerportal"]


def test_required_checks_are_unique_and_ordered() -> None:
    report = required_checks.build_checks(
        [
            "stustapay/terminalserver/api.py",
            "web/libs/models/src/index.ts",
            "app/app/src/main/java/de/stustapay/stustapay/ui/Main.kt",
            "app/api/src/main/kotlin/de/stustapay/api/apis/UserApi.kt",
        ]
    )

    assert report.commands == [
        "make sync-contract",
        "make verify-backend",
        "make verify-web-administration",
        "make verify-web-customerportal",
        "make verify-android",
    ]


def test_workflow_bootstrap_builds_intake_markdown() -> None:
    report = workflow_bootstrap.build_report(
        stage="intake",
        files=["stustapay/terminalserver/api.py", "web/libs/models/src/index.ts"],
    )

    assert report.state_path.endswith(".agents/state/plan.md")
    assert report.surface_report["requires_contract_sync"] is True
    assert "# Plan" in report.content
    assert "## Contract and Generated Artifacts" in report.content
    assert "make sync-contract" in report.content


def test_workflow_bootstrap_cli_outputs_text_json_and_markdown(capsys: pytest.CaptureFixture[str]) -> None:
    assert workflow_bootstrap.main(["--stage", "review", "--files", "web/apps/administration/src/app/routes/dashboard.tsx"]) == 0
    text_output = capsys.readouterr().out
    assert "Stage: review" in text_output
    assert "Scaffold:" in text_output

    assert (
        workflow_bootstrap.main(
            [
                "--stage",
                "qa",
                "--output",
                "json",
                "--files",
                "web/apps/administration/src/app/routes/dashboard.tsx",
            ]
        )
        == 0
    )
    json_output = json.loads(capsys.readouterr().out)
    assert json_output["stage"] == "qa"
    assert json_output["state_path"].endswith(".agents/state/qa.md")

    assert (
        workflow_bootstrap.main(
            [
                "--stage",
                "ship",
                "--output",
                "markdown",
                "--files",
                "web/apps/administration/src/app/routes/dashboard.tsx",
            ]
        )
        == 0
    )
    markdown_output = capsys.readouterr().out
    assert markdown_output.startswith("# Ship")
    assert "## Checks Run" in markdown_output


def test_workflow_bootstrap_write_state_uses_stage_target(tmp_path: Path) -> None:
    report = workflow_bootstrap.build_report(stage="qa", files=["web/apps/administration/src/app/routes/dashboard.tsx"])

    written_path = workflow_bootstrap.write_state_file(report, state_dir=tmp_path)

    assert written_path == tmp_path / "qa.md"
    assert written_path.read_text(encoding="utf-8").startswith("# QA")


def test_agent_workflow_docs_stay_in_sync_with_repo_local_skills_and_commands() -> None:
    docs_text = (Path(__file__).resolve().parents[2] / "docs" / "agent-workflow.md").read_text(encoding="utf-8")
    agents_text = (Path(__file__).resolve().parents[2] / "AGENTS.md").read_text(encoding="utf-8")
    makefile_text = (Path(__file__).resolve().parents[2] / "Makefile").read_text(encoding="utf-8")
    skill_names = sorted(path.parent.name for path in (Path(__file__).resolve().parents[2] / ".agents" / "skills").glob("*/SKILL.md"))

    for skill_name in skill_names:
        assert f"`{skill_name}`" in docs_text
        assert skill_name in agents_text

    for command in [
        "make verify-backend",
        "make verify-web-administration",
        "make verify-web-customerportal",
        "make verify-android",
        "make sync-contract",
    ]:
        assert command in docs_text
        assert command.split()[-1].rstrip() in makefile_text
