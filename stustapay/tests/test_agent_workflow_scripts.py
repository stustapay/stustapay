from __future__ import annotations

import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parents[2] / ".agents" / "scripts"
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

import changed_surfaces  # noqa: E402
import required_checks  # noqa: E402


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


def test_changed_surfaces_marks_current_repo_config_and_tooling_paths() -> None:
    report = changed_surfaces.analyze_paths(
        [
            "deploy/environments/production.env",
            ".github/workflows/web.yaml",
            "server_azure.yaml",
            "web/tsconfig.base.json",
            "app/settings.gradle",
        ]
    )

    assert report.surfaces == ["android", "config", "tooling", "web"]
    assert report.web_targets == ["administration", "customerportal"]
    assert report.requires_contract_sync is True


def test_required_checks_calls_out_current_config_surfaces() -> None:
    report = required_checks.build_checks(
        [
            "deploy/common.env.example",
            "pretix/pretix.cfg",
            "debian/stustapay.install",
        ]
    )

    assert report.commands == []
    assert report.manual_checks == [
        "Inspect config, deploy, Docker, nginx, Pretix, and Debian diffs manually for environment and secret drift."
    ]
