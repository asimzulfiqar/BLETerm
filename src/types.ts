export type GattProfile = "NUS" | "HM10" | "Custom";
export type LineTerminator = "CR" | "LF" | "CRLF" | "none";
export type CaseMode = "uppercase" | "preserve" | "lowercase";
export type ConnectionState = "Idle" | "Scanning" | "Connecting" | "Authenticating" | "Connected" | "Disconnected";

export interface DeviceProfile {
  id: string;
  nickname: string;
  bleNamePattern: string;
  bleAddress?: string;
  gattProfile: GattProfile;
  customGatt?: { serviceUuid: string; txUuid: string; rxUuid: string } | null;
  lineTerminator: LineTerminator;
  caseMode: CaseMode;
  mtu: "auto" | number;
  responseTimeoutMs: number;
  auth: { type: "none" | "pin" | "custom"; credential?: string; successPattern?: string; handshake?: string[] };
  defaultPresetPack?: string;
  colorTag: string;
  notes: string;
  quickSend: Array<{ label: string; command: string }>;
  favorite?: boolean;
  history?: Array<{ startedAt: string; durationSeconds: number }>;
}

export interface BleDevice {
  id: string;
  name: string;
  address: string;
  rssi: number;
  services: string[];
  lastSeen: string;
  detectedProfile: GattProfile;
  knownProfileId?: string;
  favorite?: boolean;
}

export interface PresetPack {
  version: string;
  id: string;
  name: string;
  vendor: string;
  description: string;
  presets: Preset[];
}

export interface Preset {
  id: string;
  category: string;
  name: string;
  command: string;
  description: string;
  expectedResponse?: string;
  placeholders?: Array<{ key: string; label: string; default: string; validate: string }>;
}

export type RoutineStepType = "send" | "wait" | "waitResponse" | "assert" | "branch" | "setVariable" | "loop" | "log" | "notify" | "webhook";

export interface RoutineStep {
  id: string;
  type: RoutineStepType;
  label?: string;
  command?: string;
  timeoutMs?: number;
  delayMs?: number;
  condition?: string;
  variableName?: string;
  captureRegex?: string;
  message?: string;
  url?: string;
  body?: string;
}

export interface Routine {
  version: string;
  id: string;
  name: string;
  description: string;
  deviceProfileId?: string;
  schedule: { type: "manual" | "interval" | "daily" | "cron" | "onConnect" | "onDisconnect" | "watch"; intervalSeconds?: number; value?: string };
  variables: Record<string, string>;
  steps: RoutineStep[];
}

export interface Watcher {
  id: string;
  label: string;
  pattern: string;
  action: "notification" | "log" | "routine" | "webhook";
  enabled: boolean;
}

export interface SessionEvent {
  ts: string;
  type: "tx" | "rx" | "system" | "error" | "automation";
  data: string;
  source?: string;
}

declare global {
  interface Window {
    bleterm?: {
      store: { get<T>(key: string, fallback: T): Promise<T>; set<T>(key: string, value: T): Promise<boolean> };
      logs: { append(deviceName: string, entry: SessionEvent): Promise<string>; openFolder(): Promise<string> };
      file: { export(suggestedName: string, content: string): Promise<string | null>; import(extensions: string[]): Promise<string | null> };
      notify(title: string, body: string): Promise<boolean>;
    };
  }
}
