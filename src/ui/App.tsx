import { useEffect, useMemo, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import {
  Activity,
  Bluetooth,
  Bot,
  ChevronRight,
  Clipboard,
  Copy,
  Database,
  Download,
  FolderOpen,
  History,
  PlugZap,
  Radio,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Signal,
  Sparkles,
  Star,
  Trash2,
  Upload
} from "lucide-react";
import { useBleTermStore } from "../state/useBleTermStore";
import type { BleDevice, DeviceProfile, Preset, PresetPack, SessionEvent } from "../types";

const SERVICE_LABELS: Record<string, string> = {
  "6E400001-B5A3-F393-E0A9-E50E24DCCA9E": "Nordic UART",
  "0000FFE0-0000-1000-8000-00805F9B34FB": "HM-10"
};

const hex = (value: string) => Array.from(new TextEncoder().encode(value)).map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ");

const eventColor = (type: SessionEvent["type"]) => {
  if (type === "tx") return "\x1b[36m";
  if (type === "rx") return "\x1b[37m";
  if (type === "automation") return "\x1b[35m";
  if (type === "error") return "\x1b[33m";
  return "\x1b[90m";
};

function formatEvent(event: SessionEvent, timestamps: boolean, hexView: boolean) {
  const prefix = timestamps ? `[${new Date(event.ts).toLocaleTimeString()}] ` : "";
  const tag = event.type.toUpperCase().padEnd(10);
  const body = event.data.replace(/\r?\n$/, "");
  const suffix = hexView ? `  HEX ${hex(event.data)}` : "";
  return `${eventColor(event.type)}${prefix}${tag} ${body}${suffix}\x1b[0m`;
}

function SignalBars({ rssi }: { rssi: number }) {
  const bars = rssi > -60 ? 5 : rssi > -68 ? 4 : rssi > -76 ? 3 : rssi > -84 ? 2 : 1;
  return (
    <span className="signal-bars" aria-label={`${rssi} dBm`}>
      {Array.from({ length: 5 }, (_, index) => <i key={index} className={index < bars ? "on" : ""} />)}
    </span>
  );
}

function ScannerDevice({ device }: { device: BleDevice }) {
  const connect = useBleTermStore((state) => state.connect);
  return (
    <button className="device-row" onClick={() => void connect(device)}>
      <span className="device-topline">
        <span className="device-name">{device.favorite && <Star size={13} fill="currentColor" />} {device.name}</span>
        <SignalBars rssi={device.rssi} />
      </span>
      <span className="device-meta">{device.address} · {device.rssi} dBm · {device.detectedProfile}</span>
      <span className="service-list">{device.services.map((service) => SERVICE_LABELS[service] ?? service).join(", ")}</span>
    </button>
  );
}

function Sidebar() {
  const scan = useBleTermStore((state) => state.scan);
  const devices = useBleTermStore((state) => state.devices);
  const profiles = useBleTermStore((state) => state.profiles);
  const activeProfileId = useBleTermStore((state) => state.activeProfileId);
  const setActiveProfile = useBleTermStore((state) => state.setActiveProfile);
  const connectionState = useBleTermStore((state) => state.connectionState);
  const routines = useBleTermStore((state) => state.routines);
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <button className={`primary-action ${connectionState === "Scanning" ? "is-scanning" : ""}`} onClick={() => void scan()}>
          <RefreshCw size={16} /> {connectionState === "Scanning" ? "Scanning" : "Scan"}
        </button>
        <div className="section-label"><Radio size={13} /> Devices</div>
        <div className="device-list">
          {devices.length ? devices.map((device) => <ScannerDevice key={device.id} device={device} />) : <div className="empty">No scan results yet.</div>}
        </div>
      </div>
      <div className="sidebar-section grow">
        <div className="section-label"><Database size={13} /> Profiles</div>
        <div className="profile-list">
          {profiles.map((profile) => (
            <button key={profile.id} className={`profile-row ${profile.id === activeProfileId ? "active" : ""}`} onClick={() => setActiveProfile(profile.id)}>
              <span className="color-dot" style={{ background: profile.colorTag }} />
              <span>{profile.nickname}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sidebar-section compact">
        <div className="section-label violet"><Bot size={13} /> Routines</div>
        <div className="routine-count">{routines.length} saved · scheduler-ready</div>
      </div>
    </aside>
  );
}

function XTerminalPane() {
  const container = useRef<HTMLDivElement | null>(null);
  const terminal = useRef<Terminal | null>(null);
  const events = useBleTermStore((state) => state.sessionEvents);
  const fontSize = useBleTermStore((state) => state.terminalFontSize);
  const timestamps = useBleTermStore((state) => state.timestamps);
  const hexView = useBleTermStore((state) => state.hexView);
  const scanline = useBleTermStore((state) => state.scanline);
  const rendered = useRef(0);

  useEffect(() => {
    if (!container.current) return;
    terminal.current = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "JetBrains Mono, Cascadia Code, Consolas, monospace",
      fontSize,
      theme: { background: "#0B0D10", foreground: "#E8ECF0", cursor: "#00D4FF" }
    });
    terminal.current.open(container.current);
    return () => terminal.current?.dispose();
  }, []);

  useEffect(() => {
    if (!terminal.current) return;
    terminal.current.options.fontSize = fontSize;
  }, [fontSize]);

  useEffect(() => {
    if (!terminal.current) return;
    if (rendered.current > events.length) {
      terminal.current.clear();
      rendered.current = 0;
    }
    events.slice(rendered.current).forEach((event) => terminal.current?.writeln(formatEvent(event, timestamps, hexView)));
    rendered.current = events.length;
  }, [events, timestamps, hexView]);

  return <div className={`terminal-shell ${scanline ? "scanline" : ""}`} ref={container} />;
}

function CommandInput() {
  const [value, setValue] = useState("");
  const [cursor, setCursor] = useState(-1);
  const sendCommand = useBleTermStore((state) => state.sendCommand);
  const history = useBleTermStore((state) => state.commandHistory);
  const activeProfile = useActiveProfile();
  const send = async () => {
    const command = value;
    setValue("");
    setCursor(-1);
    await sendCommand(command);
  };
  return (
    <div className="command-zone">
      <div className="quick-send">
        {activeProfile.quickSend.slice(0, 16).map((button) => (
          <button key={button.label} title={button.command} onClick={() => void sendCommand(button.command)}>
            {button.label}
          </button>
        ))}
      </div>
      <div className="command-line">
        <input
          aria-label="AT command input"
          value={value}
          placeholder="Type AT command..."
          onChange={(event) => { setValue(event.target.value); setCursor(-1); }}
          onKeyDown={(event) => {
            if (event.key === "Enter") { void send(); return; }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              const next = Math.min(cursor + 1, history.length - 1);
              setCursor(next);
              if (history[next] !== undefined) setValue(history[next]);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              const next = Math.max(cursor - 1, -1);
              setCursor(next);
              setValue(next >= 0 ? history[next] : "");
            }
          }}
        />
        <button className="send-button" onClick={() => void send()}><Send size={16} /> Send</button>
      </div>
    </div>
  );
}

function useActiveProfile() {
  const profiles = useBleTermStore((state) => state.profiles);
  const activeProfileId = useBleTermStore((state) => state.activeProfileId);
  return profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
}

function StatusStrip() {
  const state = useBleTermStore((store) => store.connectionState);
  const device = useBleTermStore((store) => store.activeDevice);
  const profile = useActiveProfile();
  return (
    <footer className="status-strip">
      <span className={`pulse-dot ${state === "Connected" ? "connected" : ""}`} />
      <strong>BLE:</strong> {state}
      <span>Device: {device?.name ?? "none"}</span>
      <span>{profile.gattProfile}</span>
      <span>RSSI {device?.rssi ?? "--"} dBm</span>
      <span>Timeout {profile.responseTimeoutMs} ms</span>
    </footer>
  );
}

function TerminalToolbar() {
  const clearTerminal = useBleTermStore((state) => state.clearTerminal);
  const events = useBleTermStore((state) => state.sessionEvents);
  const timestamps = useBleTermStore((state) => state.timestamps);
  const hexView = useBleTermStore((state) => state.hexView);
  const scanline = useBleTermStore((state) => state.scanline);
  const toggleTimestamps = useBleTermStore((state) => state.toggleTimestamps);
  const toggleHexView = useBleTermStore((state) => state.toggleHexView);
  const toggleScanline = useBleTermStore((state) => state.toggleScanline);
  const fontSize = useBleTermStore((state) => state.terminalFontSize);
  const setTerminalFontSize = useBleTermStore((state) => state.setTerminalFontSize);
  const exportLog = async (format: "txt" | "json" | "csv" | "md") => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const content = serializeEvents(events, format);
    await window.bleterm?.file.export(`bleterm-session-${stamp}.${format}`, content);
  };
  return (
    <div className="terminal-toolbar">
      <button onClick={() => navigator.clipboard.writeText(events.map((event) => event.data).join(""))}><Copy size={15} /> Copy</button>
      <button onClick={() => clearTerminal()}><Trash2 size={15} /> Clear</button>
      <button onClick={() => void exportLog("txt")}><Download size={15} /> TXT</button>
      <button onClick={() => void exportLog("json")}><Download size={15} /> JSON</button>
      <button onClick={() => void window.bleterm?.logs.openFolder()}><FolderOpen size={15} /> Logs</button>
      <label className="toggle"><input type="checkbox" checked={timestamps} onChange={toggleTimestamps} /> Time</label>
      <label className="toggle"><input type="checkbox" checked={hexView} onChange={toggleHexView} /> Hex</label>
      <label className="toggle"><input type="checkbox" checked={scanline} onChange={toggleScanline} /> Scanline</label>
      <label className="font-slider">Font <input type="range" min="12" max="22" value={fontSize} onChange={(event) => setTerminalFontSize(Number(event.target.value))} /></label>
    </div>
  );
}

function serializeEvents(events: SessionEvent[], format: "txt" | "json" | "csv" | "md") {
  if (format === "json") return JSON.stringify(events, null, 2);
  if (format === "csv") return ["timestamp,type,source,data", ...events.map((event) => [event.ts, event.type, event.source ?? "", JSON.stringify(event.data)].join(","))].join("\n");
  if (format === "md") return `# BLETerm Session\n\n${events.map((event) => `- **${event.type}** ${event.ts}: \`${event.data.replace(/\r?\n/g, "\\n")}\``).join("\n")}\n`;
  return events.map((event) => `${event.ts} ${event.type.toUpperCase()} ${event.data}`).join("");
}

function PresetsPanel({ packs }: { packs: PresetPack[] }) {
  const search = useBleTermStore((state) => state.search);
  const setSearch = useBleTermStore((state) => state.setSearch);
  const sendCommand = useBleTermStore((state) => state.sendCommand);
  const activeProfile = useActiveProfile();
  const activePackIds = new Set([activeProfile.defaultPresetPack, "hayes"]);
  const presets = packs
    .filter((pack) => activePackIds.has(pack.id))
    .flatMap((pack) => pack.presets.map((preset) => ({ ...preset, pack: pack.name })))
    .filter((preset) => `${preset.name} ${preset.command} ${preset.description}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="panel-body">
      <div className="search-box"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search presets" /></div>
      <div className="preset-list">
        {presets.map((preset: Preset & { pack: string }) => (
          <button key={`${preset.pack}-${preset.id}`} className="preset-card" onDoubleClick={() => void sendCommand(materializePreset(preset))}>
            <span className="preset-top"><strong>{preset.name}</strong><code>{preset.command}</code></span>
            <span>{preset.description || preset.pack}</span>
            <small>{preset.category} · {preset.pack}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function materializePreset(preset: Preset) {
  let command = preset.command;
  for (const placeholder of preset.placeholders ?? []) {
    command = command.replace(`{${placeholder.label}}`, placeholder.default || placeholder.key);
    command = command.replace(`{${placeholder.key}}`, placeholder.default || placeholder.key);
  }
  return command;
}

function RoutinesPanel() {
  const routines = useBleTermStore((state) => state.routines);
  const runRoutine = useBleTermStore((state) => state.runRoutine);
  return (
    <div className="panel-body">
      {routines.map((routine) => (
        <div key={routine.id} className="routine-card">
          <div>
            <strong>{routine.name}</strong>
            <span>{routine.description}</span>
          </div>
          <button onClick={() => void runRoutine(routine)}><ChevronRight size={15} /> Run</button>
          <div className="steps">
            {routine.steps.map((step) => <span key={step.id}>{step.type}: {step.label ?? step.command}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function WatchersPanel() {
  const watchers = useBleTermStore((state) => state.watchers);
  return (
    <div className="panel-body">
      {watchers.map((watcher) => (
        <div key={watcher.id} className="watcher-row">
          <span className={watcher.enabled ? "enabled-light" : "disabled-light"} />
          <div><strong>{watcher.label}</strong><span>/{watcher.pattern}/ · {watcher.action}</span></div>
        </div>
      ))}
    </div>
  );
}

function ProfilePanel() {
  const profile = useActiveProfile();
  const updateProfile = useBleTermStore((state) => state.updateProfile);
  const patch = (change: Partial<DeviceProfile>) => updateProfile({ ...profile, ...change });
  const patchAuth = (change: Partial<DeviceProfile["auth"]>) => patch({ auth: { ...profile.auth, ...change } });
  return (
    <div className="panel-body form-panel">
      <label>Nickname<input value={profile.nickname} onChange={(event) => patch({ nickname: event.target.value })} /></label>
      <label>Name pattern<input value={profile.bleNamePattern} onChange={(event) => patch({ bleNamePattern: event.target.value })} /></label>
      <label>GATT<select value={profile.gattProfile} onChange={(event) => patch({ gattProfile: event.target.value as DeviceProfile["gattProfile"] })}><option>NUS</option><option>HM10</option><option>Custom</option></select></label>
      <label>Line terminator<select value={profile.lineTerminator} onChange={(event) => patch({ lineTerminator: event.target.value as DeviceProfile["lineTerminator"] })}><option>CRLF</option><option>CR</option><option>LF</option><option>none</option></select></label>
      <label>Case mode<select value={profile.caseMode} onChange={(event) => patch({ caseMode: event.target.value as DeviceProfile["caseMode"] })}><option value="uppercase">auto-uppercase</option><option value="preserve">preserve</option><option value="lowercase">auto-lowercase</option></select></label>
      <label>Timeout ms<input type="number" min="100" max="10000" value={profile.responseTimeoutMs} onChange={(event) => patch({ responseTimeoutMs: Number(event.target.value) })} /></label>
      <label>Auth type
        <select value={profile.auth.type} onChange={(event) => patchAuth({ type: event.target.value as DeviceProfile["auth"]["type"] })}>
          <option value="none">none</option>
          <option value="pin">PIN</option>
          <option value="custom">custom</option>
        </select>
      </label>
      {profile.auth.type !== "none" && (
        <label>Auth PIN
          <input
            type="password"
            value={profile.auth.credential ?? ""}
            placeholder="e.g. 123456"
            onChange={(event) => patchAuth({ credential: event.target.value })}
          />
        </label>
      )}
      <label>Notes<textarea value={profile.notes} onChange={(event) => patch({ notes: event.target.value })} /></label>
      <button onClick={() => void window.bleterm?.file.export(`${profile.nickname}.atprofile`, JSON.stringify({ version: "1.1", ...profile }, null, 2))}><Download size={15} /> Export profile</button>
    </div>
  );
}

function RightPanel() {
  const tab = useBleTermStore((state) => state.rightTab);
  const setTab = useBleTermStore((state) => state.setRightTab);
  const packs = useBleTermStore((state) => state.presetPacks);
  const importPack = useBleTermStore((state) => state.importPack);
  const importProfiles = useBleTermStore((state) => state.importProfiles);
  const importFile = async () => {
    const raw = await window.bleterm?.file.import(["atpack", "atprofile", "json"]);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.presets) importPack(parsed);
    else importProfiles(Array.isArray(parsed) ? parsed : [parsed]);
  };
  return (
    <aside className="right-panel">
      <div className="panel-tabs">
        <button className={tab === "presets" ? "active" : ""} onClick={() => setTab("presets")}><Clipboard size={15} /> Presets</button>
        <button className={tab === "routines" ? "active" : ""} onClick={() => setTab("routines")}><Bot size={15} /> Routines</button>
        <button className={tab === "watchers" ? "active" : ""} onClick={() => setTab("watchers")}><ShieldCheck size={15} /> Watchers</button>
        <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><Settings size={15} /> Profile</button>
      </div>
      <div className="panel-actions"><button onClick={() => void importFile()}><Upload size={15} /> Import</button></div>
      {tab === "presets" && <PresetsPanel packs={packs} />}
      {tab === "routines" && <RoutinesPanel />}
      {tab === "watchers" && <WatchersPanel />}
      {tab === "profile" && <ProfilePanel />}
    </aside>
  );
}

function TopBar() {
  const disconnect = useBleTermStore((state) => state.disconnect);
  const connectionState = useBleTermStore((state) => state.connectionState);
  const activeDevice = useBleTermStore((state) => state.activeDevice);
  return (
    <header className="topbar">
      <div className="brand"><Bluetooth size={20} /> <span>BLETerm</span></div>
      <div className="session-tabs">
        <button className="session-tab active"><Activity size={14} /> {activeDevice?.name ?? "No device"} <span>{connectionState}</span></button>
        <button className="session-tab"><Sparkles size={14} /> +</button>
      </div>
      <button className="disconnect" onClick={disconnect}><PlugZap size={15} /> Disconnect</button>
    </header>
  );
}

export function App() {
  const init = useBleTermStore((state) => state.init);
  const ready = useBleTermStore((state) => state.ready);
  useEffect(() => void init(), [init]);
  const activeProfile = useActiveProfile();
  const packs = useBleTermStore((state) => state.presetPacks);
  const activePack = useMemo(() => packs.find((pack) => pack.id === activeProfile.defaultPresetPack), [packs, activeProfile.defaultPresetPack]);

  if (!ready) return <div className="boot">Starting BLETerm...</div>;

  return (
    <div className="app-shell">
      <TopBar />
      <main className="workspace">
        <Sidebar />
        <section className="terminal-column">
          <div className="device-status">
            <span className="color-dot" style={{ background: activeProfile.colorTag }} />
            <strong>{activeProfile.nickname}</strong>
            <span>{activeProfile.gattProfile}</span>
            <span>{activePack?.name ?? "No preset pack"}</span>
            <span><Signal size={15} /> UART-over-BLE</span>
          </div>
          <TerminalToolbar />
          <XTerminalPane />
          <CommandInput />
        </section>
        <RightPanel />
      </main>
      <StatusStrip />
    </div>
  );
}
