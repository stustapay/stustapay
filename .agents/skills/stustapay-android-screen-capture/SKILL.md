---
name: stustapay-android-screen-capture
description: Use when StuStaPay Android work needs the current implemented UI captured from the Android SDK CLI. Covers emulator discovery and launch, adb/device checks, app install and launch, UI navigation with adb input and uiautomator dump, and pulling screenshots for Pencil, QA, or design comparison.
---

# StuStaPay Android Screen Capture

Use this skill when the task depends on the current Android screens as rendered by the app, not on stale design files or hand-written descriptions.

## Prefer the Android SDK CLI

- Do not assume `adb` or `emulator` are on `PATH`.
- Check the standard SDK binaries first:
  - `~/Library/Android/sdk/platform-tools/adb`
  - `~/Library/Android/sdk/emulator/emulator`
- If those are missing, fall back to `adb` / `emulator` on `PATH`.

## Capture order

1. Check available targets:
   - `~/Library/Android/sdk/platform-tools/adb devices -l`
   - `~/Library/Android/sdk/emulator/emulator -list-avds`
2. Prefer a connected real device for hardware-specific screens. Use an emulator when no suitable device is attached.
3. Build and install from `app/`:
   - `./gradlew :app:assembleDebug`
   - `./gradlew :app:installDebug`
4. Launch the app explicitly:
   - `~/Library/Android/sdk/platform-tools/adb shell am start -W -n de.teamfestlichpay.teamfestlichpay/de.stustapay.stustapay.MainActivity`
5. Capture screenshots and UI structure:
   - `~/Library/Android/sdk/platform-tools/adb shell screencap -p /sdcard/Download/<name>.png`
   - `~/Library/Android/sdk/platform-tools/adb pull /sdcard/Download/<name>.png .agents/state/android-captures/<name>.png`
   - `~/Library/Android/sdk/platform-tools/adb shell uiautomator dump /sdcard/Download/<name>.xml`
   - `~/Library/Android/sdk/platform-tools/adb pull /sdcard/Download/<name>.xml .agents/state/android-captures/<name>.xml`

## Navigation rules

- Use `uiautomator dump` before guessing tap coordinates when possible.
- Use `adb shell input tap <x> <y>` and `adb shell input keyevent 4` for route traversal.
- Record the device orientation and screen size when it affects layouts:
  - `~/Library/Android/sdk/platform-tools/adb shell wm size`
  - `~/Library/Android/sdk/platform-tools/adb shell settings get system user_rotation`
- If a flow blocks on missing backend config, secrets, or hardware input, still capture the current error or waiting state and call out the blocker.

## Output locations

- Keep raw captures in `.agents/state/android-captures/`.
- If Pencil needs stable asset paths, copy selected screenshots into a visible repo folder such as `pencil-assets/` before wiring them into a `.pen` file.
- When working against current Android UI, prefer these live captures over `redsign.pen`.

## Hand-off notes

- State which device or AVD was used.
- State whether the screenshots came from a real device or emulator.
- State which routes were captured and which routes remain blocked by config, login, NFC, camera, or SumUp dependencies.
- If the captures support QA or release readiness, link them from `.agents/state/qa.md` or `.agents/state/ship.md`.
