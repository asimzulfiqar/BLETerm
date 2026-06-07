import type { BleDevice, DeviceProfile, PresetPack, Routine, Watcher } from "../types";

const id = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const profiles: DeviceProfile[] = [
  {
    id: "profile-dragino",
    nickname: "Dragino NB/LB/CB sensor",
    bleNamePattern: "A84041.*|Dragino.*",
    bleAddress: "",
    gattProfile: "NUS",
    lineTerminator: "CRLF",
    caseMode: "uppercase",
    mtu: "auto",
    responseTimeoutMs: 2000,
    auth: { type: "pin", credential: "123456", successPattern: "Password Correct" },
    defaultPresetPack: "dragino-nb",
    colorTag: "#00D4FF",
    notes: "Starter profile for Dragino BLE transparent UART devices.",
    favorite: true,
    quickSend: [
      { label: "Version", command: "AT+VER" },
      { label: "Battery", command: "AT+BAT" },
      { label: "Signal", command: "AT+CSQ" },
      { label: "Reboot", command: "ATZ" }
    ],
    history: []
  },
  {
    id: "profile-nordic",
    nickname: "Nordic nRF52 DK",
    bleNamePattern: "Nordic.*|nRF.*",
    gattProfile: "NUS",
    lineTerminator: "CRLF",
    caseMode: "preserve",
    mtu: "auto",
    responseTimeoutMs: 1000,
    auth: { type: "none" },
    defaultPresetPack: "hayes",
    colorTag: "#22C55E",
    notes: "Nordic UART Service profile.",
    quickSend: [{ label: "AT", command: "AT" }, { label: "Info", command: "ATI" }],
    history: []
  },
  {
    id: "profile-hm10",
    nickname: "HM-10 / HC-08 module",
    bleNamePattern: "HMSoft.*|HM-10.*|HC-08.*",
    gattProfile: "HM10",
    lineTerminator: "CRLF",
    caseMode: "uppercase",
    mtu: "auto",
    responseTimeoutMs: 1000,
    auth: { type: "none" },
    defaultPresetPack: "hm10",
    colorTag: "#A855F7",
    notes: "HM-10 compatible FFE0/FFE1 transparent UART profile.",
    quickSend: [{ label: "Name", command: "AT+NAME?" }, { label: "Baud", command: "AT+BAUD?" }],
    history: []
  },
  {
    id: "profile-esp32",
    nickname: "ESP32 BLE UART",
    bleNamePattern: "ESP32.*",
    gattProfile: "NUS",
    lineTerminator: "CRLF",
    caseMode: "uppercase",
    mtu: "auto",
    responseTimeoutMs: 1000,
    auth: { type: "none" },
    defaultPresetPack: "esp32",
    colorTag: "#F59E0B",
    notes: "ESP32 BLE UART / ESP-AT profile.",
    quickSend: [{ label: "GMR", command: "AT+GMR" }, { label: "BLE Addr", command: "AT+BLEADDR?" }],
    history: []
  },
  {
    id: "profile-generic",
    nickname: "Generic AT device",
    bleNamePattern: ".*",
    gattProfile: "NUS",
    lineTerminator: "CRLF",
    caseMode: "preserve",
    mtu: "auto",
    responseTimeoutMs: 1000,
    auth: { type: "none" },
    defaultPresetPack: "hayes",
    colorTag: "#6B7280",
    notes: "Universal transparent UART AT profile.",
    quickSend: [{ label: "AT", command: "AT" }, { label: "Reset", command: "ATZ" }],
    history: []
  }
];

const preset = (category: string, name: string, command: string, description = "", expectedResponse = "OK") => ({
  id: id(`${category}-${name}-${command}`),
  category,
  name,
  command,
  description,
  expectedResponse,
  placeholders: [...command.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    key: match[1].replace(/[^a-zA-Z0-9_]/g, "_"),
    label: match[1],
    default: match[1].includes("ms") ? "300000" : "",
    validate: ".*"
  }))
});

export const presetPacks: PresetPack[] = [
  {
    version: "1.0",
    id: "hayes",
    name: "Hayes / Standard AT",
    vendor: "Universal",
    description: "Baseline AT commands used by many devices.",
    presets: [
      preset("System", "Attention", "AT", "Basic ping."),
      preset("System", "Get Info", "ATI", "Device identification."),
      preset("System", "Echo Off", "ATE0", "Disable echo."),
      preset("System", "Echo On", "ATE1", "Enable echo."),
      preset("System", "Soft Reset", "ATZ", "Reset to saved profile."),
      preset("System", "Get Revision", "AT+GMR", "Firmware revision.")
    ]
  },
  {
    version: "1.0",
    id: "dragino-nb",
    name: "Dragino LoRaWAN / NB-IoT",
    vendor: "Dragino",
    description: "AT commands for Dragino LB/NB/CB suffix devices.",
    presets: [
      preset("System", "Get Version", "AT+VER", "Firmware version."),
      preset("System", "Reboot", "ATZ", "Soft reset."),
      preset("System", "Get DevEUI", "AT+DEUI", "Read DevEUI."),
      preset("System", "Get AppEUI", "AT+APPEUI", "Read AppEUI."),
      preset("System", "Get AppKey", "AT+APPKEY", "Read AppKey."),
      preset("System", "Factory Reset", "AT+FDR", "Restore factory defaults."),
      preset("System", "Change PIN", "AT+PWORD={6chars}", "Set new AT PIN."),
      preset("LoRaWAN", "Set Uplink Interval", "AT+TDC={ms}", "Transmit duty cycle."),
      preset("LoRaWAN", "Get Join Status", "AT+NJS", "Check join status."),
      preset("LoRaWAN", "Force Rejoin", "AT+DDETECT=1,60,90", "Rejoin on missing downlinks."),
      preset("LoRaWAN", "Set Data Rate", "AT+DR={0-5}", "0=SF12, 5=SF7."),
      preset("LoRaWAN", "Disable ADR", "AT+ADR=0", "Disable adaptive data rate."),
      preset("LoRaWAN", "Enable ADR", "AT+ADR=1", "Enable adaptive data rate."),
      preset("Scheduling", "Uplink every 1 min", "AT+TDC=60000"),
      preset("Scheduling", "Uplink every 5 min", "AT+TDC=300000"),
      preset("Scheduling", "Uplink every 1 hr", "AT+TDC=3600000"),
      preset("NB-IoT", "Get IMEI", "AT+CIMI", "Read modem IMEI."),
      preset("NB-IoT", "Signal Quality", "AT+CSQ", "RSSI / signal quality."),
      preset("NB-IoT", "Network Registration", "AT+CEREG?", "NB-IoT registration."),
      preset("NB-IoT", "Set APN", "AT+APN={apn}", "Carrier APN."),
      preset("RS485", "RS485 Mode", "AT+MOD=1", "RS485 sensor mode."),
      preset("RS485", "TTL UART Mode", "AT+MOD=2", "TTL UART sensor mode."),
      preset("RS485", "Config RS485 Device", "AT+CFGDEV={hex}", "Raw RS485 config command."),
      preset("RS485", "Set Baud Rate", "AT+BAUDR={rate}", "UART baud rate."),
      preset("RS485", "Enable 5V Output", "AT+5VT=30000", "Power 5V rail for 30 s."),
      preset("Power", "Battery Voltage", "AT+BAT", "Read battery."),
      preset("Power", "MCU Temperature", "AT+TEMP", "Internal temperature."),
      preset("Debug", "Debug On", "AT+DEBUG=1", "Verbose output."),
      preset("Debug", "Debug Off", "AT+DEBUG=0", "Normal output.")
    ]
  },
  {
    version: "1.0",
    id: "hm10",
    name: "HM-10 Module",
    vendor: "HM",
    description: "HM-10 and HC-08 compatible command set.",
    presets: [
      preset("System", "Attention", "AT"),
      preset("System", "Get Name", "AT+NAME?"),
      preset("System", "Set Name", "AT+NAME{name}"),
      preset("System", "Get Role", "AT+ROLE?"),
      preset("System", "Get Baud", "AT+BAUD?"),
      preset("System", "Set Baud", "AT+BAUD{n}"),
      preset("System", "Get Address", "AT+ADDR?"),
      preset("System", "Reset", "AT+RESET"),
      preset("System", "Restore Defaults", "AT+RENEW")
    ]
  },
  {
    version: "1.0",
    id: "esp32",
    name: "ESP32 BLE UART",
    vendor: "Espressif",
    description: "Common ESP-AT BLE commands.",
    presets: [
      preset("System", "Get Version", "AT+GMR"),
      preset("BLE", "BLE Init", "AT+BLEINIT=1"),
      preset("BLE", "BLE Deinit", "AT+BLEINIT=0"),
      preset("BLE", "Get BLE Addr", "AT+BLEADDR?"),
      preset("BLE", "Set Device Name", "AT+BLENAME={name}"),
      preset("BLE", "Start Advertising", "AT+BLEADVSTART"),
      preset("BLE", "Stop Advertising", "AT+BLEADVSTOP"),
      preset("BLE", "List Connections", "AT+BLECONN?")
    ]
  }
];

export const routines: Routine[] = [
  {
    version: "1.1",
    id: "routine-health",
    name: "Health Check Polling",
    description: "Poll battery and signal, then annotate the log.",
    deviceProfileId: "profile-dragino",
    schedule: { type: "interval", intervalSeconds: 300 },
    variables: {},
    steps: [
      { id: "s1", type: "send", command: "AT+BAT", label: "Read battery" },
      { id: "s2", type: "waitResponse", timeoutMs: 2000, label: "Wait for battery" },
      { id: "s3", type: "setVariable", variableName: "battery", captureRegex: "BAT=(\\d+)", label: "Capture battery" },
      { id: "s4", type: "send", command: "AT+CSQ", label: "Read signal" },
      { id: "s5", type: "waitResponse", timeoutMs: 2000, label: "Wait for signal" },
      { id: "s6", type: "log", message: "Health check OK - battery:{battery}", label: "Log summary" }
    ]
  }
];

export const watchers: Watcher[] = [
  { id: "watch-errors", label: "Errors", pattern: "ERR|ERROR|FAIL", action: "notification", enabled: true },
  { id: "watch-low-battery", label: "Low battery", pattern: "BAT=(?:[0-9]|1[0-9])\\b", action: "log", enabled: false }
];

export const mockDevices: BleDevice[] = [
  {
    id: "mock-dragino",
    name: "A8404123ABCD",
    address: "A8:40:41:23:AB:CD",
    rssi: -62,
    services: ["6E400001-B5A3-F393-E0A9-E50E24DCCA9E"],
    lastSeen: new Date().toISOString(),
    detectedProfile: "NUS",
    knownProfileId: "profile-dragino",
    favorite: true
  },
  {
    id: "mock-hm10",
    name: "HMSoft",
    address: "54:6C:0E:AA:11:22",
    rssi: -71,
    services: ["0000FFE0-0000-1000-8000-00805F9B34FB"],
    lastSeen: new Date().toISOString(),
    detectedProfile: "HM10",
    knownProfileId: "profile-hm10"
  },
  {
    id: "mock-esp32",
    name: "ESP32-BLE-UART",
    address: "30:C6:F7:12:90:44",
    rssi: -55,
    services: ["6E400001-B5A3-F393-E0A9-E50E24DCCA9E"],
    lastSeen: new Date().toISOString(),
    detectedProfile: "NUS",
    knownProfileId: "profile-esp32"
  }
];
