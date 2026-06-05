const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bleterm", {
  store: {
    get: (key, fallback) => ipcRenderer.invoke("store:get", key, fallback),
    set: (key, value) => ipcRenderer.invoke("store:set", key, value)
  },
  logs: {
    append: (deviceName, entry) => ipcRenderer.invoke("logs:append", deviceName, entry),
    openFolder: () => ipcRenderer.invoke("logs:openFolder")
  },
  file: {
    export: (suggestedName, content) => ipcRenderer.invoke("file:export", suggestedName, content),
    import: (extensions) => ipcRenderer.invoke("file:import", extensions)
  },
  notify: (title, body) => ipcRenderer.invoke("notify", title, body)
});
