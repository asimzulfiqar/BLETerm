# BLE AT Commander — Windows Desktop App
### Product Requirements Document v1.1

---

## 1. Product Overview

**BLE AT Commander** is a universal Windows desktop application for communicating with any BLE-capable device that exposes an AT command interface over a serial-transparent GATT profile. It is device-agnostic: it works with Dragino sensors, Nordic-based modules, ESP32/nRF modules, cellular modems with BLE pass-through, and any other device that uses a transparent UART-over-BLE bridge.

Its primary differentiator over mobile apps is the desktop productivity surface: a full AT command terminal, a structured preset library with vendor packs, a visual automation engine that lets users define and schedule command sequences with conditional logic, and complete session logging with export.

**Target users:** IoT engineers, firmware developers, field technicians, QA teams  
**Platform:** Windows 10/11 (x64)  
**Distribution:** MSIX package (Microsoft Store ready) + standalone `.exe` installer  
**Tech stack:** Electron + React + TypeScript

---

## 2. Core Concepts

### 2.1 BLE Transport Model

The app communicates over BLE using a **Transparent UART** pattern, which most AT-over-BLE devices implement via one of the following GATT service profiles:

| Profile | Service UUID | TX Characteristic | RX Characteristic | Used by |
|---|---|---|---|---|
| Nordic UART Service (NUS) | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` | `6E400002` (Write) | `6E400003` (Notify) | Dragino, most nRF-based devices |
| HM-10 / CC2541 | `0000FFE0-0000-1000-8000-00805F9B34FB` | `0000FFE1` (Write+Notify) | same | HC-08, HM-10 modules |
| Custom / user-defined | User-configurable | User-configurable | User-configurable | Any other device |

The app must support all three modes above, selectable per device profile. The correct profile is auto-detected on connection by scanning advertised service UUIDs, with manual override available.

### 2.2 AT Command Protocol Basics

AT commands are ASCII strings sent over the transparent UART channel. Behavior varies by device:

| Parameter | Common default | Configurable per profile |
|---|---|---|
| Line terminator | `\r\n` (CRLF) | CR, LF, CRLF, none |
| Case sensitivity | UPPERCASE required | Some devices accept mixed case |
| Authentication | None (most) or PIN (Dragino) | Per device profile |
| Response timeout | 1000 ms | 100–10000 ms |
| Max MTU | 20 bytes (BLE 4.0) / 512 bytes (BLE 5.0) | Auto-negotiated |

Long commands exceeding the MTU must be chunked by the app transparently.

### 2.3 Device Profile System

Every device the user connects to is represented by a **Device Profile** — a saved configuration that persists all connection and protocol settings. The profile eliminates per-session reconfiguration. Profiles are the fundamental unit of device identity in the app.

### 2.4 Automation Engine

The automation engine executes user-defined **Routines** — sequences of AT commands with optional inter-command delays, conditional branching based on response content, variable substitution, and scheduling. Routines are independent of live terminal sessions and can run in the background.

---

## 3. Functional Requirements

### 3.1 Bluetooth Device Scanner

- [ ] Scan for nearby BLE devices; display list with: device name, BLE address (MAC), RSSI (dBm + visual signal-bar indicator), advertised service UUIDs, last seen timestamp
- [ ] Filter options:
  - All devices (default)
  - Known profiles only (devices matching a saved Device Profile by MAC or name pattern)
  - By GATT profile type (NUS, HM-10, Custom)
- [ ] Sort by RSSI (default), name, or last seen
- [ ] Scan duration configurable (5–60 s); re-triggerable at any time
- [ ] Animated scan indicator (pulsing); stops when idle
- [ ] Auto-detect GATT profile on connect; show detected profile UUID in device entry
- [ ] "Favorite" star on known devices; favorites float to top of list
- [ ] Remember last 20 connected devices; highlight previously connected devices in list

### 3.2 Device Connection & Authentication

- [ ] Connect to any device from the scanner list
- [ ] On connection, attempt GATT profile auto-detection; prompt user to confirm or override if ambiguous
- [ ] **Authentication layer** (optional per Device Profile):
  - None (default for most devices)
  - **PIN / password**: user-defined string sent as first command after connection; configurable expected success response string (e.g. `"Password Correct"`)
  - **Custom handshake**: user defines a sequence of commands + expected responses that must complete before the session is live
- [ ] Save authentication credentials per Device Profile (encrypted local storage)
- [ ] Auto-authenticate on connect if credentials are saved
- [ ] Authentication failure: show error, allow retry, do not lock out
- [ ] BLE connection state clearly shown: Scanning → Connecting → Authenticating → Connected → Disconnected
- [ ] Auto-reconnect toggle per Device Profile: on disconnect, attempt reconnect N times with configurable backoff

### 3.3 Device Profile Manager

A Device Profile stores all persistent configuration for a specific device or device type.

**Profile fields:**
- [ ] Nickname (user-defined display name)
- [ ] BLE address (MAC) or name pattern match (regex supported, for devices that append serial numbers to names)
- [ ] GATT profile: NUS / HM-10 / Custom (with custom service + characteristic UUIDs)
- [ ] Line terminator: CR / LF / CRLF / none
- [ ] Case mode: auto-uppercase / preserve / auto-lowercase
- [ ] Authentication: type + credentials
- [ ] MTU size: auto-negotiate or fixed
- [ ] Response timeout (ms)
- [ ] Default preset pack (linked to Section 3.5)
- [ ] Notes field (freeform markdown)
- [ ] Icon / color tag for visual identification
- [ ] Connection history (last 50 sessions with timestamps and duration)

**Management:**
- [ ] Create, edit, duplicate, delete profiles
- [ ] Import profiles from `.atprofile` JSON file
- [ ] Export one or all profiles to `.atprofile` JSON file
- [ ] Profile list accessible from left sidebar; searchable

**Built-in starter profiles (pre-loaded, user can edit):**
- Dragino NB/LB/CB sensor (NUS, CRLF, PIN auth, Dragino preset pack)
- Nordic nRF52 DK (NUS, CRLF, no auth)
- HM-10 / HC-08 module (HM-10 profile, CRLF, no auth)
- ESP32 BLE UART (NUS, CRLF, no auth)
- Generic AT device (NUS, CRLF, no auth, no preset pack)

### 3.4 AT Command Terminal

The primary working surface. One terminal session per connected device (tabs if multiple devices connected simultaneously — see Section 3.9).

**Input area:**
- [ ] Single-line command input; `Enter` or Send button to transmit
- [ ] Case transformation applied per Device Profile setting (auto-uppercase, etc.)
- [ ] Line terminator appended automatically (not shown to user)
- [ ] Command history within session: `↑` / `↓` arrow keys cycle through sent commands
- [ ] Persistent command history across sessions per device (last 500 commands, searchable with `Ctrl+R`)
- [ ] Multi-line input mode toggle: allows composing multi-command blocks before sending (commands sent sequentially with profile delay)
- [ ] Drag-and-drop a `.atscript` file into the input area to load it as a batch sequence

**Output / response pane:**
- [ ] Scrollable terminal-style output using `xterm.js`
- [ ] Color coding: sent commands (cyan), received responses (white), system/status messages (gray), errors (amber), automation output (purple tint)
- [ ] Timestamps per line: toggleable, format configurable (relative or absolute ISO)
- [ ] Hex view toggle: show raw bytes alongside ASCII
- [ ] "Clear terminal" button (does not affect log)
- [ ] "Copy all" / "Copy selection" to clipboard
- [ ] Auto-scroll to bottom; scroll-lock indicator if user has scrolled up
- [ ] Search in terminal output (`Ctrl+F`): highlight matches, navigate with `n`/`N`
- [ ] Terminal font size: user-configurable (12–22 px)

**Quick-send toolbar:**
- [ ] Up to 16 configurable quick-send buttons per Device Profile
- [ ] Each button: label (≤12 chars) + command string
- [ ] Click sends immediately (respects case and terminator settings)
- [ ] Edit mode to rearrange / label buttons

### 3.5 Preset Command Library

A structured, searchable library of AT commands. Presets are organized into **Preset Packs** — collections scoped to a vendor or device family.

**Preset Pack structure:**
- [ ] Each pack has: name, vendor, description, version, list of commands
- [ ] Packs can be linked to a Device Profile as the default library shown in the terminal
- [ ] Multiple packs can be active simultaneously (merged view)

**Built-in packs (shipped with app):**

*Dragino LoRaWAN / NB-IoT* — see Section 7 for full command table  
*Nordic UART / nRF SDK* — basic AT commands for nRF Connect SDK devices  
*ESP32 BLE UART* — common ESP-AT commands  
*Hayes / Standard AT* — universal baseline (ATI, ATE, ATZ, AT+GMR, etc.)  
*HM-10 Module* — HM-10 specific AT set (AT+NAME, AT+ROLE, AT+BAUD, etc.)

**User-created presets:**
- [ ] Create, edit, delete custom presets within any pack
- [ ] Create new custom packs
- [ ] Import pack from `.atpack` JSON file
- [ ] Export pack to `.atpack` JSON file
- [ ] Share pack as a URL-encoded link (future: community pack registry)

**Preset fields:**
- [ ] Name, description, category tag
- [ ] Command string — may contain `{placeholder}` tokens with: label, default value, validation regex
- [ ] Expected response pattern (regex) — used by automation engine for pass/fail detection
- [ ] Notes / documentation (markdown)

**Behavior:**
- [ ] Double-click preset → inserts into command input (not auto-sent)
- [ ] If preset contains `{placeholder}` → show inline parameter form before inserting
- [ ] Preset search: fuzzy match on name, description, command string
- [ ] "Send directly" option (shift + double-click) — inserts and sends in one action

### 3.6 Automation Engine

The automation engine allows users to define **Routines** that execute AT command sequences automatically without manual interaction. This is the key feature gap vs. mobile apps.

#### 3.6.1 Routine Structure

A Routine is a named, saved sequence of **Steps**. Each step is one of:

| Step Type | Description |
|---|---|
| **Send Command** | Send a literal AT command or a preset (with fixed or variable values) |
| **Wait** | Fixed delay (ms) before next step |
| **Wait for Response** | Wait until device sends a response matching a regex pattern (with timeout) |
| **Assert** | Check that the last response matches a regex; on fail: stop, continue, or branch |
| **Branch** | If/else: evaluate last response against condition, jump to a labeled step |
| **Set Variable** | Parse a value from the last response using a capture group regex; store in a named variable |
| **Use Variable** | Substitute a stored variable into a command string |
| **Loop** | Repeat a block N times or indefinitely (until stopped or condition met) |
| **Log** | Write a custom message to the session log |
| **Notify** | Show a Windows desktop notification with a custom message |
| **Webhook** | Send an HTTP POST with the last response data to a user-defined URL |

#### 3.6.2 Routine Editor

- [ ] Visual step-by-step editor (not code; structured form UI)
- [ ] Drag-and-drop to reorder steps
- [ ] Each step shows: type icon, summary text, status (pending / running / pass / fail / skipped)
- [ ] "Test step" button — runs a single step against the currently connected device
- [ ] Inline variable inspector: shows current variable values during a run
- [ ] Import/export routine as `.atroutine` JSON file

#### 3.6.3 Routine Runner

- [ ] Run a routine against the currently connected device
- [ ] Live step-by-step progress: current step highlighted, pass/fail per step
- [ ] Pause / Resume / Stop controls
- [ ] Step-through mode: advance one step at a time manually (for debugging)
- [ ] Routine run log: full timestamped output of every command sent and response received
- [ ] On completion: summary (total steps, passed, failed, time elapsed)

#### 3.6.4 Routine Scheduling

- [ ] **Manual trigger:** Run now button
- [ ] **On connect:** Run automatically when a device matching a Device Profile connects
- [ ] **On disconnect:** Run a routine (e.g. a diagnostic dump) when the device disconnects
- [ ] **Scheduled (time-based):** Run at a fixed interval while the device is connected:
  - Every N seconds / minutes / hours
  - Daily at a specific time
  - Cron expression (advanced mode)
- [ ] **Triggered by response:** Run when any incoming BLE data matches a watch pattern (regex)
- [ ] Multiple schedules can be active simultaneously
- [ ] Scheduler runs in background (app may be minimized to system tray)
- [ ] Scheduled run history (last 100 runs per routine: time, outcome, log)

#### 3.6.5 Routine Library

- [ ] All saved routines listed in a "Routines" sidebar panel
- [ ] Group routines by Device Profile or custom folder
- [ ] Duplicate, rename, delete routines
- [ ] Export all routines as a `.zip` bundle

#### 3.6.6 Example Use Cases (guide documentation for users)

- *Health check polling:* Every 5 minutes, send `AT+BAT` + `AT+CSQ`, parse values, log them, webhook if below threshold
- *Provisioning sequence:* On connect to a new device, run a fixed sequence to set APPEUI, APPKEY, TDC, then reboot
- *Response watcher:* Watch for any response containing `"ERR"` and trigger a desktop notification
- *Factory test:* Assert a sequence of responses against expected patterns; generate pass/fail report

### 3.7 Response Watcher

A lightweight always-on feature distinct from routines — monitors all incoming BLE data and fires actions on pattern matches.

- [ ] Define watchers: regex pattern + action (notification / log annotation / trigger a routine / webhook)
- [ ] Watchers are active for the duration of a connection session
- [ ] Watcher list visible in terminal sidebar with enable/disable toggles
- [ ] Watchers are saved per Device Profile

### 3.8 Session Logging & Export

- [ ] Every session auto-saved to `%AppData%\BLEATCommander\logs\{device-name}\{timestamp}.jsonl`
- [ ] Log format: JSON Lines, one entry per event (TX command, RX response, system event, automation step)
- [ ] Export current session as:
  - Plain text `.txt` (human-readable terminal transcript)
  - CSV (timestamp, direction, raw data)
  - JSON (full structured log)
  - Markdown report (for sharing with team)
- [ ] Automation run logs exported separately as structured JSON with pass/fail summary
- [ ] Log retention: configurable (7 days default, up to unlimited)
- [ ] "Open log folder" shortcut

### 3.9 Multi-Device (Tabbed Sessions)

- [ ] Connect to multiple BLE devices simultaneously, each in its own tab
- [ ] Tab shows: device nickname, connection status indicator, RSSI
- [ ] Routines scoped to their own device tab
- [ ] Up to 4 simultaneous connections (Windows BLE stack limitation acknowledgment)

---

## 4. UI/UX Requirements

### 4.1 Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [≡] BLE AT Commander          [Tab: Device A] [Tab: Device B]+  │
├────────────┬─────────────────────────────────┬───────────────────┤
│            │                                 │                   │
│  LEFT      │   CENTER — AT Terminal          │  RIGHT PANEL      │
│  SIDEBAR   │                                 │  (collapsible)    │
│            │   [Device status bar]           │                   │
│  [Scan]    │                                 │  Tabs:            │
│  [Devices] │   [Terminal output — xterm.js]  │  · Presets        │
│  [Profiles]│                                 │  · Routines       │
│  [Routines]│   [Quick-send toolbar]          │  · Watchers       │
│  [Logs]    │                                 │  · Profile        │
│            │   [Command input ▶ Send]        │                   │
│            │                                 │                   │
├────────────┴─────────────────────────────────┴───────────────────┤
│  BLE: ● Connected — "A8404123ABCD"  |  NUS  |  RSSI -62 dBm  |  Session 00:04:12  │
└──────────────────────────────────────────────────────────────────┘
```

- Three-panel layout: sidebar (left, collapsible), terminal (center, primary), context panel (right, collapsible)
- Persistent status bar at bottom
- All panels resizable via drag handles
- Right panel tabs switch context without losing terminal state

### 4.2 Visual Design Direction

**Aesthetic: Industrial Precision Dark** — oscilloscope-meets-developer-tooling. Not a generic dark mode. The terminal is a primary actor, not an afterthought.

**Color palette:**
- Background: `#0D0F12`
- Surface: `#161A20`
- Surface elevated: `#1E2330`
- Border: `#2A2F38`
- Accent (BLE / action): `#00D4FF` (electric cyan)
- Accent secondary (automation): `#A855F7` (violet — distinct from BLE cyan)
- Success: `#22C55E`
- Error: `#EF4444`
- Warning: `#F59E0B`
- Text primary: `#E8ECF0`
- Text muted: `#6B7280`

**Typography:**
- UI chrome: `IBM Plex Sans` — structured, engineering-grade
- Terminal output: `JetBrains Mono` or `Cascadia Code` — legible monospace
- Labels: tracked uppercase, small caps style

**UI details:**
- RSSI signal bars: cyan-to-green gradient, 5 bars
- BLE timeout ring (Dragino-style devices): circular countdown, amber < 15 s, red < 5 s
- Active connection: pulsing cyan dot in status bar
- Automation running: violet pulse on "Routines" sidebar item
- Optional scanline texture on terminal pane (toggleable in settings)
- Smooth tab switching with subtle slide animation
- Step progress in Routine Runner: step cards with left-border color coding (gray pending / cyan running / green pass / red fail)

### 4.3 Settings Panel

Sections accessible via gear icon:

| Section | Settings |
|---|---|
| **Appearance** | Theme (dark/light), terminal font size (12–22 px), timestamps, scanline texture, accent color override |
| **BLE** | Scan duration, auto-reconnect (on/off, max retries, backoff), MTU negotiation |
| **Terminal** | Default line terminator, default case mode, auto-scroll, inter-command delay, history size |
| **Automation** | Max concurrent routines, webhook timeout, scheduler check interval |
| **Logging** | Log retention (days), log folder path, log level |
| **Notifications** | Enable/disable desktop notifications, notification level (all / failures only) |
| **System tray** | Minimize to tray on close (on/off), tray icon behavior |
| **About** | Version, changelog, links to docs and GitHub |

---

## 5. Non-Functional Requirements

| Requirement | Target |
|---|---|
| App startup time | < 3 s cold start |
| BLE scan initiation | < 500 ms after button press |
| Command round-trip display latency | < 100 ms from device response to screen render |
| Memory footprint (idle, connected) | < 250 MB |
| Automation scheduler drift | < 100 ms per scheduled interval |
| Windows version | Windows 10 build 19041+ and Windows 11 |
| BLE API | WinRT `Windows.Devices.Bluetooth` (preferred) or Web Bluetooth via Electron Chromium |
| Simultaneous connections | Up to 4 devices |
| Installer size | < 150 MB |
| Crash recovery | Session auto-saved; on relaunch offer to restore |
| Accessibility | WCAG 2.1 AA; full keyboard nav; screen reader labels |

---

## 6. File Formats

### 6.1 Device Profile — `.atprofile`
```json
{
  "version": "1.1",
  "id": "uuid-v4",
  "nickname": "Dragino RS485-CB #3",
  "bleNamePattern": "A84041.*",
  "bleAddress": "A8:40:41:23:AB:CD",
  "gattProfile": "NUS",
  "customGatt": null,
  "lineTerminator": "CRLF",
  "caseMode": "uppercase",
  "mtu": "auto",
  "responseTimeoutMs": 2000,
  "auth": {
    "type": "pin",
    "credential": "<encrypted>",
    "successPattern": "Password Correct"
  },
  "defaultPresetPack": "dragino-nb",
  "colorTag": "#00D4FF",
  "notes": "Field unit — rooftop installation, building B",
  "quickSend": [
    { "label": "Version", "command": "AT+VER" },
    { "label": "Battery", "command": "AT+BAT" }
  ]
}
```

### 6.2 Preset Pack — `.atpack`
```json
{
  "version": "1.0",
  "id": "uuid-v4",
  "name": "Dragino NB-IoT / LoRaWAN",
  "vendor": "Dragino",
  "description": "AT commands for Dragino LB/NB/CB suffix devices",
  "presets": [
    {
      "id": "uuid-v4",
      "category": "System",
      "name": "Get Firmware Version",
      "command": "AT+VER",
      "description": "Returns firmware version string",
      "expectedResponse": ".*v\\d+\\.\\d+.*",
      "placeholders": []
    },
    {
      "id": "uuid-v4",
      "category": "Scheduling",
      "name": "Set Uplink Interval",
      "command": "AT+TDC={interval_ms}",
      "description": "Transmit duty cycle in milliseconds",
      "expectedResponse": "OK",
      "placeholders": [
        { "key": "interval_ms", "label": "Interval (ms)", "default": "300000", "validate": "^\\d+$" }
      ]
    }
  ]
}
```

### 6.3 Automation Routine — `.atroutine`
```json
{
  "version": "1.1",
  "id": "uuid-v4",
  "name": "Health Check Polling",
  "description": "Poll battery and signal every 5 minutes; webhook on low values",
  "deviceProfileId": "uuid-v4",
  "schedule": {
    "type": "interval",
    "intervalSeconds": 300
  },
  "variables": {},
  "steps": [
    { "id": "s1", "type": "send", "command": "AT+BAT", "label": "Read battery" },
    { "id": "s2", "type": "waitResponse", "timeoutMs": 2000 },
    { "id": "s3", "type": "setVariable", "variableName": "battery", "captureRegex": "BAT=(\\d+)" },
    { "id": "s4", "type": "assert", "condition": "battery > 20", "onFail": "branch:low_battery" },
    { "id": "s5", "type": "send", "command": "AT+CSQ", "label": "Read signal" },
    { "id": "s6", "type": "waitResponse", "timeoutMs": 2000 },
    { "id": "s7", "type": "log", "message": "Health check OK — battery:{battery}" },
    { "id": "low_battery", "type": "webhook", "url": "https://hooks.example.com/alert", "body": "{\"event\":\"low_battery\",\"value\":\"{battery}\"}" }
  ]
}
```

### 6.4 Batch Script — `.atscript`
```
# BLE AT Commander Script
# Device: Dragino RS485-CB
# Created: 2025-06-05

AT+VER
WAIT 500
AT+TDC=300000
AT+ADR=1
AT+DR=3
WAIT 200
ATZ
```

### 6.5 Session Log — `.jsonl`
```jsonl
{"ts":"2025-06-05T10:23:01.123Z","type":"tx","data":"AT+VER\r\n","source":"user"}
{"ts":"2025-06-05T10:23:01.312Z","type":"rx","data":"Firmware v1.4.3\r\n"}
{"ts":"2025-06-05T10:23:01.400Z","type":"automation","event":"step_pass","stepId":"s1","routine":"Health Check"}
```

---

## 7. Built-in Preset Packs

### 7.1 Hayes / Standard AT (all devices)
| Name | Command | Description |
|---|---|---|
| Attention | `AT` | Basic ping — device should respond `OK` |
| Get Info | `ATI` | Device identification string |
| Echo Off | `ATE0` | Disable command echo |
| Echo On | `ATE1` | Enable command echo |
| Soft Reset | `ATZ` | Reset to saved profile |
| Get Revision | `AT+GMR` | Firmware/revision info |

### 7.2 Dragino LoRaWAN / NB-IoT

**System**
| Name | Command | Description |
|---|---|---|
| Get Version | `AT+VER` | Firmware version |
| Reboot | `ATZ` | Soft reset |
| Get DevEUI | `AT+DEUI` | Read DevEUI |
| Get AppEUI | `AT+APPEUI` | Read AppEUI |
| Get AppKey | `AT+APPKEY` | Read AppKey |
| Factory Reset | `AT+FDR` | Restore factory defaults |
| Change PIN | `AT+PWORD={6chars}` | Set new 6-char AT PIN |

**LoRaWAN**
| Name | Command | Description |
|---|---|---|
| Set Uplink Interval | `AT+TDC={ms}` | Transmit duty cycle (ms) |
| Get Join Status | `AT+NJS` | Check network join status |
| Force Rejoin | `AT+DDETECT=1,60,90` | Rejoin on missing downlinks |
| Set Data Rate | `AT+DR={0-5}` | 0=SF12 (max range), 5=SF7 |
| Disable ADR | `AT+ADR=0` | Disable adaptive data rate |
| Enable ADR | `AT+ADR=1` | Enable adaptive data rate |
| Sync Frame Count | `AT+DISFCNTCHECK=1` | Accept any downlink frame counter |
| Confirmed Uplinks | `AT+CFM=1` | Enable confirmed uplink mode |

**Scheduling (quick presets)**
| Name | Command |
|---|---|
| Uplink every 1 min | `AT+TDC=60000` |
| Uplink every 5 min | `AT+TDC=300000` |
| Uplink every 1 hr | `AT+TDC=3600000` |
| Uplink every 2 hr | `AT+TDC=7200000` |
| Uplink every 12 hr | `AT+TDC=43200000` |

**NB-IoT / LTE-M**
| Name | Command | Description |
|---|---|---|
| Get IMEI | `AT+CIMI` | Read modem IMEI |
| Signal Quality | `AT+CSQ` | RSSI / signal quality |
| Network Registration | `AT+CEREG?` | NB-IoT registration status |
| Set APN | `AT+APN={apn}` | Carrier APN |

**RS485**
| Name | Command | Description |
|---|---|---|
| RS485 Mode | `AT+MOD=1` | RS485 sensor mode |
| TTL UART Mode | `AT+MOD=2` | TTL UART sensor mode |
| Config RS485 Device | `AT+CFGDEV={hex}` | Raw RS485 config command |
| Set Baud Rate | `AT+BAUDR={rate}` | UART baud rate |
| Enable 5V Output | `AT+5VT=30000` | Power 5V rail for 30 s |

**Power / Debug**
| Name | Command | Description |
|---|---|---|
| Battery Voltage | `AT+BAT` | Read battery level |
| MCU Temperature | `AT+TEMP` | Internal temperature |
| Debug On | `AT+DEBUG=1` | Verbose output |
| Debug Off | `AT+DEBUG=0` | Normal output |

### 7.3 HM-10 / HC-08 Module
| Name | Command | Description |
|---|---|---|
| Attention | `AT` | Check connection |
| Get Name | `AT+NAME?` | Read module name |
| Set Name | `AT+NAME{name}` | Set module name |
| Get Role | `AT+ROLE?` | Master/Slave mode |
| Get Baud | `AT+BAUD?` | Read baud rate |
| Set Baud | `AT+BAUD{n}` | Set baud rate (0–8) |
| Get Address | `AT+ADDR?` | Read BLE MAC |
| Reset | `AT+RESET` | Software reset |
| Restore Defaults | `AT+RENEW` | Factory restore |

### 7.4 ESP32 ESP-AT
| Name | Command | Description |
|---|---|---|
| Get Version | `AT+GMR` | Firmware version |
| BLE Init | `AT+BLEINIT=1` | Initialize BLE (server mode) |
| BLE Deinit | `AT+BLEINIT=0` | Deinitialize BLE |
| Get BLE Addr | `AT+BLEADDR?` | Read BLE address |
| Set Device Name | `AT+BLENAME={name}` | Set BLE device name |
| Start Advertising | `AT+BLEADVSTART` | Begin BLE advertising |
| Stop Advertising | `AT+BLEADVSTOP` | Stop BLE advertising |
| List Connections | `AT+BLECONN?` | List connected devices |

---

## 8. Installation & Distribution

### 8.1 MSIX Package (Store-ready)
- Code signed with EV certificate
- Package identity: `com.blecommander.app`
- WinRT capabilities: `bluetooth`, `privateNetworkClientServer`
- App installer with auto-update via Windows Package Manager

### 8.2 Standalone Installer
- Inno Setup `.exe`
- Portable mode option (all data in app directory)
- Auto-updater via electron-updater (GitHub Releases or private server)
- Silent install support (`/S` flag) for enterprise deployment

### 8.3 System Requirements
- Windows 10 build 19041+ or Windows 11
- Bluetooth 4.0+ adapter (4.2+ recommended for larger MTU)
- No driver installation required
- 200 MB disk space

---

## 9. Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Electron + React + TypeScript | Cross-platform path; Chromium BLE; ecosystem |
| BLE (primary) | WinRT `Windows.Devices.Bluetooth` via Node native addon | Best Windows compatibility; full BLE 5 support |
| BLE (fallback) | Web Bluetooth via Electron Chromium | Simpler API; adequate for BLE 4 devices |
| State management | Zustand | Lightweight, no boilerplate |
| UI primitives | Radix UI | Accessible, unstyled, full design control |
| Styling | Tailwind CSS + CSS variables | Consistent theming |
| Terminal renderer | xterm.js | Industry standard, ANSI, high performance |
| Automation scheduler | node-cron + custom engine | Cron and interval scheduling |
| HTTP (webhooks) | Axios | Webhook step in automation |
| Build / package | electron-builder | MSIX + NSIS/Inno output, auto-update |
| Storage | electron-store (encrypted) | Per-user, typed, encrypted credentials |
| Logging | electron-log | File + console |
| Testing | Vitest (unit) + Playwright (E2E) | |

---

## 10. Out of Scope — v1.0

- OTA firmware upgrade over BLE DFU (defer to v1.1)
- Multi-device simultaneous routine orchestration (routines run per device independently in v1.0)
- Cloud sync of profiles / presets / routines
- macOS / Linux builds (code path portable but BLE native addon differs)
- LoRaWAN network server integration or downlink payload decoder
- Community preset pack registry / sharing portal

---

## 11. Open Questions Before Build

1. **BLE native addon vs Web Bluetooth:** WinRT addon (`node-bluetooth-hci-socket` or custom) gives full BLE 5 control and reliable pairing behavior. Web Bluetooth in Electron is cleaner API but has known pairing quirks with some adapters on Windows. Recommend: prototype WinRT path first; fall back to Web Bluetooth only if native addon proves unstable.

2. **Code signing:** EV certificate required to avoid SmartScreen warnings (~€300/yr). For open-source release, GitHub Actions artifact attestation reduces friction but does not fully suppress SmartScreen on first run.

3. **Automation engine — visual vs scripted:** The step-form editor described here is the safest v1.0 choice. A scripting language (JavaScript or Lua sandbox) is more powerful but significantly increases build complexity and attack surface. Consider exposing a JS sandbox in v1.1 for power users.

4. **Webhook security:** Webhooks send BLE response data to user-defined URLs. This must be opt-in and clearly disclosed in the UI to avoid users accidentally exfiltrating device data.

5. **Test device matrix:** Minimum: one Dragino CB device, one nRF52 DK, one HM-10 module. Automation engine specifically requires hardware-in-loop testing; mocked BLE is insufficient for schedule + reconnect behavior.

---

*Document version 1.1 — June 2025*  
*Replaces v1.0 (Dragino-specific). Scope expanded to universal BLE AT commander with automation engine.*
