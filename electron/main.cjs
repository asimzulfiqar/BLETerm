const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require("electron");
const path = require("path");
const fs = require("fs");
const log = require("electron-log");

let store;

log.transports.file.level = "info";

async function initStore() {
  const { default: Store } = await import("electron-store");
  store = new Store({
    name: "bleterm",
    encryptionKey: "bleterm-local-profile-store-v1"
  });
}

function logsRoot() {
  return path.join(app.getPath("userData"), "logs");
}

function attachWindowDiagnostics(win) {
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    log.error(`Renderer failed to load ${validatedUrl}: ${errorCode} ${errorDescription}`);
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    log.error(`Renderer process gone: ${details.reason} exitCode=${details.exitCode}`);
  });

  win.webContents.on("unresponsive", () => {
    log.warn("Renderer became unresponsive.");
  });

  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) log.warn(`Renderer console: ${message} (${sourceId}:${line})`);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1120,
    minHeight: 720,
    title: "BLETerm",
    backgroundColor: "#0D0F12",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  });
  attachWindowDiagnostics(win);

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  await initStore();
  fs.mkdirSync(logsRoot(), { recursive: true });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (error) => {
  log.error("Uncaught main-process exception", error);
});

process.on("unhandledRejection", (reason) => {
  log.error("Unhandled main-process rejection", reason);
});

ipcMain.handle("store:get", (_event, key, fallback) => store?.get(key, fallback) ?? fallback);
ipcMain.handle("store:set", (_event, key, value) => {
  store?.set(key, value);
  return true;
});

ipcMain.handle("logs:append", (_event, deviceName, entry) => {
  const safeName = String(deviceName || "unknown-device").replace(/[<>:"/\\|?*]+/g, "_");
  const dir = path.join(logsRoot(), safeName);
  fs.mkdirSync(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(dir, `${day}.jsonl`);
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
  return file;
});

ipcMain.handle("logs:openFolder", async () => {
  fs.mkdirSync(logsRoot(), { recursive: true });
  await shell.openPath(logsRoot());
  return logsRoot();
});

ipcMain.handle("file:export", async (_event, suggestedName, content) => {
  const result = await dialog.showSaveDialog({
    defaultPath: suggestedName,
    filters: [
      { name: "BLETerm files", extensions: ["txt", "json", "jsonl", "md", "csv", "atprofile", "atpack", "atroutine"] },
      { name: "All files", extensions: ["*"] }
    ]
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, content, "utf8");
  return result.filePath;
});

ipcMain.handle("file:import", async (_event, extensions) => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Import files", extensions }]
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return fs.readFileSync(result.filePaths[0], "utf8");
});

ipcMain.handle("notify", (_event, title, body) => {
  if (Notification.isSupported()) new Notification({ title, body }).show();
  log.info(`[notification] ${title}: ${body}`);
  return true;
});
