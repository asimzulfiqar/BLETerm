# BLETerm

BLETerm is a Windows desktop AT-command terminal for BLE UART style devices. It is built with Electron, React, TypeScript, Zustand, and xterm.js.

This first `v0.1` release is an installable product prototype. It includes the desktop UI, device/profile/preset/routine/logging scaffolding, demo BLE devices, terminal behavior, export hooks, local persistence, and an initial Web Bluetooth transport for real BLE UART devices.

Dragino support is currently experimental. BLETerm can now open a real Web Bluetooth connection to NUS-style devices, but it has not yet been validated end-to-end against real Dragino hardware and it does not fully implement the Dragino PIN/authentication workflow.

## Features in v0.1

- Industrial dark three-panel desktop UI
- Web Bluetooth device selection for real BLE UART devices
- Demo BLE scanner entries for NUS, HM-10, and ESP32-style devices
- Built-in starter profiles for Dragino, Nordic, HM-10, ESP32, and generic AT devices
- xterm.js terminal with colored TX/RX/system/automation messages
- Command quick-send buttons, history, case mode, line terminator, and timeout handling
- Built-in preset packs for Dragino, Hayes/standard AT, HM-10, and ESP32
- Routine runner scaffold and watcher scaffold
- Session JSONL logging and export helpers
- Local profile/preset storage through Electron

## Install

Download the installer from the GitHub release:

- `BLETerm-Setup.exe`

If you are replacing an older local test build, close BLETerm and remove the old install first:

```powershell
Get-Process -Name BLETerm -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item "$env:LOCALAPPDATA\Programs\BLETerm" -Recurse -Force
```

Then run `BLETerm-Setup.exe`.

Windows may show a SmartScreen warning because this test build is unsigned. Choose **More info** and **Run anyway** for local testing.

## Portable Build

The release also includes:

- `BLETerm-0.1.0-portable.zip`

Extract the whole zip and run `BLETerm.exe` from inside the extracted folder. Do not copy only `BLETerm.exe`; Electron also needs the adjacent `resources`, DLLs, `.pak`, and locale files.

## How to Use

1. Open BLETerm.
2. Click **Scan** in the left sidebar.
3. Select a demo device such as `A8404123ABCD`.
4. Type AT commands in the command input:

```text
AT
AT+VER
AT+BAT
AT+CSQ
AT+TDC=300000
```

5. Use the right panel for presets, routines, watchers, and profile settings.
6. Use **Logs** to open the session log folder.

When Web Bluetooth is available, **Scan** opens the OS/browser BLE picker and adds the selected real device to the device list. Select that device to connect, then send commands normally. Web Bluetooth authorizes one selected device at a time, so it does not provide the same passive multi-device RSSI scan behavior planned for the future WinRT transport.

Commands are blocked when no device session is connected. Demo devices still use simulated responses; real Web Bluetooth devices receive actual writes and incoming GATT notifications are printed as RX terminal output.

## Dragino Status

BLETerm is not yet ready to be called a production-ready Dragino tool.

What works today:

- The app can connect to real BLE devices through Web Bluetooth.
- The Dragino starter profile and preset pack are included.
- NUS-style TX/RX traffic can be sent and received over a real BLE session.

What is still missing before calling Dragino support ready:

- Dragino PIN authentication is not fully implemented. The profile model has auth fields, but the app does not yet automatically send and validate the PIN handshake on connect.
- Hardware validation is still missing. The current code has not been verified here against a real Dragino sensor.
- Web Bluetooth uses a picker-based flow, not a native Windows passive BLE scan with proper RSSI/session discovery.
- Reconnect, MTU negotiation, and the broader PRD connection-management behavior are still partial.

## Development

Install dependencies:

```powershell
npm install
```

Start the app in development mode:

```powershell
npm run dev
```

The npm scripts explicitly clear `ELECTRON_RUN_AS_NODE`. If you launch Electron manually from a terminal and the app immediately closes or behaves like a blank process, check that this variable is not set:

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
```

Build the renderer:

```powershell
npm run build
```

Recreate the local installer from the existing packaged app folder:

```powershell
npm run dist:existing
```

The generated installer and portable zip are written to `release/` and are intentionally ignored by Git.

## Current Limitations

- Web Bluetooth is implemented as the first real BLE transport; native WinRT BLE is still pending.
- Web Bluetooth device discovery is picker-based and one device at a time.
- Dragino PIN auth is modeled but not fully executed as a real connect-time handshake yet.
- Real Dragino hardware-in-loop testing is still outstanding.
- Installer is unsigned.
- MSIX packaging is not set up yet.
- The automation editor is a scaffold, not a full visual routine builder.
- Demo responses are used after connecting to a demo device.

## Roadmap

- Add native WinRT BLE scanning for passive multi-device RSSI discovery.
- Implement real Dragino PIN/auth handshake and validation on connect.
- Broaden hardware-tested NUS/HM-10/custom GATT auto-detection.
- Add a full visual routine editor with reorderable steps.
- Add signed NSIS/MSIX release packaging.
- Add hardware-in-loop testing for Dragino, Nordic, HM-10, and ESP32 devices.
