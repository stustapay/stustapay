# OEM Wi-Fi Provisioning Investigation

This document captures the current decision path for event Wi-Fi provisioning on managed Android payment devices.

## Current State

- StuStaPay currently uses Headwind MDM only for terminal registration metadata.
- The backend pushes `CUSTOM1..3` values for terminal token, terminal API base URL, and terminal name.
- The Android app reads those values to register the terminal automatically.
- StuStaPay does not currently store event Wi-Fi credentials or manage Wi-Fi directly.
- Headwind WiFi Manager has already been tested on the target fleet and is not considered reliable enough for rollout.

Relevant repo surfaces:

- `stustapay/administration/routers/mdm.py`
- `stustapay/administration/service/headwind.py`
- `app/app/src/main/java/de/stustapay/stustapay/device/ManagedConfigWatcher.kt`

## Why This Is OEM-First

Generic Android app-side silent Wi-Fi provisioning is not a safe baseline:

- Android deprecated the legacy configured-network APIs for regular apps in API 29.
- On Android 10+ the platform prefers Wi-Fi suggestions and other user-mediated flows.
- Device Owner, Profile Owner, and system apps remain special cases, but StuStaPay should not assume that status on third-party fleets.

Official Android references:

- <https://developer.android.com/reference/android/net/wifi/WifiManager>
- <https://developer.android.com/develop/connectivity/wifi/wifi-suggest>
- <https://developer.android.com/develop/connectivity/wifi/wifi-infrastructure>

The practical implication is that silent or near-silent provisioning must come from an OEM-supported device-management path, not from speculative app logic.

## Public OEM Signals

The public vendor material is enough to justify an OEM investigation, but not enough to justify implementation without hardware validation.

### SUNMI

- SUNMI documents a partner/developer model and a cloud API layer for multi-device management and remote maintenance.
- Public pages also reference remote management and app auto-install flows.
- Publicly accessible documentation does not clearly document Wi-Fi profile provisioning, so partner-console access and real-device verification are still required.

Official sources:

- <https://developer.sunmi.com/en-US/>
- <https://developer.sunmi.com/docs/en-US/cicmeghjk546/xcrieghjk579/>
- <https://developer.sunmi.com/docs/en-US/cdixeghjk491/xdrzeghjk557/>

### iMin

- iMin publicly documents a partner platform, device management, remote assistance, partner-controlled app installation, and model documentation for Falcon and D3 families.
- Public documentation shows remote management and parameter-setting capabilities, but it does not publicly confirm Wi-Fi profile provisioning.
- Partner-platform validation is required before committing to backend or Android implementation.

Official sources:

- <https://oss-sg.imin.sg/docs/en/DeviceManagement.html>
- <https://oss-sg.imin.sg/docs/en/RemoteAssistance.html>
- <https://oss-sg.imin.sg/docs/en/DockingDebugging.html>
- <https://oss-sg.imin.sg/docs/en/DevicesInfo.html>

## Investigation Workflow

1. Connect each target device over USB and collect the baseline inventory:

   ```bash
   python3 tools/collect_android_device_matrix.py --format markdown
   ```

2. Fill the missing operational fields manually for each device:
   - enrollment mode
   - vendor management stack used
   - Wi-Fi add result
   - Wi-Fi update result
   - Wi-Fi remove result
   - whether reboot, reenrollment, or user confirmation was required

3. Validate the OEM control path separately for SUNMI and iMin:
   - already-enrolled devices
   - configuration-scoped vs per-device behavior
   - update behavior when event Wi-Fi changes
   - impact of GMS vs no-GMS images

4. Record one of these outcomes:
   - `GO`: at least one vendor path is documented, reproducible, and stable on the real fleet
   - `NO-GO`: the path is enrollment-only, vendor-private without repeatable access, unstable, or inconsistent across devices

## Device Matrix

Use this table as the tracked source of truth for the rollout decision. The script above can populate the device facts; test outcomes should be filled after partner-console and hardware verification.

| Device | Serial | Android | SDK | Build | Enrollment mode | Vendor stack | Wi-Fi add | Wi-Fi update | Wi-Fi remove | Reboot required | Reenrollment required | User confirmation required | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SUNMI L2 Pro |  |  |  |  |  |  | pending | pending | pending |  |  |  |  |
| SUNMI L3 |  |  |  |  |  |  | pending | pending | pending |  |  |  |  |
| SUNMI D3 Mini |  |  |  |  |  |  | pending | pending | pending |  |  |  |  |
| iMin Falcon (with GMS) |  |  |  |  |  |  | pending | pending | pending |  |  |  |  |
| iMin Falcon (without GMS) |  |  |  |  |  |  | pending | pending | pending |  |  |  |  |

## Go/No-Go Rule

Proceed with StuStaPay implementation only if all of the following are true for at least one vendor path:

- Wi-Fi can be added or switched on already-enrolled devices.
- The mechanism is supported by the vendor’s documented or partner-supported management stack.
- The behavior is reproducible on the actual firmware and Android versions in use.
- Changing the event network updates the device without breaking existing Headwind terminal registration.

If these conditions are not met, do not add event Wi-Fi storage or sync logic to StuStaPay. Use a manual or best-effort operator flow instead.

## Future StuStaPay Changes If `GO`

Only after a validated `GO` decision:

- add restricted event settings for Wi-Fi SSID/password and vendor-specific configuration identifiers
- add backend sync logic for the validated vendor control plane
- keep existing Headwind terminal mapping behavior unchanged
- require manual QA on the physical device families before rollout
