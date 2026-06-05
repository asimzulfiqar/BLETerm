# BLETerm

BLETerm is a Windows desktop AT-command terminal for BLE UART style devices. It is built with Electron, React, TypeScript, Zustand, and xterm.js.

This first `v0.1` release is an installable product prototype. It includes the desktop UI, device/profile/preset/routine/logging scaffolding, demo BLE devices, terminal behavior, export hooks, and local persistence. Real hardware BLE transport is not enabled yet; scanner results and responses are currently simulated so the workflow can be tested without a device.

## Features in v0.1

- Industrial dark three-panel desktop UI
- Demo BLE scanner with NUS, HM-10, and ESP32-style devices
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

Commands are blocked when no device session is connected.

## Development

Install dependencies:

```powershell
npm install
```

Start the app in development mode:

```powershell
npm run dev
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

- Real Windows BLE transport is not implemented in `v0.1`.
- Installer is unsigned.
- MSIX packaging is not set up yet.
- The automation editor is a scaffold, not a full visual routine builder.
- Demo responses are used after connecting to a demo device.

## Roadmap

- Add real BLE transport using Web Bluetooth or WinRT.
- Implement NUS/HM-10/custom GATT auto-detection against hardware.
- Add a full visual routine editor with reorderable steps.
- Add signed NSIS/MSIX release packaging.
- Add hardware-in-loop testing for Dragino, Nordic, HM-10, and ESP32 devices.
