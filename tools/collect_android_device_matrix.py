#!/usr/bin/env python3
"""Collect baseline Android device facts for the OEM Wi-Fi test matrix."""

from __future__ import annotations

import argparse
import csv
import io
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


DEVICE_MATRIX_COLUMNS = [
    "serial",
    "manufacturer",
    "brand",
    "model",
    "device",
    "product",
    "android_version",
    "sdk",
    "build_id",
    "display_id",
    "fingerprint",
    "security_patch",
    "enrollment_mode",
    "vendor_stack",
    "wifi_add_result",
    "wifi_update_result",
    "wifi_remove_result",
    "reboot_required",
    "reenrollment_required",
    "user_confirmation_required",
    "notes",
]

PROP_KEYS = {
    "manufacturer": "ro.product.manufacturer",
    "brand": "ro.product.brand",
    "model": "ro.product.model",
    "device": "ro.product.device",
    "product": "ro.product.name",
    "android_version": "ro.build.version.release",
    "sdk": "ro.build.version.sdk",
    "build_id": "ro.build.id",
    "display_id": "ro.build.display.id",
    "fingerprint": "ro.build.fingerprint",
    "security_patch": "ro.build.version.security_patch",
}


@dataclass
class DeviceRecord:
    serial: str
    manufacturer: str = ""
    brand: str = ""
    model: str = ""
    device: str = ""
    product: str = ""
    android_version: str = ""
    sdk: str = ""
    build_id: str = ""
    display_id: str = ""
    fingerprint: str = ""
    security_patch: str = ""
    enrollment_mode: str = ""
    vendor_stack: str = ""
    wifi_add_result: str = "pending"
    wifi_update_result: str = "pending"
    wifi_remove_result: str = "pending"
    reboot_required: str = ""
    reenrollment_required: str = ""
    user_confirmation_required: str = ""
    notes: str = ""

    def as_row(self) -> dict[str, str]:
        return {column: str(getattr(self, column, "")) for column in DEVICE_MATRIX_COLUMNS}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect baseline Android device facts over adb and emit a Wi-Fi investigation matrix."
    )
    parser.add_argument("--adb", default="adb", help="Path to the adb executable")
    parser.add_argument(
        "--format",
        choices=("markdown", "csv"),
        default="markdown",
        help="Output format",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Optional output file. Defaults to stdout.",
    )
    return parser.parse_args()


def run_command(command: list[str]) -> str:
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    return completed.stdout


def list_connected_devices(adb_path: str) -> list[str]:
    output = run_command([adb_path, "devices"])
    serials: list[str] = []
    for line in output.splitlines():
        line = line.strip()
        if not line or line.startswith("List of devices attached"):
            continue
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "device":
            serials.append(parts[0])
    return serials


def parse_getprop_output(output: str) -> dict[str, str]:
    props: dict[str, str] = {}
    for line in output.splitlines():
        line = line.strip()
        if not line.startswith("[") or "]: [" not in line:
            continue
        key, value = line.split("]: [", 1)
        props[key[1:]] = value[:-1]
    return props


def load_device_record(adb_path: str, serial: str) -> DeviceRecord:
    props_output = run_command([adb_path, "-s", serial, "shell", "getprop"])
    props = parse_getprop_output(props_output)
    record = DeviceRecord(serial=serial)
    for field_name, prop_key in PROP_KEYS.items():
        setattr(record, field_name, props.get(prop_key, ""))
    record.vendor_stack = infer_vendor_stack(record)
    return record


def infer_vendor_stack(record: DeviceRecord) -> str:
    manufacturer = record.manufacturer.lower()
    brand = record.brand.lower()
    model = record.model.lower()
    if "sunmi" in manufacturer or "sunmi" in brand or "sunmi" in model:
        return "SUNMI partner / cloud"
    if "imin" in manufacturer or "imin" in brand or "imin" in model:
        return "iMin partner / cloud"
    return ""


def render_markdown(records: list[DeviceRecord]) -> str:
    columns = DEVICE_MATRIX_COLUMNS
    lines = [
        "| " + " | ".join(columns) + " |",
        "| " + " | ".join(["---"] * len(columns)) + " |",
    ]
    for record in records:
        row = record.as_row()
        lines.append("| " + " | ".join(escape_markdown_table(row[column]) for column in columns) + " |")
    return "\n".join(lines) + "\n"


def escape_markdown_table(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ").strip()


def render_csv(records: list[DeviceRecord]) -> str:
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=DEVICE_MATRIX_COLUMNS)
    writer.writeheader()
    for record in records:
        writer.writerow(record.as_row())
    return buffer.getvalue()


def write_output(content: str, output_path: Path | None) -> None:
    if output_path is None:
        sys.stdout.write(content)
        return
    output_path.write_text(content)


def main() -> int:
    args = parse_args()
    try:
        serials = list_connected_devices(args.adb)
        if not serials:
            raise RuntimeError("No adb devices in 'device' state were found")
        records = [load_device_record(args.adb, serial) for serial in serials]
    except FileNotFoundError as exc:
        print(f"adb executable not found: {args.adb}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.strip() if exc.stderr else "adb command failed"
        print(stderr, file=sys.stderr)
        return 1
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    content = render_markdown(records) if args.format == "markdown" else render_csv(records)
    write_output(content, args.output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
