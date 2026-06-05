import { create } from "zustand";
import { mockDevices, presetPacks, profiles, routines, watchers } from "../data/seeds";
import type { BleDevice, ConnectionState, DeviceProfile, PresetPack, Routine, SessionEvent, Watcher } from "../types";

const STORE_KEY = "bleterm-state-v1";

interface BleTermState {
  ready: boolean;
  connectionState: ConnectionState;
  devices: BleDevice[];
  profiles: DeviceProfile[];
  presetPacks: PresetPack[];
  routines: Routine[];
  watchers: Watcher[];
  activeProfileId: string;
  activeDevice?: BleDevice;
  sessionEvents: SessionEvent[];
  commandHistory: string[];
  historyCursor: number;
  terminalFontSize: number;
  timestamps: boolean;
  hexView: boolean;
  scanline: boolean;
  rightTab: "presets" | "routines" | "watchers" | "profile";
  search: string;
  init: () => Promise<void>;
  persist: () => Promise<void>;
  scan: () => Promise<void>;
  connect: (device: BleDevice) => Promise<void>;
  disconnect: () => void;
  appendEvent: (event: Omit<SessionEvent, "ts">) => Promise<void>;
  sendCommand: (command: string, source?: string) => Promise<void>;
  runRoutine: (routine: Routine) => Promise<void>;
  setActiveProfile: (id: string) => void;
  updateProfile: (profile: DeviceProfile) => void;
  importProfiles: (items: DeviceProfile[]) => void;
  importPack: (pack: PresetPack) => void;
  setRightTab: (tab: BleTermState["rightTab"]) => void;
  setSearch: (search: string) => void;
  setTerminalFontSize: (size: number) => void;
  toggleTimestamps: () => void;
  toggleHexView: () => void;
  toggleScanline: () => void;
  clearTerminal: () => void;
}

const fallback = {
  ready: false,
  connectionState: "Idle" as ConnectionState,
  devices: [],
  profiles,
  presetPacks,
  routines,
  watchers,
  activeProfileId: profiles[0].id,
  activeDevice: undefined,
  sessionEvents: [
    {
      ts: new Date().toISOString(),
      type: "system" as const,
      data: "BLETerm ready. Use Scan to discover BLE UART devices or connect to a demo device."
    }
  ],
  commandHistory: [],
  historyCursor: -1,
  terminalFontSize: 14,
  timestamps: true,
  hexView: false,
  scanline: true,
  rightTab: "presets" as const,
  search: ""
};

const terminator = (profile: DeviceProfile) => {
  if (profile.lineTerminator === "CR") return "\r";
  if (profile.lineTerminator === "LF") return "\n";
  if (profile.lineTerminator === "CRLF") return "\r\n";
  return "";
};

const applyCase = (command: string, profile: DeviceProfile) => {
  if (profile.caseMode === "uppercase") return command.toUpperCase();
  if (profile.caseMode === "lowercase") return command.toLowerCase();
  return command;
};

const responseFor = (command: string) => {
  const clean = command.trim().toUpperCase();
  const map: Record<string, string> = {
    AT: "OK",
    ATI: "BLETerm demo UART bridge",
    ATE0: "OK",
    ATE1: "OK",
    ATZ: "REBOOTING\r\nOK",
    "AT+VER": "Firmware v1.4.3",
    "AT+BAT": "BAT=86",
    "AT+TEMP": "TEMP=24.7C",
    "AT+CSQ": "+CSQ: 19,99",
    "AT+NJS": "NJS=1",
    "AT+DEUI": "A840410102030405",
    "AT+APPEUI": "70B3D57ED0000000",
    "AT+APPKEY": "00112233445566778899AABBCCDDEEFF",
    "AT+GMR": "BLETerm ESP-AT demo 2.4.0",
    "AT+BLEADDR?": "+BLEADDR:30:C6:F7:12:90:44",
    "AT+NAME?": "HMSoft",
    "AT+BAUD?": "BAUD=4",
    "AT+ROLE?": "ROLE=0",
    "AT+ADDR?": "54:6C:0E:AA:11:22"
  };
  if (clean.startsWith("AT+TDC=") || clean.startsWith("AT+ADR=") || clean.startsWith("AT+DR=")) return "OK";
  if (clean.startsWith("AT+APN=") || clean.startsWith("AT+BLENAME=") || clean.startsWith("AT+PWORD=")) return "OK";
  return map[clean] ?? "OK";
};

export const useBleTermStore = create<BleTermState>((set, get) => ({
  ...fallback,
  init: async () => {
    const saved = await window.bleterm?.store.get(STORE_KEY, fallback);
    set({ ...fallback, ...saved, ready: true });
  },
  persist: async () => {
    const state = get();
    await window.bleterm?.store.set(STORE_KEY, {
      profiles: state.profiles,
      presetPacks: state.presetPacks,
      routines: state.routines,
      watchers: state.watchers,
      activeProfileId: state.activeProfileId,
      terminalFontSize: state.terminalFontSize,
      timestamps: state.timestamps,
      hexView: state.hexView,
      scanline: state.scanline,
      commandHistory: state.commandHistory.slice(-500)
    });
  },
  scan: async () => {
    set({ connectionState: "Scanning", devices: [] });
    await new Promise((resolve) => setTimeout(resolve, 700));
    const known = get().profiles;
    const devices = mockDevices
      .map((device) => {
        const match = known.find((profile) => new RegExp(profile.bleNamePattern || ".*", "i").test(device.name) || profile.bleAddress === device.address);
        return { ...device, knownProfileId: match?.id, favorite: Boolean(match?.favorite), lastSeen: new Date().toISOString() };
      })
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.rssi - a.rssi);
    set({ devices, connectionState: "Idle" });
  },
  connect: async (device) => {
    const profileId = device.knownProfileId ?? get().activeProfileId;
    set({ connectionState: "Connecting", activeDevice: device, activeProfileId: profileId });
    await get().appendEvent({ type: "system", data: `Connecting to ${device.name} (${device.detectedProfile})...` });
    await new Promise((resolve) => setTimeout(resolve, 400));
    const profile = get().profiles.find((item) => item.id === profileId);
    if (profile && profile.auth.type !== "none" && profile.auth.credential) {
      set({ connectionState: "Authenticating" });
      await get().appendEvent({ type: "system", data: "Authenticating with saved profile credential..." });
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    set({ connectionState: "Connected" });
    await get().appendEvent({ type: "system", data: `Connected to ${device.name}. Profile: ${profile?.nickname ?? "Generic"}. MTU: auto.` });
  },
  disconnect: () => {
    const device = get().activeDevice;
    set({ connectionState: "Disconnected", activeDevice: undefined });
    void get().appendEvent({ type: "system", data: device ? `Disconnected from ${device.name}.` : "Disconnected." });
  },
  appendEvent: async (event) => {
    const entry = { ts: new Date().toISOString(), ...event };
    set((state) => ({ sessionEvents: [...state.sessionEvents, entry] }));
    const name = get().activeDevice?.name ?? get().profiles.find((item) => item.id === get().activeProfileId)?.nickname ?? "BLETerm";
    await window.bleterm?.logs.append(name, entry);
    if (entry.type === "rx") {
      const matches = get().watchers.filter((watcher) => watcher.enabled && new RegExp(watcher.pattern, "i").test(entry.data));
      for (const watcher of matches) {
        if (watcher.action === "notification") await window.bleterm?.notify("BLETerm watcher", `${watcher.label}: ${entry.data}`);
        await get().appendEvent({ type: "automation", data: `Watcher matched: ${watcher.label}` });
      }
    }
  },
  sendCommand: async (command, source = "user") => {
    const profile = get().profiles.find((item) => item.id === get().activeProfileId) ?? profiles[0];
    const transformed = applyCase(command.trim(), profile);
    if (!transformed) return;
    if (get().connectionState !== "Connected" || !get().activeDevice) {
      await get().appendEvent({ type: "error", data: `Cannot send "${transformed}" - no BLE device is connected.` });
      return;
    }
    const raw = `${transformed}${terminator(profile)}`;
    set((state) => ({ commandHistory: [transformed, ...state.commandHistory.filter((item) => item !== transformed)].slice(0, 500), historyCursor: -1 }));
    await get().appendEvent({ type: "tx", data: raw, source });
    const chunks = Math.max(1, Math.ceil(raw.length / (profile.mtu === "auto" ? 20 : profile.mtu)));
    if (chunks > 1) await get().appendEvent({ type: "system", data: `Chunked TX into ${chunks} BLE write packets.` });
    await new Promise((resolve) => setTimeout(resolve, Math.min(profile.responseTimeoutMs, 280)));
    await get().appendEvent({ type: "rx", data: `${responseFor(transformed)}\r\n` });
  },
  runRoutine: async (routine) => {
    if (get().connectionState !== "Connected" || !get().activeDevice) {
      await get().appendEvent({ type: "error", data: `Cannot run "${routine.name}" - no BLE device is connected.` });
      return;
    }
    await get().appendEvent({ type: "automation", data: `Routine started: ${routine.name}` });
    for (const step of routine.steps) {
      await get().appendEvent({ type: "automation", data: `Step ${step.id}: ${step.label ?? step.type}` });
      if (step.type === "send" && step.command) await get().sendCommand(step.command, "automation");
      if (step.type === "wait" || step.type === "waitResponse") await new Promise((resolve) => setTimeout(resolve, step.delayMs ?? step.timeoutMs ?? 500));
      if (step.type === "log" && step.message) await get().appendEvent({ type: "automation", data: step.message });
      if (step.type === "notify" && step.message) await window.bleterm?.notify("BLETerm routine", step.message);
    }
    await get().appendEvent({ type: "automation", data: `Routine completed: ${routine.name}` });
  },
  setActiveProfile: (id) => {
    set({ activeProfileId: id });
    void get().persist();
  },
  updateProfile: (profile) => {
    set((state) => ({ profiles: state.profiles.map((item) => (item.id === profile.id ? profile : item)) }));
    void get().persist();
  },
  importProfiles: (items) => {
    set((state) => ({ profiles: [...state.profiles, ...items] }));
    void get().persist();
  },
  importPack: (pack) => {
    set((state) => ({ presetPacks: [...state.presetPacks.filter((item) => item.id !== pack.id), pack] }));
    void get().persist();
  },
  setRightTab: (rightTab) => set({ rightTab }),
  setSearch: (search) => set({ search }),
  setTerminalFontSize: (terminalFontSize) => {
    set({ terminalFontSize });
    void get().persist();
  },
  toggleTimestamps: () => {
    set((state) => ({ timestamps: !state.timestamps }));
    void get().persist();
  },
  toggleHexView: () => {
    set((state) => ({ hexView: !state.hexView }));
    void get().persist();
  },
  toggleScanline: () => {
    set((state) => ({ scanline: !state.scanline }));
    void get().persist();
  },
  clearTerminal: () => set({ sessionEvents: [] })
}));
