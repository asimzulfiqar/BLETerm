import type { BleDevice, DeviceProfile, GattProfile } from "../types";

const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
const HM10_SERVICE = "0000ffe0-0000-1000-8000-00805f9b34fb";
const HM10_CHAR = "0000ffe1-0000-1000-8000-00805f9b34fb";

type BluetoothRemoteGATTCharacteristicWithWrite = BluetoothRemoteGATTCharacteristic & {
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
};

interface WebBluetoothSession {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  tx: BluetoothRemoteGATTCharacteristicWithWrite;
  rx: BluetoothRemoteGATTCharacteristic;
  profile: GattProfile;
}

const selectedDevices = new Map<string, BluetoothDevice>();
let session: WebBluetoothSession | undefined;
let receiveHandler: ((data: string) => void) | undefined;
let disconnectHandler: (() => void) | undefined;

function bluetooth(): Bluetooth | undefined {
  return navigator.bluetooth;
}

function normalizeUuid(uuid: string) {
  return uuid.toLowerCase();
}

function customServices(profiles: DeviceProfile[]) {
  return profiles
    .filter((profile) => profile.gattProfile === "Custom" && profile.customGatt?.serviceUuid)
    .map((profile) => normalizeUuid(profile.customGatt!.serviceUuid));
}

function detectProfile(device: BluetoothDevice): GattProfile {
  const uuids = (device.uuids ?? []).map(normalizeUuid);
  if (uuids.includes(HM10_SERVICE)) return "HM10";
  if (uuids.includes(NUS_SERVICE)) return "NUS";
  return "Custom";
}

function servicesFor(profile: DeviceProfile) {
  if (profile.gattProfile === "HM10") {
    return { service: HM10_SERVICE, tx: HM10_CHAR, rx: HM10_CHAR, profile: "HM10" as const };
  }
  if (profile.gattProfile === "Custom" && profile.customGatt) {
    return {
      service: normalizeUuid(profile.customGatt.serviceUuid),
      tx: normalizeUuid(profile.customGatt.txUuid),
      rx: normalizeUuid(profile.customGatt.rxUuid),
      profile: "Custom" as const
    };
  }
  return { service: NUS_SERVICE, tx: NUS_TX, rx: NUS_RX, profile: "NUS" as const };
}

function toBleDevice(device: BluetoothDevice, profileId?: string): BleDevice {
  const detectedProfile = detectProfile(device);
  return {
    id: device.id,
    name: device.name || `BLE device ${device.id.slice(0, 8)}`,
    address: device.id,
    rssi: -60,
    services: (device.uuids ?? []).map((uuid) => uuid.toUpperCase()),
    lastSeen: new Date().toISOString(),
    detectedProfile,
    transport: "webBluetooth",
    knownProfileId: profileId
  };
}

export const webBluetoothTransport = {
  isSupported() {
    return Boolean(bluetooth());
  },

  async requestDevice(profiles: DeviceProfile[]): Promise<BleDevice> {
    if (!bluetooth()) throw new Error("Web Bluetooth is not available in this Electron runtime.");

    const optionalServices = Array.from(new Set([NUS_SERVICE, HM10_SERVICE, ...customServices(profiles)]));
    const device = await bluetooth()!.requestDevice({
      acceptAllDevices: true,
      optionalServices
    });

    selectedDevices.set(device.id, device);
    const profile = profiles.find((item) => {
      if (item.bleAddress && item.bleAddress === device.id) return true;
      return new RegExp(item.bleNamePattern || ".*", "i").test(device.name || "");
    });

    return toBleDevice(device, profile?.id);
  },

  setReceiveHandler(handler: (data: string) => void) {
    receiveHandler = handler;
  },

  setDisconnectHandler(handler: () => void) {
    disconnectHandler = handler;
  },

  async connect(deviceId: string, profile: DeviceProfile) {
    const device = selectedDevices.get(deviceId);
    if (!device) throw new Error("Select this BLE device again before connecting.");
    if (!device.gatt) throw new Error("Selected device does not expose a GATT server.");

    const gatt = servicesFor(profile);
    const server = await device.gatt.connect();

    let service: BluetoothRemoteGATTService;
    try {
      service = await server.getPrimaryService(gatt.service);
    } catch (err) {
      server.disconnect();
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("No Services matching UUID") || msg.includes("GATT Error")) {
        throw new Error(
          `"${device.name || "Device"}" does not expose the ${gatt.profile} UART service.\n` +
          `To use this phone/device as a BLE UART terminal:\n` +
          `  Android: install nRF Connect → Advertiser tab → add NUS service UUID\n` +
          `           6e400001-b5a3-f393-e0a9-e50e24dcca9e → Start advertising.\n` +
          `  iOS: install LightBlue → Virtual Devices → add the same UUID.\n` +
          `If this is your Dragino sensor, make sure BLE is enabled and the device is powered.`
        );
      }
      throw err;
    }

    const tx = (await service.getCharacteristic(gatt.tx)) as BluetoothRemoteGATTCharacteristicWithWrite;
    const rx = await service.getCharacteristic(gatt.rx);

    const onCharacteristicValueChanged = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (!target.value) return;
      receiveHandler?.(new TextDecoder().decode(target.value));
    };

    await rx.startNotifications();
    rx.addEventListener("characteristicvaluechanged", onCharacteristicValueChanged);
    device.addEventListener("gattserverdisconnected", () => disconnectHandler?.(), { once: true });

    session = { device, server, tx, rx, profile: gatt.profile };
    return { profile: gatt.profile };
  },

  async write(data: string, chunkSize = 20) {
    if (!session) throw new Error("No Web Bluetooth session is connected.");
    const bytes = new TextEncoder().encode(data);
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.slice(offset, offset + chunkSize);
      if (session.tx.writeValueWithoutResponse) await session.tx.writeValueWithoutResponse(chunk);
      else await session.tx.writeValue(chunk);
    }
  },

  disconnect() {
    if (session?.server.connected) session.server.disconnect();
    session = undefined;
  }
};
