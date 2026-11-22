"use strict";

const { contextBridge, ipcRenderer } = require("electron");

// Deliberately narrow API surface. The renderer never receives Node/Electron.
contextBridge.exposeInMainWorld("appDeck", {
  scan: () => ipcRenderer.invoke("registry:scan"),
  launch: (programId) => ipcRenderer.invoke("app:launch", programId),
  reveal: (installLocation) => ipcRenderer.invoke("app:reveal", installLocation),
  webSearch: (query) => ipcRenderer.invoke("app:web-search", query),
  openExternal: (url) => ipcRenderer.invoke("app:open-external", url),

  // The renderer confirms first (UninstallDialog). Main re-reads UninstallString from
  // the registry and starts it through child_process.spawn.
  uninstall: (programId) => ipcRenderer.invoke("app:uninstall", programId),

  // TODO: в Electron-версии вместо статического списка — запрос к API поиска
  // или локальной базе соответствий. Renderer пока использует статический каталог.
  findAlternatives: (programName) => ipcRenderer.invoke("app:find-alternatives", programName),

  // User edits are stored by main in userData/overrides.json and survive rescans and restarts.
  updateDescription: (programId, text) => ipcRenderer.invoke("app:update-description", programId, text),
  // Main opens the file dialog and copies the picked image into userData/screenshots.
  chooseScreenshot: (programId) => ipcRenderer.invoke("app:choose-screenshot", programId),
  removeScreenshot: (programId) => ipcRenderer.invoke("app:remove-screenshot", programId),

  // Main pushes a fresh list when an uninstalled program disappears from the registry.
  // Returns an unsubscribe function. The IPC event object is never passed to the page.
  onRegistryUpdated: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, programs) => callback(programs);
    ipcRenderer.on("registry:updated", listener);
    return () => ipcRenderer.removeListener("registry:updated", listener);
  },

  platform: process.platform,
});

// Lets CSS reserve space for the native window-controls overlay on Windows.
window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("is-electron");
});
